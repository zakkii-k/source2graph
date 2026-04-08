import Parser from 'tree-sitter'
import { NodeLabel, RelationshipType } from '../../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId } from '../../../shared/utils.js'
import type { LanguageProvider, ParseContext } from '../language-provider.js'
import {
  SCALA_CLASS_QUERY,
  SCALA_TRAIT_QUERY,
  SCALA_OBJECT_QUERY,
  SCALA_METHOD_QUERY,
  SCALA_FIELD_QUERY,
  SCALA_IMPORT_QUERY,
  SCALA_EXTENDS_QUERY,
  SCALA_CALL_QUERY,
} from '../tree-sitter-queries.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Scala = require('tree-sitter-scala') as any

function q(queryStr: string, node: Parser.SyntaxNode): Parser.QueryMatch[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Parser.Query(Scala as any, queryStr).matches(node)
}

function extractPackageName(source: string): string {
  const match = source.match(/^\s*package\s+([\w.]+)/m)
  return match?.[1] ?? ''
}

/**
 * `import_declaration` のノードからインポートパスの一覧を返す。
 * - 単純インポート: ["com.example.model.User"]
 * - セレクタ付き: ["com.example.Foo", "com.example.Bar"]
 * - ワイルドカード: []（スキップ）
 */
function parseImportPaths(importNode: Parser.SyntaxNode): string[] {
  // Collect children: identifiers, dots, namespace_selectors, namespace_wildcard
  const parts: string[] = []
  let basePath = ''
  const results: string[] = []

  for (const child of importNode.children) {
    if (child.type === 'import') continue

    if (child.type === 'identifier') {
      parts.push(child.text)
    } else if (child.type === '.') {
      // separator — do nothing, just continue accumulating
    } else if (child.type === 'namespace_wildcard') {
      // wildcard import — skip
      return []
    } else if (child.type === 'namespace_selectors') {
      basePath = parts.join('.')
      // Get each selected name
      for (const sel of child.children) {
        if (sel.type === 'identifier') {
          results.push(`${basePath}.${sel.text}`)
        } else if (sel.type === 'arrow_renamed_identifier') {
          // `Foo => Bar` — use the original name (first identifier)
          const orig = sel.children.find((c) => c.type === 'identifier')
          if (orig) results.push(`${basePath}.${orig.text}`)
        }
      }
      return results
    }
  }

  // Simple import (no selectors)
  if (parts.length > 0) {
    results.push(parts.join('.'))
  }
  return results
}

/**
 * Scala の FQN (com.example.Foo) をファイルパスに変換してリポジトリ内で検索する。
 * `.scala` と `.sbt` の両方を試みる。
 */
function resolveScalaImport(fqn: string, allFiles: Set<string>): string | undefined {
  const asPath = fqn.replace(/\./g, '/')
  for (const ext of ['.scala', '.sbt']) {
    for (const known of allFiles) {
      if (known.endsWith(`${asPath}${ext}`)) return known
    }
  }
  return undefined
}

