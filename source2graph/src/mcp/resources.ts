import type { GraphStore } from './graph-store.js'
import { NodeLabel, RelationshipType } from '../shared/graph-types.js'

export function buildResources(store: GraphStore) {

  function schemaResource() {
    return JSON.stringify({
      nodeLabels: Object.values(NodeLabel),
      relationshipTypes: Object.values(RelationshipType),
      nodeProperties: {
        File:      ['nodeId', 'name', 'filePath', 'language', 'extension'],
        Folder:    ['nodeId', 'name', 'folderPath'],
        Class:     ['nodeId', 'name', 'qualifiedName', 'filePath', 'startLine', 'endLine', 'visibility', 'isAbstract', 'isStatic', 'language'],
        Interface: ['nodeId', 'name', 'qualifiedName', 'filePath', 'startLine', 'endLine', 'visibility', 'language'],
        Method:    ['nodeId', 'name', 'qualifiedName', 'filePath', 'startLine', 'endLine', 'visibility', 'isStatic', 'isAsync', 'returnType', 'paramCount', 'language'],
        Function:  ['nodeId', 'name', 'filePath', 'startLine', 'endLine', 'isAsync', 'isExported', 'returnType', 'paramCount', 'language'],
        Field:     ['nodeId', 'name', 'filePath', 'startLine', 'visibility', 'isStatic', 'fieldType', 'language'],
        Section:   ['nodeId', 'name', 'heading', 'level', 'filePath', 'startLine', 'endLine'],
      },
      relationshipProperties: {
        CALLS:      ['confidence: float (0.5–1.0)'],
        IMPORTS:    ['importPath: string'],
        REFERENCES: ['linkText: string', 'approach: string'],
      },
    }, null, 2)
  }

  function statsResource() {
    if (!store.isReady()) return JSON.stringify({ error: 'No graph loaded' })
    const graph = store.getGraph()
    const state = store.getState()!

    const nodeCounts: Record<string, number> = {}
    for (const node of graph.nodes.values()) {
      nodeCounts[node.label] = (nodeCounts[node.label] ?? 0) + 1
    }

    const relCounts: Record<string, number> = {}
    for (const rel of graph.relationships.values()) {
      relCounts[rel.type] = (relCounts[rel.type] ?? 0) + 1
    }

    return JSON.stringify({
      repoPaths: state.repoPaths,
      analyzedAt: state.analyzedAt,
      totals: { nodes: graph.nodeCount(), relationships: graph.relationshipCount() },
      nodesByLabel: nodeCounts,
      relationshipsByType: relCounts,
    }, null, 2)
  }

  function nodesByLabelResource(label: string) {
    if (!store.isReady()) return JSON.stringify({ error: 'No graph loaded' })
    const graph = store.getGraph()
    const nodes = [...graph.nodes.values()]
      .filter((n) => n.label === label)
      .map((n) => ({ label: n.label, ...n.properties }))
    return JSON.stringify(nodes, null, 2)
  }

  return { schemaResource, statsResource, nodesByLabelResource }
}
