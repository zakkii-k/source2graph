import type { KnowledgeGraph, GraphNode } from '../../shared/graph-types.js'
import { RelationshipType } from '../../shared/graph-types.js'
import type { GraphBackend, ContextResult } from './graph-backend.js'

function nodeToJson(node: GraphNode): Record<string, unknown> {
  return { label: node.label, ...node.properties as unknown as Record<string, unknown> }
}

function traverseCalls(
  graph: KnowledgeGraph,
  startId: string,
  direction: 'callers' | 'callees',
  depth: number,
): GraphNode[] {
  const visited = new Set<string>()
  const results: GraphNode[] = []

  function visit(nodeId: string, remaining: number) {
    if (remaining === 0 || visited.has(nodeId)) return
    visited.add(nodeId)

    const rels = direction === 'callees'
      ? graph.getRelationshipsByStartNode(nodeId).filter((r) => r.type === RelationshipType.CALLS)
      : graph.getRelationshipsByEndNode(nodeId).filter((r) => r.type === RelationshipType.CALLS)

    for (const rel of rels) {
      const targetId = direction === 'callees' ? rel.endNodeId : rel.startNodeId
      const targetNode = graph.getNode(targetId)
      if (targetNode && !visited.has(targetId)) {
        results.push(targetNode)
        visit(targetId, remaining - 1)
      }
    }
  }

  visit(startId, depth)
  return results
}

export class InMemoryBackend implements GraphBackend {
  constructor(private graph: KnowledgeGraph) {}

  async queryNodes(args: { label?: string; namePattern?: string; filePath?: string; limit?: number }): Promise<GraphNode[]> {
    const limit = args.limit ?? 50
    const pattern = args.namePattern ? new RegExp(args.namePattern, 'i') : null
    const results: GraphNode[] = []

    for (const node of this.graph.nodes.values()) {
      if (args.label && node.label !== args.label) continue
      if (pattern && !pattern.test(node.properties.name)) continue
      if (args.filePath) {
        const fp = (node.properties as unknown as Record<string, unknown>).filePath as string | undefined
        if (!fp?.includes(args.filePath)) continue
      }
      results.push(node)
      if (results.length >= limit) break
    }

    return results
  }

  async getCallers(symbolName: string, depth: number): Promise<GraphNode[]> {
    const targets = [...this.graph.nodes.values()].filter((n) => n.properties.name === symbolName)
    const all: GraphNode[] = []
    for (const target of targets) {
      all.push(...traverseCalls(this.graph, target.properties.nodeId, 'callers', depth))
    }
    return [...new Map(all.map((n) => [n.properties.nodeId, n])).values()]
  }

  async getCallees(symbolName: string, depth: number): Promise<GraphNode[]> {
    const targets = [...this.graph.nodes.values()].filter((n) => n.properties.name === symbolName)
    const all: GraphNode[] = []
    for (const target of targets) {
      all.push(...traverseCalls(this.graph, target.properties.nodeId, 'callees', depth))
    }
    return [...new Map(all.map((n) => [n.properties.nodeId, n])).values()]
  }

  async getContext(symbolName: string): Promise<ContextResult | { error: string }> {
    const targets = [...this.graph.nodes.values()].filter((n) => n.properties.name === symbolName)
    if (targets.length === 0) return { error: `Symbol "${symbolName}" not found` }

    const target = targets[0]
    const id = target.properties.nodeId
    const outgoing = this.graph.getRelationshipsByStartNode(id)
    const incoming = this.graph.getRelationshipsByEndNode(id)

    const resolve = (nodeId: string): Record<string, unknown> => {
      const n = this.graph.getNode(nodeId)
      return n ? nodeToJson(n) : { nodeId }
    }

    return {
      symbol: nodeToJson(target),
      container: incoming
        .filter((r) => r.type === RelationshipType.CONTAINS || r.type === RelationshipType.HAS_METHOD)
        .map((r) => resolve(r.startNodeId)),
      methods: outgoing
        .filter((r) => r.type === RelationshipType.HAS_METHOD)
        .map((r) => resolve(r.endNodeId)),
      fields: outgoing
        .filter((r) => r.type === RelationshipType.HAS_PROPERTY)
        .map((r) => resolve(r.endNodeId)),
      extends: outgoing
        .filter((r) => r.type === RelationshipType.EXTENDS)
        .map((r) => resolve(r.endNodeId)),
      implements: outgoing
        .filter((r) => r.type === RelationshipType.IMPLEMENTS)
        .map((r) => resolve(r.endNodeId)),
      callers: traverseCalls(this.graph, id, 'callers', 1).map(nodeToJson),
      callees: traverseCalls(this.graph, id, 'callees', 1).map(nodeToJson),
      imports: outgoing
        .filter((r) => r.type === RelationshipType.IMPORTS)
        .map((r) => resolve(r.endNodeId)),
    }
  }

  async close(): Promise<void> {
    // no-op
  }
}
