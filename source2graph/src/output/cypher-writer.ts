import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import type { KnowledgeGraph, GraphNode, GraphRelationship } from '../shared/graph-types.js'
import { NodeLabel, RelationshipType } from '../shared/graph-types.js'
import type {
  FileNodeProperties,
  FolderNodeProperties,
  ClassNodeProperties,
  InterfaceNodeProperties,
  MethodNodeProperties,
  FunctionNodeProperties,
  FieldNodeProperties,
  SectionNodeProperties,
  PackageNodeProperties,
  CallsRelationshipProperties,
  ImportsRelationshipProperties,
} from '../shared/graph-types.js'

const BATCH_SIZE = 500

function cypherStr(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  // Escape backslashes and single quotes
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function nodeToProps(node: GraphNode): string {
  const p = node.properties
  const entries: string[] = [`nodeId: ${cypherStr(p.nodeId)}`, `name: ${cypherStr(p.name)}`]

  switch (node.label) {
    case NodeLabel.File: {
      const fp = p as FileNodeProperties
      entries.push(`filePath: ${cypherStr(fp.filePath)}`, `language: ${cypherStr(fp.language)}`, `extension: ${cypherStr(fp.extension)}`)
      break
    }
    case NodeLabel.Folder: {
      const fp = p as FolderNodeProperties
      entries.push(`folderPath: ${cypherStr(fp.folderPath)}`)
      break
    }
    case NodeLabel.Class: {
      const cp = p as ClassNodeProperties
      entries.push(
        `qualifiedName: ${cypherStr(cp.qualifiedName)}`,
        `filePath: ${cypherStr(cp.filePath)}`,
        `startLine: ${cp.startLine}`,
        `endLine: ${cp.endLine}`,
        `visibility: ${cypherStr(cp.visibility)}`,
        `isAbstract: ${cp.isAbstract}`,
        `isStatic: ${cp.isStatic}`,
        `language: ${cypherStr(cp.language)}`,
      )
      break
    }
    case NodeLabel.Interface: {
      const ip = p as InterfaceNodeProperties
      entries.push(
        `qualifiedName: ${cypherStr(ip.qualifiedName)}`,
        `filePath: ${cypherStr(ip.filePath)}`,
        `startLine: ${ip.startLine}`,
        `endLine: ${ip.endLine}`,
        `visibility: ${cypherStr(ip.visibility)}`,
        `language: ${cypherStr(ip.language)}`,
      )
      break
    }
    case NodeLabel.Method: {
      const mp = p as MethodNodeProperties
      entries.push(
        `qualifiedName: ${cypherStr(mp.qualifiedName)}`,
        `filePath: ${cypherStr(mp.filePath)}`,
        `startLine: ${mp.startLine}`,
        `endLine: ${mp.endLine}`,
        `visibility: ${cypherStr(mp.visibility)}`,
        `isStatic: ${mp.isStatic}`,
        `isAsync: ${mp.isAsync}`,
        `returnType: ${cypherStr(mp.returnType)}`,
        `paramCount: ${mp.paramCount}`,
        `language: ${cypherStr(mp.language)}`,
      )
      break
    }
    case NodeLabel.Function: {
      const fp = p as FunctionNodeProperties
      entries.push(
        `filePath: ${cypherStr(fp.filePath)}`,
        `startLine: ${fp.startLine}`,
        `endLine: ${fp.endLine}`,
        `isAsync: ${fp.isAsync}`,
        `isExported: ${fp.isExported}`,
        `returnType: ${cypherStr(fp.returnType)}`,
        `paramCount: ${fp.paramCount}`,
        `language: ${cypherStr(fp.language)}`,
      )
      break
    }
    case NodeLabel.Field: {
      const fp = p as FieldNodeProperties
      entries.push(
        `filePath: ${cypherStr(fp.filePath)}`,
        `startLine: ${fp.startLine}`,
        `visibility: ${cypherStr(fp.visibility)}`,
        `isStatic: ${fp.isStatic}`,
        `fieldType: ${cypherStr(fp.fieldType)}`,
        `language: ${cypherStr(fp.language)}`,
      )
      break
    }
    case NodeLabel.Section: {
      const sp = p as SectionNodeProperties
      entries.push(
        `heading: ${cypherStr(sp.heading)}`,
        `level: ${sp.level}`,
        `filePath: ${cypherStr(sp.filePath)}`,
        `startLine: ${sp.startLine}`,
        `endLine: ${sp.endLine}`,
      )
      break
    }
    case NodeLabel.Package: {
      const pp = p as PackageNodeProperties
      entries.push(`packageName: ${cypherStr(pp.packageName)}`)
      break
    }
  }

  return `{${entries.join(', ')}}`
}

function relToPropsStr(rel: GraphRelationship): string {
  switch (rel.type) {
    case RelationshipType.CALLS: {
      const cp = rel.properties as CallsRelationshipProperties
      return ` {confidence: ${cp.confidence}}`
    }
    case RelationshipType.IMPORTS: {
      const ip = rel.properties as ImportsRelationshipProperties
      return ` {importPath: ${cypherStr(ip.importPath)}}`
    }
    default:
      return ''
  }
}

export async function writeCypher(graph: KnowledgeGraph, outputDir: string): Promise<string[]> {
  mkdirSync(outputDir, { recursive: true })

  const nodesFile = join(outputDir, 'cypher_nodes.txt')
  const relsFile = join(outputDir, 'cypher_rels.txt')

  const nodesStream = createWriteStream(nodesFile, { encoding: 'utf-8' })
  const relsStream = createWriteStream(relsFile, { encoding: 'utf-8' })

  nodesStream.write('// CodeNexus — Node MERGE statements\n// Run this file first, then cypher_rels.txt\n\n')
  relsStream.write('// CodeNexus — Relationship MERGE statements\n// Run AFTER cypher_nodes.txt\n\n')

  // Write nodes in batches grouped by label
  const nodesByLabel = new Map<string, GraphNode[]>()
  for (const node of graph.nodes.values()) {
    const arr = nodesByLabel.get(node.label) ?? []
    arr.push(node)
    nodesByLabel.set(node.label, arr)
  }

  for (const [label, nodes] of nodesByLabel) {
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE)
      nodesStream.write(`// ${label} batch ${Math.floor(i / BATCH_SIZE) + 1}\n`)
      for (const node of batch) {
        const props = nodeToProps(node)
        nodesStream.write(`MERGE (n:${label} {nodeId: ${cypherStr(node.properties.nodeId)}}) SET n += ${props};\n`)
      }
      nodesStream.write('\n')
    }
  }

  // Write relationships in batches grouped by type
  const relsByType = new Map<string, GraphRelationship[]>()
  for (const rel of graph.relationships.values()) {
    const arr = relsByType.get(rel.type) ?? []
    arr.push(rel)
    relsByType.set(rel.type, arr)
  }

  for (const [type, rels] of relsByType) {
    for (let i = 0; i < rels.length; i += BATCH_SIZE) {
      const batch = rels.slice(i, i + BATCH_SIZE)
      relsStream.write(`// ${type} batch ${Math.floor(i / BATCH_SIZE) + 1}\n`)
      for (const rel of batch) {
        const relProps = relToPropsStr(rel)
        relsStream.write(
          `MATCH (a {nodeId: ${cypherStr(rel.startNodeId)}}), (b {nodeId: ${cypherStr(rel.endNodeId)}}) MERGE (a)-[:${type}${relProps}]->(b);\n`
        )
      }
      relsStream.write('\n')
    }
  }

  await Promise.all([
    new Promise<void>((r) => nodesStream.end(r)),
    new Promise<void>((r) => relsStream.end(r)),
  ])

  return [nodesFile, relsFile]
}
