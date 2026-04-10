import Parser from 'tree-sitter'
import { NodeLabel, RelationshipType } from '../../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId } from '../../../shared/utils.js'
import type { LanguageProvider, ParseContext } from '../language-provider.js'
import type { SymbolDefinition } from '../symbol-table.js'
import {
  JAVA_CLASS_QUERY,
  JAVA_INTERFACE_QUERY,
  JAVA_METHOD_QUERY,
  JAVA_FIELD_QUERY,
  JAVA_IMPORT_QUERY,
  JAVA_EXTENDS_QUERY,
  JAVA_IMPLEMENTS_QUERY,
  JAVA_INTERFACE_EXTENDS_QUERY,
  JAVA_CALL_QUERY,
} from '../tree-sitter-queries.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Java = require('tree-sitter-java') as any

function q(queryStr: string, node: Parser.SyntaxNode): Parser.QueryMatch[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Parser.Query(Java as any, queryStr).matches(node)
}

function extractVisibility(modifiersNode: Parser.SyntaxNode | null): string {
  if (!modifiersNode) return 'package'
  const text = modifiersNode.text
  if (text.includes('public')) return 'public'
  if (text.includes('protected')) return 'protected'
  if (text.includes('private')) return 'private'
  return 'package'
}

function hasModifier(modifiersNode: Parser.SyntaxNode | null, modifier: string): boolean {
  return modifiersNode?.text.includes(modifier) ?? false
}

/** Resolve the Java package name from the source text. */
function extractPackageName(source: string): string {
  const match = source.match(/^\s*package\s+([\w.]+)\s*;/m)
  return match?.[1] ?? ''
}

/**
 * Pick the best candidate from a symbol lookup result.
 * Priority: same-package match → label-filtered match → first match.
 */
function pickCandidate(
  candidates: SymbolDefinition[],
  packageName: string,
  preferLabel?: string,
): SymbolDefinition | undefined {
  if (candidates.length === 0) return undefined

  // 1. Same package + preferred label
  if (packageName && preferLabel) {
    const hit = candidates.find(
      (s) => s.label === preferLabel && s.qualifiedName?.startsWith(packageName + '.'),
    )
    if (hit) return hit
  }

  // 2. Same package (any label)
  if (packageName) {
    const hit = candidates.find((s) => s.qualifiedName?.startsWith(packageName + '.'))
    if (hit) return hit
  }

  // 3. Preferred label (any package)
  if (preferLabel) {
    const hit = candidates.find((s) => s.label === preferLabel)
    if (hit) return hit
  }

  // 4. First candidate
  return candidates[0]
}

