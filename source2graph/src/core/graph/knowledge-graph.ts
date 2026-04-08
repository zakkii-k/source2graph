import type { GraphNode, GraphRelationship, KnowledgeGraph } from '../../shared/graph-types.js'

export function createKnowledgeGraph(): KnowledgeGraph {
  const nodes = new Map<string, GraphNode>()
  const relationships = new Map<string, GraphRelationship>()

  // Index: nodeId -> outgoing relationships
  const outgoing = new Map<string, GraphRelationship[]>()
  // Index: nodeId -> incoming relationships
  const incoming = new Map<string, GraphRelationship[]>()

  return {
    nodes,
    relationships,

    addNode(node: GraphNode): void {
      nodes.set(node.properties.nodeId, node)
    },

    addRelationship(rel: GraphRelationship): void {
      if (relationships.has(rel.properties.relId)) return

      relationships.set(rel.properties.relId, rel)

      if (!outgoing.has(rel.startNodeId)) outgoing.set(rel.startNodeId, [])
      outgoing.get(rel.startNodeId)!.push(rel)

      if (!incoming.has(rel.endNodeId)) incoming.set(rel.endNodeId, [])
      incoming.get(rel.endNodeId)!.push(rel)
    },

    getNode(nodeId: string): GraphNode | undefined {
      return nodes.get(nodeId)
    },

    getRelationshipsByStartNode(nodeId: string): GraphRelationship[] {
      return outgoing.get(nodeId) ?? []
    },

    getRelationshipsByEndNode(nodeId: string): GraphRelationship[] {
      return incoming.get(nodeId) ?? []
    },

    nodeCount(): number {
      return nodes.size
    },

    relationshipCount(): number {
      return relationships.size
    },
  }
}
