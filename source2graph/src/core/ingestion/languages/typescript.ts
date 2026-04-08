import Parser from 'tree-sitter'
import { NodeLabel, RelationshipType } from '../../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId } from '../../../shared/utils.js'
import type { LanguageProvider, ParseContext } from '../language-provider.js'
import {
  TS_CLASS_QUERY,
  TS_INTERFACE_QUERY,
  TS_METHOD_QUERY,
  TS_FIELD_QUERY,
  TS_FUNCTION_QUERY,
  TS_IMPORT_QUERY,
  TS_EXTENDS_QUERY,
  TS_IMPLEMENTS_QUERY,
  TS_INTERFACE_EXTENDS_QUERY,
  TS_CALL_QUERY,
} from '../tree-sitter-queries.js'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { typescript, tsx } = require('tree-sitter-typescript') as { typescript: any; tsx: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLanguage(isTsx: boolean): any {
  return isTsx ? tsx : typescript
}

function makeQuery(isTsx: boolean, queryStr: string, node: Parser.SyntaxNode): Parser.QueryMatch[] {
  return new Parser.Query(getLanguage(isTsx), queryStr).matches(node)
}

/** パッケージ名を取り出す（スコープ付き: @scope/name、サブパス: name/sub → name） */
function getPackageName(importPath: string): string {
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath
  }
  return importPath.split('/')[0]
}

/**
 * インポートパスを解決してリポジトリ内の既知ファイルパスを返す。
 * - 相対パス（'.'/'/' 始まり）: パス計算でマッチ試行
 * - ベアスペシファイア: パスエイリアス候補としてサフィックスマッチを試行
 * いずれも解決できない場合は undefined を返す（外部パッケージ判定は呼び出し元が行う）。
 */