export const javaProvider: LanguageProvider = {
  language: 'java',
  extensions: ['.java'],

  extractSymbols(ctx: ParseContext): void {
    const { filePath, source, tree, graph, symbolTable } = ctx
    const packageName = extractPackageName(source)

    // ---- Classes ----
    const classMatches = q(JAVA_CLASS_QUERY, tree.rootNode)
    for (const match of classMatches) {
      const classNode = match.captures.find((c) => c.name === 'class')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      const modifiersNode = match.captures.find((c) => c.name === 'modifiers')?.node ?? null

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
          visibility: extractVisibility(modifiersNode ?? null),
          isAbstract: hasModifier(modifiersNode ?? null, 'abstract'),
          isStatic: hasModifier(modifiersNode ?? null, 'static'),
          language: 'java',
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

      // CONTAINS: file -> class
      const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)
      graph.addRelationship({
        type: RelationshipType.CONTAINS,
        startNodeId: fileNodeId,
        endNodeId: nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
      })

      // ---- Methods inside this class ----
      const methodMatches = q(JAVA_METHOD_QUERY, classNode)
      for (const mm of methodMatches) {
        const methodNode = mm.captures.find((c) => c.name === 'method')?.node
        const mName = mm.captures.find((c) => c.name === 'name')?.node
        const mParams = mm.captures.find((c) => c.name === 'params')?.node
        const mMods = mm.captures.find((c) => c.name === 'modifiers')?.node ?? null
        const mReturn = mm.captures.find((c) => c.name === 'returnType')?.node

        if (!methodNode || !mName) continue

        const paramCount = mParams ? mParams.namedChildren.length : 0
        const mQualified = `${qualifiedName}.${mName.text}`
        const methodId = generateRelationshipId('MethodId', filePath, `${mQualified}#${paramCount}`)
        const mNodeId = `Method:${filePath}:${mQualified}#${paramCount}`

        graph.addNode({
          label: NodeLabel.Method,
          properties: {
            nodeId: mNodeId,
            name: mName.text,
            qualifiedName: mQualified,
            filePath,
            startLine: methodNode.startPosition.row + 1,
            endLine: methodNode.endPosition.row + 1,
            visibility: extractVisibility(mMods),
            isStatic: hasModifier(mMods, 'static'),
            isAsync: false,
            returnType: mReturn?.text ?? '',
            paramCount,
            language: 'java',
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

      // ---- Fields inside this class ----
      const fieldMatches = q(JAVA_FIELD_QUERY, classNode)
      for (const fm of fieldMatches) {
        const fieldNode = fm.captures.find((c) => c.name === 'field')?.node
        const fName = fm.captures.find((c) => c.name === 'name')?.node
        const fMods = fm.captures.find((c) => c.name === 'modifiers')?.node ?? null
        const fType = fm.captures.find((c) => c.name === 'fieldType')?.node

        if (!fieldNode || !fName) continue

        const fNodeId = generateNodeId(NodeLabel.Field, filePath, `${qualifiedName}.${fName.text}`)

        graph.addNode({
          label: NodeLabel.Field,
          properties: {
            nodeId: fNodeId,
            name: fName.text,
            filePath,
            startLine: fieldNode.startPosition.row + 1,
            visibility: extractVisibility(fMods),
            isStatic: hasModifier(fMods, 'static'),
            fieldType: fType?.text ?? '',
            language: 'java',
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
    const ifaceMatches = q(JAVA_INTERFACE_QUERY, tree.rootNode)
    for (const match of ifaceMatches) {
      const ifaceNode = match.captures.find((c) => c.name === 'interface')?.node
      const nameNode = match.captures.find((c) => c.name === 'name')?.node
      const modifiersNode = match.captures.find((c) => c.name === 'modifiers')?.node ?? null

      if (!ifaceNode || !nameNode) continue

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
          startLine: ifaceNode.startPosition.row + 1,
          endLine: ifaceNode.endPosition.row + 1,
          visibility: extractVisibility(modifiersNode),
          language: 'java',
        },
      })

      symbolTable.define({
        nodeId,
        name,
        qualifiedName,
        label: NodeLabel.Interface,
        filePath,
        startLine: ifaceNode.startPosition.row + 1,
        endLine: ifaceNode.endPosition.row + 1,
      })

      const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)
      graph.addRelationship({
        type: RelationshipType.CONTAINS,
        startNodeId: fileNodeId,
        endNodeId: nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, nodeId) },
      })

      // Methods inside interface
      const methodMatches = q(JAVA_METHOD_QUERY, ifaceNode)
      for (const mm of methodMatches) {
        const methodNode = mm.captures.find((c) => c.name === 'method')?.node
        const mName = mm.captures.find((c) => c.name === 'name')?.node
        const mParams = mm.captures.find((c) => c.name === 'params')?.node
        const mReturn = mm.captures.find((c) => c.name === 'returnType')?.node

        if (!methodNode || !mName) continue

        const paramCount = mParams ? mParams.namedChildren.length : 0
        const mQualified = `${qualifiedName}.${mName.text}`
        const mNodeId = `Method:${filePath}:${mQualified}#${paramCount}`

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
            isStatic: false,
            isAsync: false,
            returnType: mReturn?.text ?? '',
            paramCount,
            language: 'java',
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
  },

  resolveImports(ctx: ParseContext, allFiles: Set<string>): void {
    const { filePath, tree, graph } = ctx
    const fileNodeId = generateNodeId(NodeLabel.File, filePath, filePath)

    const importMatches = q(JAVA_IMPORT_QUERY, tree.rootNode)
    for (const match of importMatches) {
      const importPathNode = match.captures.find((c) => c.name === 'importPath')?.node
      if (!importPathNode) continue

      // Java import path: com.example.service.UserService
      // Map to file path: com/example/service/UserService.java
      const importPath = importPathNode.text.trim()
      const asFilePath = importPath.replace(/\./g, '/') + '.java'

      // Find matching file in the walked set
      for (const knownFile of allFiles) {
        if (knownFile.endsWith(asFilePath)) {
          const targetFileNodeId = generateNodeId(NodeLabel.File, knownFile, knownFile)
          graph.addRelationship({
            type: RelationshipType.IMPORTS,
            startNodeId: fileNodeId,
            endNodeId: targetFileNodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.IMPORTS, fileNodeId, targetFileNodeId),
              importPath,
            },
          })
          break
        }
      }
    }
  },

  resolveHeritage(ctx: ParseContext): void {
    const { filePath, source, tree, graph, symbolTable } = ctx
    const packageName = extractPackageName(source)

    // EXTENDS (class -> class)
    for (const match of q(JAVA_EXTENDS_QUERY, tree.rootNode)) {
      const classNameNode = match.captures.find((c) => c.name === 'className')?.node
      const superNameNode = match.captures.find((c) => c.name === 'superName')?.node
      if (!classNameNode || !superNameNode) continue

      const className = packageName ? `${packageName}.${classNameNode.text}` : classNameNode.text
      const childId = generateNodeId(NodeLabel.Class, filePath, className)

      const superSym = pickCandidate(
        symbolTable.lookupByName(superNameNode.text),
        packageName,
        NodeLabel.Class,
      )
      if (!superSym) continue

      graph.addRelationship({
        type: RelationshipType.EXTENDS,
        startNodeId: childId,
        endNodeId: superSym.nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.EXTENDS, childId, superSym.nodeId) },
      })
    }

    // IMPLEMENTS (class -> interface)
    for (const match of q(JAVA_IMPLEMENTS_QUERY, tree.rootNode)) {
      const classNameNode = match.captures.find((c) => c.name === 'className')?.node
      const ifaceNameNode = match.captures.find((c) => c.name === 'ifaceName')?.node
      if (!classNameNode || !ifaceNameNode) continue

      const className = packageName ? `${packageName}.${classNameNode.text}` : classNameNode.text
      const childId = generateNodeId(NodeLabel.Class, filePath, className)

      const ifaceSym = pickCandidate(
        symbolTable.lookupByName(ifaceNameNode.text),
        packageName,
        NodeLabel.Interface,
      )
      if (!ifaceSym) continue

      graph.addRelationship({
        type: RelationshipType.IMPLEMENTS,
        startNodeId: childId,
        endNodeId: ifaceSym.nodeId,
        properties: { relId: generateRelationshipId(RelationshipType.IMPLEMENTS, childId, ifaceSym.nodeId) },
      })
    }

    // EXTENDS (interface -> interface)
    for (const match of q(JAVA_INTERFACE_EXTENDS_QUERY, tree.rootNode)) {
      const ifaceNameNode = match.captures.find((c) => c.name === 'ifaceName')?.node
      const superIfaceNameNode = match.captures.find((c) => c.name === 'superIfaceName')?.node
      if (!ifaceNameNode || !superIfaceNameNode) continue

      const ifaceName = packageName ? `${packageName}.${ifaceNameNode.text}` : ifaceNameNode.text
      const childId = generateNodeId(NodeLabel.Interface, filePath, ifaceName)

      const superSym = pickCandidate(
        symbolTable.lookupByName(superIfaceNameNode.text),
        packageName,
        NodeLabel.Interface,
      )
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
    const { filePath, source, tree, graph, symbolTable } = ctx
    const packageName = extractPackageName(source)

    // Find the enclosing method for each call site
    for (const match of q(JAVA_CALL_QUERY, tree.rootNode)) {
      const callNode = match.captures.find((c) => c.name === 'call')?.node
      const methodNameNode = match.captures.find((c) => c.name === 'methodName')?.node
      if (!callNode || !methodNameNode) continue

      const callLine = callNode.startPosition.row + 1
      const callerSym = symbolTable.lookupByLine(filePath, callLine)
      if (!callerSym || callerSym.label !== NodeLabel.Method) continue

      const calleeCandidates = symbolTable.lookupByName(methodNameNode.text)
        .filter((c) => c.nodeId !== callerSym.nodeId)
      if (calleeCandidates.length === 0) continue

      // Prefer: same file > same package > other
      const callee =
        calleeCandidates.find((c) => c.filePath === filePath) ??
        (packageName
          ? calleeCandidates.find((c) => c.qualifiedName?.startsWith(packageName + '.'))
          : undefined) ??
        calleeCandidates[0]

      const confidence =
        callee.filePath === filePath ? 0.9
        : (packageName && callee.qualifiedName?.startsWith(packageName + '.')) ? 0.8
        : 0.7

      graph.addRelationship({
        type: RelationshipType.CALLS,
        startNodeId: callerSym.nodeId,
        endNodeId: callee.nodeId,
        properties: {
          relId: generateRelationshipId(RelationshipType.CALLS, callerSym.nodeId, callee.nodeId),
          confidence,
        },
      })
    }
  },
}