export const scalaProvider: LanguageProvider = {
  language: 'scala',
  extensions: ['.scala', '.sbt'],

  extractSymbols(ctx: ParseContext): void {
    const { filePath, source, tree, graph, symbolTable } = ctx
    const packageName = extractPackageName(source)
    const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

    // ---- Classes ----
    for (const match of q(SCALA_CLASS_QUERY, tree.rootNode)) {
      const classNode = match.captures.find((c) => c.name === 'class')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      if (!classNode || !nameNode) continue

      const name = nameNode.text
      const qualifiedName = packageName ? `${packageName}.${name}` : name
      const nodeId = generateNodeId(NodeLabel.Class, filePath, qualifiedName)

      graph.addNode({
        label: NodeLabel.Class,
        properties: {
          nodeId,
          name,
          qualifiedName,
          filePath,
          startLine: classNode.startPosition.row + 1,
          endLine: classNode.endPosition.row + 1,
          visibility: 'public',
          isAbstract: false,
          isStatic: false,
          language: 'scala',
        },
      })

      symbolTable.define({
        nodeId,
        name,
        qualifiedName,
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

      _extractMembers(classNode, nodeId, qualifiedName, filePath, graph, symbolTable)
    }

    // ---- Traits (→ Interface) ----
    for (const match of q(SCALA_TRAIT_QUERY, tree.rootNode)) {
      const traitNode = match.captures.find((c) => c.name === 'trait')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      if (!traitNode || !nameNode) continue

      const name = nameNode.text
      const qualifiedName = packageName ? `${packageName}.${name}` : name
      const nodeId = generateNodeId(NodeLabel.Interface, filePath, qualifiedName)

      graph.addNode({
        label: NodeLabel.Interface,
        properties: {
          nodeId,
          name,
          qualifiedName,
          filePath,
          startLine: traitNode.startPosition.row + 1,
          endLine: traitNode.endPosition.row + 1,
          visibility: 'public',
          language: 'scala',
        },
      })

      symbolTable.define({
        nodeId,
        name,
        qualifiedName,
        label: NodeLabel.Interface,
        filePath,
        startLine: traitNode.startPosition.row + 1,
        endLine: traitNode.endPosition.row + 1,
      })

      graph.addRelationship({
        type: RelationshipType.CONTAINS,
        startNodeId: fileNodeId,
        endNodeId: nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
      })

      _extractMembers(traitNode, nodeId, qualifiedName, filePath, graph, symbolTable)
    }

    // ---- Objects (singleton → Class) ----
    for (const match of q(SCALA_OBJECT_QUERY, tree.rootNode)) {
      const objectNode = match.captures.find((c) => c.name === 'object')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      if (!objectNode || !nameNode) continue

      const name = nameNode.text
      const qualifiedName = packageName ? `${packageName}.${name}` : name
      const nodeId = generateNodeId(NodeLabel.Class, filePath, `${qualifiedName}$`)  // $ suffix distinguishes object from class

      graph.addNode({
        label: NodeLabel.Class,
        properties: {
          nodeId,
          name: `${name}$`,
          qualifiedName: `${qualifiedName}$`,
          filePath,
          startLine: objectNode.startPosition.row + 1,
          endLine: objectNode.endPosition.row + 1,
          visibility: 'public',
          isAbstract: false,
          isStatic: true,  // singleton
          language: 'scala',
        },
      })

      symbolTable.define({
        nodeId,
        name,
        qualifiedName: `${qualifiedName}$`,
        label: NodeLabel.Class,
        filePath,
        startLine: objectNode.startPosition.row + 1,
        endLine: objectNode.endPosition.row + 1,
      })

      graph.addRelationship({
        type: RelationshipType.CONTAINS,
        startNodeId: fileNodeId,
        endNodeId: nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
      })

      _extractMembers(objectNode, nodeId, qualifiedName, filePath, graph, symbolTable)
    }
  },

  resolveImports(ctx: ParseContext, allFiles: Set<string>): void {
    const { filePath, tree, graph } = ctx
    const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

    for (const match of q(SCALA_IMPORT_QUERY, tree.rootNode)) {
      const importNode = match.captures.find((c) => c.name === 'import')?.node
      if (!importNode) continue

      const fqns = parseImportPaths(importNode)
      for (const fqn of fqns) {
        const targetFile = resolveScalaImport(fqn, allFiles)

        if (targetFile) {
          const targetFileNodeId = generateNodeId(NodeLabel.File, targetFile, targetFile)
          graph.addRelationship({
            type: RelationshipType.IMPORTS,
            startNodeId: fileNodeId,
            endNodeId: targetFileNodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.IMPORTS, fileNodeId, targetFileNodeId),
              importPath: fqn,
            },
          })
        } else {
          // 外部パッケージ（scala.*、third-party 等）
          const pkgName = fqn.split('.').slice(0, 2).join('.')
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
              importPath: fqn,
            },
          })
        }
      }
    }
  },

  resolveHeritage(ctx: ParseContext): void {
    const { filePath, source, tree, graph, symbolTable } = ctx
    const packageName = extractPackageName(source)

    for (const match of q(SCALA_EXTENDS_QUERY, tree.rootNode)) {
      const classNameNode = match.captures.find((c) => c.name === 'className')?.node
      const parentNameNode = match.captures.find((c) => c.name === 'parentName')?.node
      if (!classNameNode || !parentNameNode) continue

      const isObject = match.captures.some((c) => c.name === 'objectDecl')
      const childQName = packageName ? `${packageName}.${classNameNode.text}` : classNameNode.text
      const childSuffix = isObject ? '$' : ''
      const childId = isObject
        ? generateNodeId(NodeLabel.Class, filePath, `${childQName}$`)
        : generateNodeId(NodeLabel.Class, filePath, childQName)
          ?? generateNodeId(NodeLabel.Interface, filePath, childQName)

      const parentCandidates = symbolTable.lookupByName(parentNameNode.text)
      const parentSym = parentCandidates[0]
      if (!parentSym) continue

      const relType = parentSym.label === NodeLabel.Interface
        ? RelationshipType.IMPLEMENTS
        : RelationshipType.EXTENDS

      graph.addRelationship({
        type: relType,
        startNodeId: childId,
        endNodeId: parentSym.nodeId,
        properties: { relId: generateRelationshipId(relType, childId, parentSym.nodeId) },
      })

      void childSuffix  // suppress unused warning
    }
  },

  resolveCalls(ctx: ParseContext): void {
    const { filePath, tree, graph, symbolTable } = ctx

    for (const match of q(SCALA_CALL_QUERY, tree.rootNode)) {
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

/**
 * class/trait/object のテンプレートボディからメソッドとフィールドを抽出してグラフに追加する。
 */
function _extractMembers(
  containerNode: Parser.SyntaxNode,
  containerId: string,
  qualifiedName: string,
  filePath: string,
  graph: ReturnType<ParseContext['graph']['addNode']> extends void ? ParseContext['graph'] : ParseContext['graph'],
  symbolTable: ParseContext['symbolTable'],
): void {
  const body = containerNode.children.find((c) => c.type === 'template_body')
  if (!body) return

  // Methods (function_definition direct children of template_body)
  for (const child of body.children) {
    if (child.type !== 'function_definition') continue

    const nameNode = child.children.find((c) => c.type === 'identifier')
    if (!nameNode) continue

    // First `parameters` child for param count
    const paramsNode = child.children.find((c) => c.type === 'parameters')
    const paramCount = paramsNode ? paramsNode.namedChildren.length : 0

    const mQualified = `${qualifiedName}.${nameNode.text}`
    const mNodeId = `Method:${filePath}:${mQualified}#${paramCount}`
    const isAsync = false  // Scala uses Future, not async/await syntax

    graph.addNode({
      label: NodeLabel.Method,
      properties: {
        nodeId: mNodeId,
        name: nameNode.text,
        qualifiedName: mQualified,
        filePath,
        startLine: child.startPosition.row + 1,
        endLine: child.endPosition.row + 1,
        visibility: 'public',
        isStatic: false,
        isAsync,
        returnType: '',
        paramCount,
        language: 'scala',
      },
    })

    symbolTable.define({
      nodeId: mNodeId,
      name: nameNode.text,
      qualifiedName: mQualified,
      label: NodeLabel.Method,
      filePath,
      startLine: child.startPosition.row + 1,
      endLine: child.endPosition.row + 1,
    })

    graph.addRelationship({
      type: RelationshipType.HAS_METHOD,
      startNodeId: containerId,
      endNodeId: mNodeId,
      properties: { relId: generateRelationshipId(RelationshipType.HAS_METHOD, containerId, mNodeId) },
    })
  }

  // Fields (val_definition / var_definition direct children of template_body)
  for (const child of body.children) {
    if (child.type !== 'val_definition' && child.type !== 'var_definition') continue

    const nameNode = child.children.find((c) => c.type === 'identifier')
    if (!nameNode) continue

    // Determine visibility from modifiers
    const modsNode = child.children.find((c) => c.type === 'modifiers')
    const modsText = modsNode?.text ?? ''
    const visibility = modsText.includes('private') ? 'private'
      : modsText.includes('protected') ? 'protected'
      : 'public'

    const fNodeId = generateNodeId(NodeLabel.Field, filePath, `${qualifiedName}.${nameNode.text}`)

    graph.addNode({
      label: NodeLabel.Field,
      properties: {
        nodeId: fNodeId,
        name: nameNode.text,
        filePath,
        startLine: child.startPosition.row + 1,
        visibility,
        isStatic: child.type === 'val_definition',  // val = effectively final/static-like
        fieldType: '',
        language: 'scala',
      },
    })

    graph.addRelationship({
      type: RelationshipType.HAS_PROPERTY,
      startNodeId: containerId,
      endNodeId: fNodeId,
      properties: { relId: generateRelationshipId(RelationshipType.HAS_PROPERTY, containerId, fNodeId) },
    })
  }
}
