import type { GraphStore } from './graph-store.js'
import type { GraphNode } from '../shared/graph-types.js'

function nodeToJson(node: GraphNode) {
  return { label: node.label, ...node.properties as unknown as Record<string, unknown> }
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
          backend: state.backend,
        }, null, 2)
      } catch (err) {
        return `Error: ${err}`
      }
    },

    // ── query_nodes ────────────────────────────────────────────────────────────
    async query_nodes(args: { label?: string; namePattern?: string; filePath?: string; limit?: number }): Promise<string> {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const results = await store.getBackend().queryNodes(args)
      return JSON.stringify(results.map(nodeToJson), null, 2)
    },

    // ── get_callers ────────────────────────────────────────────────────────────
    async get_callers(args: { symbolName: string; depth?: number }): Promise<string> {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const depth = args.depth ?? 1
      const results = await store.getBackend().getCallers(args.symbolName, depth)
      if (results.length === 0) return JSON.stringify({ error: `Symbol "${args.symbolName}" not found` })
      return JSON.stringify(results.map(nodeToJson), null, 2)
    },

    // ── get_callees ────────────────────────────────────────────────────────────
    async get_callees(args: { symbolName: string; depth?: number }): Promise<string> {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const depth = args.depth ?? 1
      const results = await store.getBackend().getCallees(args.symbolName, depth)
      if (results.length === 0) return JSON.stringify({ error: `Symbol "${args.symbolName}" not found` })
      return JSON.stringify(results.map(nodeToJson), null, 2)
    },

    // ── get_context ────────────────────────────────────────────────────────────
    async get_context(args: { symbolName: string }): Promise<string> {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const context = await store.getBackend().getContext(args.symbolName)
      return JSON.stringify(context, null, 2)
    },
  }
}
