import Parser from 'tree-sitter'
import { NodeLabel, RelationshipType } from '../../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId } from '../../../shared/utils.js'
import type { LanguageProvider, ParseContext } from '../language-provider.js'
import {
  JS_CLASS_QUERY,
  JS_METHOD_QUERY,
  JS_FUNCTION_QUERY,
  JS_IMPORT_QUERY,
  JS_EXTENDS_QUERY,
  JS_CALL_QUERY,
} from '../tree-sitter-queries.js'
import { createRequire } from 'module'
import { dirname, resolve } from 'path'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JavaScript = require('tree-sitter-javascript') as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLanguage(): any {
  return JavaScript
}

function getPackageName(importPath: string): string {
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath
  }
  return importPath.split('/')[0]
}

function resolveImportPath(importSource: string, fromFile: string, allFiles: Set<string>): string | undefined {
  const raw = importSource.replace(/^['"]|['"]$/g, '')
  const isRelative = raw.startsWith('.') || raw.startsWith('/')

  if (isRelative) {
    const dir = dirname(fromFile)
    const candidateBases = [
      raw,
      raw + '.js',
      raw + '.mjs',
      raw + '.cjs',
      raw + '.jsx',
      raw + '/index.js',
      raw + '/index.mjs',
    ]

    for (const candidate of candidateBases) {
      const resolved = resolve(dir, candidate)
      for (const known of allFiles) {
        if (known.endsWith(resolved.replace(/\\/g, '/')) || resolved.endsWith(known)) {
          return known
        }
      }
    }

    const withoutLeadingDots = raw.replace(/^\.\//, '').replace(/^\.\.\//, '')
    for (const ext of ['.js', '.mjs', '.jsx']) {
      for (const known of allFiles) {
        if (known.endsWith(withoutLeadingDots + ext)) return known
      }
    }
  } else {
    // Bare specifier — try as path alias
    const stripped = raw.replace(/^@\//, '').replace(/^~\//, '')
    const candidates = stripped === raw ? [raw] : [raw, stripped]

    for (const candidate of candidates) {
      for (const known of allFiles) {
        if (known === candidate || known.endsWith(`/${candidate}`)) return known
      }
      for (const ext of ['.js', '.mjs', '.jsx', '.cjs']) {
        for (const known of allFiles) {
          if (known.endsWith(`/${candidate}${ext}`) || known === `${candidate}${ext}`) return known
        }
      }
      for (const ext of ['/index.js', '/index.mjs']) {
        for (const known of allFiles) {
          if (known.endsWith(`/${candidate}${ext}`) || known === `${candidate}${ext}`) return known
        }
      }
    }
  }

  return undefined
}

export const javascriptProvider: LanguageProvider = {
  language: 'javascript',
  extensions: ['.js', '.mjs', '.cjs', '.jsx'],

  extractSymbols(ctx: ParseContext): void {
    const { filePath, tree, graph, symbolTable } = ctx
    const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

    // ---- Classes ----
    for (const match of new Parser.Query(getLanguage(), JS_CLASS_QUERY).matches(tree.rootNode)) {
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
          isAbstract: false,
          isStatic: false,
          language: 'javascript',
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

      // Methods
      for (const mm of new Parser.Query(getLanguage(), JS_METHOD_QUERY).matches(classNode)) {
        const methodNode = mm.captures.find((c) => c.name === 'method')?.node
        const mName = mm.captures.find((c) => c.name === 'name')?.node
        const mParams = mm.captures.find((c) => c.name === 'params')?.node
        if (!methodNode || !mName) continue

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
            language: 'javascript',
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
    }

    // ---- Top-level Functions ----
    for (const match of new Parser.Query(getLanguage(), JS_FUNCTION_QUERY).matches(tree.rootNode)) {
      const fnNode = match.captures.find((c) => c.name === 'function')?.node
        ?? match.captures.find((c) => c.name === 'arrowFn')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      const paramsNode = match.captures.find((c) => c.name === 'params')?.node
      if (!fnNode || !nameNode) continue

      const name = nameNode.text
      // Skip if this function is inside a class (already captured as method)
      let parent = fnNode.parent
      let insideClass = false
      while (parent) {
        if (parent.type === 'class_body' || parent.type === 'class_declaration') {
          insideClass = true
          break
        }
        parent = parent.parent
      }
      if (insideClass) continue

      const nodeId = generateNodeId(NodeLabel.Function, filePath, name)
      const isAsync = fnNode.text.trimStart().startsWith('async ')
      const paramCount = paramsNode ? paramsNode.namedChildren.length : 0
      const isExported = match.captures.some((c) => ['exportedArrowDecl'].includes(c.name))

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
          language: 'javascript',
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

    for (const match of new Parser.Query(getLanguage(), JS_IMPORT_QUERY).matches(tree.rootNode)) {
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

    for (const match of new Parser.Query(getLanguage(), JS_EXTENDS_QUERY).matches(tree.rootNode)) {
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
  },

  resolveCalls(ctx: ParseContext): void {
    const { filePath, tree, graph, symbolTable } = ctx

    for (const match of new Parser.Query(getLanguage(), JS_CALL_QUERY).matches(tree.rootNode)) {
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
