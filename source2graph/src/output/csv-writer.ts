import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import type { Writable } from 'stream'
import type { KnowledgeGraph, GraphNode, GraphRelationship } from '../shared/graph-types.js'
import { NodeLabel, RelationshipType } from '../shared/graph-types.js'
import { toCsvLine } from '../shared/utils.js'
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

// ---------------------------------------------------------------------------
// CSV header definitions per label / type
// ---------------------------------------------------------------------------

const NODE_HEADERS: Record<string, string> = {
  [NodeLabel.File]:      'nodeId:ID,name:string,filePath:string,language:string,extension:string,:LABEL',
  [NodeLabel.Folder]:    'nodeId:ID,name:string,folderPath:string,:LABEL',
  [NodeLabel.Class]:     'nodeId:ID,name:string,qualifiedName:string,filePath:string,startLine:int,endLine:int,visibility:string,isAbstract:boolean,isStatic:boolean,language:string,:LABEL',
  [NodeLabel.Interface]: 'nodeId:ID,name:string,qualifiedName:string,filePath:string,startLine:int,endLine:int,visibility:string,language:string,:LABEL',
  [NodeLabel.Method]:    'nodeId:ID,name:string,qualifiedName:string,filePath:string,startLine:int,endLine:int,visibility:string,isStatic:boolean,isAsync:boolean,returnType:string,paramCount:int,language:string,:LABEL',
  [NodeLabel.Function]:  'nodeId:ID,name:string,filePath:string,startLine:int,endLine:int,isAsync:boolean,isExported:boolean,returnType:string,paramCount:int,language:string,:LABEL',
  [NodeLabel.Field]:     'nodeId:ID,name:string,filePath:string,startLine:int,visibility:string,isStatic:boolean,fieldType:string,language:string,:LABEL',
  [NodeLabel.Section]:   'nodeId:ID,name:string,heading:string,level:int,filePath:string,startLine:int,endLine:int,:LABEL',
  [NodeLabel.Package]:   'nodeId:ID,name:string,packageName:string,:LABEL',
}

const REL_HEADERS: Record<string, string> = {
  [RelationshipType.CONTAINS]:     ':START_ID,:END_ID,:TYPE',
  [RelationshipType.HAS_METHOD]:   ':START_ID,:END_ID,:TYPE',
  [RelationshipType.HAS_PROPERTY]: ':START_ID,:END_ID,:TYPE',
  [RelationshipType.CALLS]:        ':START_ID,:END_ID,:TYPE,confidence:float',
  [RelationshipType.EXTENDS]:      ':START_ID,:END_ID,:TYPE',
  [RelationshipType.IMPLEMENTS]:   ':START_ID,:END_ID,:TYPE',
  [RelationshipType.IMPORTS]:      ':START_ID,:END_ID,:TYPE,importPath:string',
  [RelationshipType.REFERENCES]:   ':START_ID,:END_ID,:TYPE,linkText:string,approach:string',
  [RelationshipType.DOCUMENTS]:    ':START_ID,:END_ID,:TYPE',
}

// ---------------------------------------------------------------------------
// Row serializers
// ---------------------------------------------------------------------------