function resolveImportPath(importSource: string, fromFile: string, allFiles: Set<string>): string | undefined {
  // Strip quotes
  const raw = importSource.replace(/^['"]|['"]$/g, '')
  const isRelative = raw.startsWith('.') || raw.startsWith('/')

  if (isRelative) {
    const dir = dirname(fromFile)
    // TS projects use `.js` extensions in imports but files are `.ts`
    const rawWithoutJsExt = raw.replace(/\.js$/, '')
    const candidateBases = [
      rawWithoutJsExt,
      rawWithoutJsExt + '.ts',
      rawWithoutJsExt + '.tsx',
      rawWithoutJsExt + '.js',
      raw,
      raw + '.ts',
      rawWithoutJsExt + '/index.ts',
      rawWithoutJsExt + '/index.tsx',
      rawWithoutJsExt + '/index.js',
    ]

    for (const candidate of candidateBases) {
      const resolved = resolve(dir, candidate)
      for (const known of allFiles) {
        if (known.endsWith(resolved.replace(/\\/g, '/')) || resolved.endsWith(known)) {
          return known
        }
      }
    }

    // Suffix fallback for relative paths
    const withoutLeadingDots = raw.replace(/^\.\//, '').replace(/^\.\.\//, '')
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      for (const known of allFiles) {
        if (known.endsWith(withoutLeadingDots + ext)) return known
      }
    }
  } else {
    // Bare specifier — could be a tsconfig path alias pointing to a local file.
    // Strip common alias prefixes (@/, ~/) and try suffix matching against known files.
    const stripped = raw.replace(/^@\//, '').replace(/^~\//, '')
    const candidates = stripped === raw ? [raw] : [raw, stripped]

    for (const candidate of candidates) {
      // Exact match (e.g. alias resolves to a file without extension)
      for (const known of allFiles) {
        if (known === candidate || known.endsWith(`/${candidate}`)) return known
      }
      // Try appending TS/JS extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        for (const known of allFiles) {
          if (known.endsWith(`/${candidate}${ext}`) || known === `${candidate}${ext}`) return known
        }
      }
      // index files
      for (const ext of ['/index.ts', '/index.tsx', '/index.js']) {
        for (const known of allFiles) {
          if (known.endsWith(`/${candidate}${ext}`) || known === `${candidate}${ext}`) return known
        }
      }
    }
  }

  return undefined
}

function buildTsProvider(isTsx: boolean): LanguageProvider {
  const langName = isTsx ? 'typescriptreact' : 'typescript'
  const extensions = isTsx ? ['.tsx'] : ['.ts']

  return {
    language: langName,
    extensions,

    extractSymbols(ctx: ParseContext): void {
      const { filePath, tree, graph, symbolTable } = ctx
      const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

      // ---- Classes ----
      for (const match of makeQuery(isTsx, TS_CLASS_QUERY, tree.rootNode)) {
        const classNode = match.captures.find((c) => c.name === 'class')?.node
        const nameNode = match.captures.find((c) => c.name === 'name')?.node
        if (!classNode || !nameNode) continue

        const name = nameNode.text
        const nodeId = generateNodeId(NodeLabel.Class, filePath, name)

        graph.addNode({
          label: NodeLabel.Class,
          properties: {
            nodeId,
            name,
            qualifiedName: name,
            filePath,
            startLine: classNode.startPosition.row + 1,
            endLine: classNode.endPosition.row + 1,
            visibility: 'public',
            isAbstract: classNode.text.includes('abstract '),
            isStatic: false,
            language: langName,
          },
        })

        symbolTable.define({
          nodeId,
          name,
          qualifiedName: name,
          label: NodeLabel.Class,
          filePath,
          startLine: classNode.startPosition.row + 1,
          endLine: classNode.endPosition.row + 1,
        })

        graph.addRelationship({
          type: RelationshipType.CONTAINS,
          startNodeId: fileNodeId,
          endNodeId: nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
        })

        // Methods inside class
        for (const mm of makeQuery(isTsx, TS_METHOD_QUERY, classNode)) {
          const methodNode = mm.captures.find((c) => c.name === 'method')?.node
          const mName = mm.captures.find((c) => c.name === 'name')?.node
          const mParams = mm.captures.find((c) => c.name === 'params')?.node
          if (!methodNode || !mName) continue

          // Skip constructor for separate treatment if needed
          const paramCount = mParams ? mParams.namedChildren.length : 0
          const mQualified = `${name}.${mName.text}`
          const mNodeId = `Method:${filePath}:${mQualified}#${paramCount}`
          const isAsync = methodNode.text.trimStart().startsWith('async ')

          graph.addNode({
            label: NodeLabel.Method,
            properties: {
              nodeId: mNodeId,
              name: mName.text,
              qualifiedName: mQualified,
              filePath,
              startLine: methodNode.startPosition.row + 1,
              endLine: methodNode.endPosition.row + 1,
              visibility: 'public',
              isStatic: methodNode.text.includes('static '),
              isAsync,
              returnType: '',
              paramCount,
              language: langName,
            },
          })

          symbolTable.define({
            nodeId: mNodeId,
            name: mName.text,
            qualifiedName: mQualified,
            label: NodeLabel.Method,
            filePath,
            startLine: methodNode.startPosition.row + 1,
            endLine: methodNode.endPosition.row + 1,
          })

          graph.addRelationship({
            type: RelationshipType.HAS_METHOD,
            startNodeId: nodeId,
            endNodeId: mNodeId,
            properties: { relId: generateRelationshipId(RelationshipType.HAS_METHOD, nodeId, mNodeId) },
          })
        }

        // Fields inside class
        for (const fm of makeQuery(isTsx, TS_FIELD_QUERY, classNode)) {
          const fieldNode = fm.captures.find((c) => c.name === 'field')?.node
          const fName = fm.captures.find((c) => c.name === 'name')?.node
          const fType = fm.captures.find((c) => c.name === 'fieldType')?.node
          if (!fieldNode || !fName) continue

          const fNodeId = generateNodeId(NodeLabel.Field, filePath, `${name}.${fName.text}`)

          graph.addNode({
            label: NodeLabel.Field,
            properties: {
              nodeId: fNodeId,
              name: fName.text,
              filePath,
              startLine: fieldNode.startPosition.row + 1,
              visibility: 'public',
              isStatic: false,
              fieldType: fType?.text ?? '',
              language: langName,
            },
          })

          graph.addRelationship({
            type: RelationshipType.HAS_PROPERTY,
            startNodeId: nodeId,
            endNodeId: fNodeId,
            properties: { relId: generateRelationshipId(RelationshipType.HAS_PROPERTY, nodeId, fNodeId) },
          })
        }
      }

      // ---- Interfaces ----
      for (const match of makeQuery(isTsx, TS_INTERFACE_QUERY, tree.rootNode)) {
        const ifaceNode = match.captures.find((c) => c.name === 'interface')?.node
        const nameNode = match.captures.find((c) => c.name === 'name')?.node
        if (!ifaceNode || !nameNode) continue

        const name = nameNode.text
        const nodeId = generateNodeId(NodeLabel.Interface, filePath, name)

        graph.addNode({
          label: NodeLabel.Interface,
          properties: {
            nodeId,
            name,
            qualifiedName: name,
            filePath,
            startLine: ifaceNode.startPosition.row + 1,
            endLine: ifaceNode.endPosition.row + 1,
            visibility: 'public',
            language: langName,
          },
        })

        symbolTable.define({
          nodeId,
          name,
          qualifiedName: name,
          label: NodeLabel.Interface,
          filePath,
          startLine: ifaceNode.startPosition.row + 1,
          endLine: ifaceNode.endPosition.row + 1,
        })

        graph.addRelationship({
          type: RelationshipType.CONTAINS,
          startNodeId: fileNodeId,
          endNodeId: nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
        })
      }

      // ---- Top-level Functions ----
      for (const match of makeQuery(isTsx, TS_FUNCTION_QUERY, tree.rootNode)) {
        const fnNode = match.captures.find((c) => c.name === 'function')?.node
          ?? match.captures.find((c) => c.name === 'arrowFn')?.node
        const nameNode = match.captures.find((c) => c.name === 'name')?.node
        const paramsNode = match.captures.find((c) => c.name === 'params')?.node
        if (!fnNode || !nameNode) continue

        const name = nameNode.text
        const nodeId = generateNodeId(NodeLabel.Function, filePath, name)
        const isExported = match.captures.some((c) => ['exportedArrowDecl'].includes(c.name))
          || match.captures.some((c) => c.name === 'function' && c.node.parent?.type === 'export_statement')
        const isAsync = fnNode.text.trimStart().startsWith('async ')
        const paramCount = paramsNode ? paramsNode.namedChildren.length : 0

        graph.addNode({
          label: NodeLabel.Function,
          properties: {
            nodeId,
            name,
            filePath,
            startLine: fnNode.startPosition.row + 1,
            endLine: fnNode.endPosition.row + 1,
            isAsync,
            isExported,
            returnType: '',
            paramCount,
            language: langName,
          },
        })

        symbolTable.define({
          nodeId,
          name,
          qualifiedName: name,
          label: NodeLabel.Function,
          filePath,
          startLine: fnNode.startPosition.row + 1,
          endLine: fnNode.endPosition.row + 1,
        })

        graph.addRelationship({
          type: RelationshipType.CONTAINS,
          startNodeId: fileNodeId,
          endNodeId: nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
        })
      }
    },

    resolveImports(ctx: ParseContext, allFiles: Set<string>): void {
      const { filePath, tree, graph } = ctx
      const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

      for (const match of makeQuery(isTsx, TS_IMPORT_QUERY, tree.rootNode)) {
        const sourceNode = match.captures.find((c) => c.name === 'source')?.node
        if (!sourceNode) continue

        const raw = sourceNode.text.replace(/^['"]|['"]$/g, '')
        const targetFile = resolveImportPath(sourceNode.text, filePath, allFiles)

        if (targetFile) {
          // ローカルファイル（相対パスまたはパスエイリアス）
          const targetFileNodeId = generateNodeId(NodeLabel.File, targetFile, targetFile)
          graph.addRelationship({
            type: RelationshipType.IMPORTS,
            startNodeId: fileNodeId,
            endNodeId: targetFileNodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.IMPORTS, fileNodeId, targetFileNodeId),
              importPath: raw,
            },
          })
        } else if (!raw.startsWith('.') && !raw.startsWith('/')) {
          // ベアスペシファイアで解決できなかった → 外部パッケージ（node_modules 等）
          const pkgName = getPackageName(raw)
          const pkgNodeId = `Package:${pkgName}`
          graph.addNode({
            label: NodeLabel.Package,
            properties: { nodeId: pkgNodeId, name: pkgName, packageName: pkgName },
          })
          graph.addRelationship({
            type: RelationshipType.IMPORTS,
            startNodeId: fileNodeId,
            endNodeId: pkgNodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.IMPORTS, fileNodeId, pkgNodeId),
              importPath: raw,
            },
          })
        }
        // 相対パスで解決できなかった場合はスキップ（壊れたインポート）
      }
    },

    resolveHeritage(ctx: ParseContext): void {
      const { filePath, tree, graph, symbolTable } = ctx

      // EXTENDS (class -> class)
      for (const match of makeQuery(isTsx, TS_EXTENDS_QUERY, tree.rootNode)) {
        const classNameNode = match.captures.find((c) => c.name === 'className')?.node
        const superNameNode = match.captures.find((c) => c.name === 'superName')?.node
        if (!classNameNode || !superNameNode) continue

        const childId = generateNodeId(NodeLabel.Class, filePath, classNameNode.text)
        const superCandidates = symbolTable.lookupByName(superNameNode.text)
        const superSym = superCandidates.find((s) => s.label === NodeLabel.Class) ?? superCandidates[0]
        if (!superSym) continue

        graph.addRelationship({
          type: RelationshipType.EXTENDS,
          startNodeId: childId,
          endNodeId: superSym.nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.EXTENDS, childId, superSym.nodeId) },
        })
      }

      // IMPLEMENTS (class -> interface)
      for (const match of makeQuery(isTsx, TS_IMPLEMENTS_QUERY, tree.rootNode)) {
        const classNameNode = match.captures.find((c) => c.name === 'className')?.node
        const ifaceNameNode = match.captures.find((c) => c.name === 'ifaceName')?.node
        if (!classNameNode || !ifaceNameNode) continue

        const childId = generateNodeId(NodeLabel.Class, filePath, classNameNode.text)
        const ifaceCandidates = symbolTable.lookupByName(ifaceNameNode.text)
        const ifaceSym = ifaceCandidates.find((s) => s.label === NodeLabel.Interface) ?? ifaceCandidates[0]
        if (!ifaceSym) continue

        graph.addRelationship({
          type: RelationshipType.IMPLEMENTS,
          startNodeId: childId,
          endNodeId: ifaceSym.nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.IMPLEMENTS, childId, ifaceSym.nodeId) },
        })
      }

      // EXTENDS (interface -> interface)
      for (const match of makeQuery(isTsx, TS_INTERFACE_EXTENDS_QUERY, tree.rootNode)) {
        const ifaceNameNode = match.captures.find((c) => c.name === 'ifaceName')?.node
        const superIfaceNameNode = match.captures.find((c) => c.name === 'superIfaceName')?.node
        if (!ifaceNameNode || !superIfaceNameNode) continue

        const childId = generateNodeId(NodeLabel.Interface, filePath, ifaceNameNode.text)
        const superCandidates = symbolTable.lookupByName(superIfaceNameNode.text)
        const superSym = superCandidates.find((s) => s.label === NodeLabel.Interface) ?? superCandidates[0]
        if (!superSym) continue

        graph.addRelationship({
          type: RelationshipType.EXTENDS,
          startNodeId: childId,
          endNodeId: superSym.nodeId,
          properties: { relId: generateRelationshipId(RelationshipType.EXTENDS, childId, superSym.nodeId) },
        })
      }
    },

    resolveCalls(ctx: ParseContext): void {
      const { filePath, tree, graph, symbolTable } = ctx

      for (const match of makeQuery(isTsx, TS_CALL_QUERY, tree.rootNode)) {
        const callNode = match.captures.find((c) => c.name === 'directCall' || c.name === 'memberCall')?.node
        const calleeNode = match.captures.find((c) => c.name === 'callee' || c.name === 'methodName')?.node
        if (!callNode || !calleeNode) continue

        const callLine = callNode.startPosition.row + 1
        const callerSym = symbolTable.lookupByLine(filePath, callLine)
        if (!callerSym) continue
        if (callerSym.label !== NodeLabel.Method && callerSym.label !== NodeLabel.Function) continue

        const calleeCandidates = symbolTable.lookupByName(calleeNode.text)
        for (const callee of calleeCandidates) {
          if (callee.nodeId === callerSym.nodeId) continue
          const confidence = callee.filePath === filePath ? 0.9 : 0.7

          graph.addRelationship({
            type: RelationshipType.CALLS,
            startNodeId: callerSym.nodeId,
            endNodeId: callee.nodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.CALLS, callerSym.nodeId, callee.nodeId),
              confidence,
            },
          })
          break
        }
      }
    },
  }
}

export const typescriptProvider = buildTsProvider(false)
export const tsxProvider = buildTsProvider(true)
