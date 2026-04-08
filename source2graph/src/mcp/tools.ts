import type { GraphStore } from './graph-store.js'
import { NodeLabel, RelationshipType } from '../shared/graph-types.js'
import type { GraphNode } from '../shared/graph-types.js'

function nodeToJson(node: GraphNode) {
  return { label: node.label, ...node.properties }
}

/** Resolve callers or callees up to `depth` hops. */
function traverseCalls(
  store: GraphStore,
  startId: string,
  direction: 'callers' | 'callees',
  depth: number,
): GraphNode[] {
  const graph = store.getGraph()
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

export function buildTools(store: GraphStore) {
  return {

    // ── analyze ────────────────────────────────────────────────────────────────
    async analyze(args: { paths: string }): Promise<string> {
      if (!args.paths) return 'Error: paths is required'
      const pathList = args.paths.split(',').map((p) => p.trim()).filter(Boolean)
      if (pathList.length === 0) return 'Error: paths is required'
      try {
        const state = await store.analyze(pathList)
        return JSON.stringify({
          success: true,
          repoPaths: state.repoPaths,
          analyzedAt: state.analyzedAt,
          nodes: state.nodeCount,
          relationships: state.relationshipCount,
        }, null, 2)
      } catch (err) {
        return `Error: ${err}`
      }
    },

    // ── query_nodes ────────────────────────────────────────────────────────────
    query_nodes(args: { label?: string; namePattern?: string; filePath?: string; limit?: number }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()
      const limit = args.limit ?? 50
      const pattern = args.namePattern ? new RegExp(args.namePattern, 'i') : null

      const results: GraphNode[] = []
      for (const node of graph.nodes.values()) {
        if (args.label && node.label !== args.label) continue
        if (pattern && !pattern.test(node.properties.name)) continue
        if (args.filePath) {
          const fp = (node.properties as unknown as Record<string, unknown>).filePath as string | undefined
          if (!fp?.includes(args.filePath)) continue
        }
        results.push(node)
        if (results.length >= limit) break
      }

      return JSON.stringify(results.map(nodeToJson), null, 2)
    },

    // ── get_callers ────────────────────────────────────────────────────────────
    get_callers(args: { symbolName: string; depth?: number }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()
      const depth = args.depth ?? 1

      const targets = [...graph.nodes.values()].filter((n) => n.properties.name === args.symbolName)
      if (targets.length === 0) return JSON.stringify({ error: `Symbol "${args.symbolName}" not found` })

      const allCallers: GraphNode[] = []
      for (const target of targets) {
        allCallers.push(...traverseCalls(store, target.properties.nodeId, 'callers', depth))
      }
      const unique = [...new Map(allCallers.map((n) => [n.properties.nodeId, n])).values()]
      return JSON.stringify(unique.map(nodeToJson), null, 2)
    },

    // ── get_callees ────────────────────────────────────────────────────────────
    get_callees(args: { symbolName: string; depth?: number }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()
      const depth = args.depth ?? 1

      const targets = [...graph.nodes.values()].filter((n) => n.properties.name === args.symbolName)
      if (targets.length === 0) return JSON.stringify({ error: `Symbol "${args.symbolName}" not found` })

      const allCallees: GraphNode[] = []
      for (const target of targets) {
        allCallees.push(...traverseCalls(store, target.properties.nodeId, 'callees', depth))
      }
      const unique = [...new Map(allCallees.map((n) => [n.properties.nodeId, n])).values()]
      return JSON.stringify(unique.map(nodeToJson), null, 2)
    },

    // ── get_context ────────────────────────────────────────────────────────────
    get_context(args: { symbolName: string }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()

      const targets = [...graph.nodes.values()].filter((n) => n.properties.name === args.symbolName)
      if (targets.length === 0) return JSON.stringify({ error: `Symbol "${args.symbolName}" not found` })

      const target = targets[0]
      const id = target.properties.nodeId

      const outgoing = graph.getRelationshipsByStartNode(id)
      const incoming = graph.getRelationshipsByEndNode(id)

      const resolve = (nodeId: string) => {
        const n = graph.getNode(nodeId)
        return n ? nodeToJson(n) : { nodeId }
      }

      const context = {
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
        callers: traverseCalls(store, id, 'callers', 1).map(nodeToJson),
        callees: traverseCalls(store, id, 'callees', 1).map(nodeToJson),
        imports: outgoing
          .filter((r) => r.type === RelationshipType.IMPORTS)
          .map((r) => resolve(r.endNodeId)),
      }

      return JSON.stringify(context, null, 2)
    },
  }
}