function nodeToRow(node: GraphNode): string {
  const p = node.properties
  switch (node.label) {
    case NodeLabel.File: {
      const fp = p as FileNodeProperties
      return toCsvLine([fp.nodeId, fp.name, fp.filePath, fp.language, fp.extension, NodeLabel.File])
    }
    case NodeLabel.Folder: {
      const fp = p as FolderNodeProperties
      return toCsvLine([fp.nodeId, fp.name, fp.folderPath, NodeLabel.Folder])
    }
    case NodeLabel.Class: {
      const cp = p as ClassNodeProperties
      return toCsvLine([cp.nodeId, cp.name, cp.qualifiedName, cp.filePath, cp.startLine, cp.endLine, cp.visibility, cp.isAbstract, cp.isStatic, cp.language, NodeLabel.Class])
    }
    case NodeLabel.Interface: {
      const ip = p as InterfaceNodeProperties
      return toCsvLine([ip.nodeId, ip.name, ip.qualifiedName, ip.filePath, ip.startLine, ip.endLine, ip.visibility, ip.language, NodeLabel.Interface])
    }
    case NodeLabel.Method: {
      const mp = p as MethodNodeProperties
      return toCsvLine([mp.nodeId, mp.name, mp.qualifiedName, mp.filePath, mp.startLine, mp.endLine, mp.visibility, mp.isStatic, mp.isAsync, mp.returnType, mp.paramCount, mp.language, NodeLabel.Method])
    }
    case NodeLabel.Function: {
      const fp = p as FunctionNodeProperties
      return toCsvLine([fp.nodeId, fp.name, fp.filePath, fp.startLine, fp.endLine, fp.isAsync, fp.isExported, fp.returnType, fp.paramCount, fp.language, NodeLabel.Function])
    }
    case NodeLabel.Field: {
      const fp = p as FieldNodeProperties
      return toCsvLine([fp.nodeId, fp.name, fp.filePath, fp.startLine, fp.visibility, fp.isStatic, fp.fieldType, fp.language, NodeLabel.Field])
    }
    case NodeLabel.Section: {
      const sp = p as SectionNodeProperties
      return toCsvLine([sp.nodeId, sp.name, sp.heading, sp.level, sp.filePath, sp.startLine, sp.endLine, NodeLabel.Section])
    }
    case NodeLabel.Package: {
      const pp = p as PackageNodeProperties
      return toCsvLine([pp.nodeId, pp.name, pp.packageName, NodeLabel.Package])
    }
    default:
      return ''
  }
}

function relToRow(rel: GraphRelationship): string {
  const p = rel.properties
  switch (rel.type) {
    case RelationshipType.CALLS: {
      const cp = p as CallsRelationshipProperties
      return toCsvLine([rel.startNodeId, rel.endNodeId, rel.type, cp.confidence])
    }
    case RelationshipType.IMPORTS: {
      const ip = p as ImportsRelationshipProperties
      return toCsvLine([rel.startNodeId, rel.endNodeId, rel.type, ip.importPath])
    }
    default:
      return toCsvLine([rel.startNodeId, rel.endNodeId, rel.type])
  }
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export async function writeCsv(graph: KnowledgeGraph, outputDir: string): Promise<string[]> {
  mkdirSync(outputDir, { recursive: true })

  const nodeStreams = new Map<string, Writable>()
  const relStreams = new Map<string, Writable>()
  const files: string[] = []

  function getNodeStream(label: string): Writable {
    if (!nodeStreams.has(label)) {
      const filePath = join(outputDir, `nodes_${label}.csv`)
      files.push(filePath)
      const stream = createWriteStream(filePath, { encoding: 'utf-8' })
      stream.write(NODE_HEADERS[label] + '\n')
      nodeStreams.set(label, stream)
    }
    return nodeStreams.get(label)!
  }

  function getRelStream(type: string): Writable {
    if (!relStreams.has(type)) {
      const filePath = join(outputDir, `rels_${type}.csv`)
      files.push(filePath)
      const stream = createWriteStream(filePath, { encoding: 'utf-8' })
      stream.write(REL_HEADERS[type] + '\n')
      relStreams.set(type, stream)
    }
    return relStreams.get(type)!
  }

  for (const node of graph.nodes.values()) {
    const row = nodeToRow(node)
    if (row) getNodeStream(node.label).write(row + '\n')
  }

  for (const rel of graph.relationships.values()) {
    const row = relToRow(rel)
    if (row) getRelStream(rel.type).write(row + '\n')
  }

  // Close all streams
  const closePromises: Promise<void>[] = []
  for (const stream of [...nodeStreams.values(), ...relStreams.values()]) {
    closePromises.push(new Promise((resolve) => {
      stream.end(resolve)
    }))
  }
  await Promise.all(closePromises)

  return files
}
