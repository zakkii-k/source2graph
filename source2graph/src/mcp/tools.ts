import type { GraphStore } from './graph-store.js'
import { NodeLabel, RelationshipType } from '../shared/graph-types.js'
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

    // ── get_crud_matrix ────────────────────────────────────────────────────────
    get_crud_matrix(args: { mapperName?: string }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()

      // Collect all SqlStatement nodes and their CRUD edges to Table nodes
      type MatrixRow = { mapper: string; method: string; table: string; operations: string[] }
      const rows = new Map<string, MatrixRow>()

      for (const node of graph.nodes.values()) {
        if (node.label !== NodeLabel.SqlStatement) continue
        const props = node.properties as unknown as Record<string, unknown>
        const namespace = props.mapperNamespace as string ?? ''
        const statementId = props.statementId as string ?? ''
        const operation = props.operation as string ?? ''

        // Filter by mapperName if provided
        if (args.mapperName) {
          const ifaceName = namespace.split('.').pop() ?? namespace
          if (!ifaceName.toLowerCase().includes(args.mapperName.toLowerCase())) continue
        }

        // Find CRUD edges to Table nodes
        const crudEdges = graph.getRelationshipsByStartNode(node.properties.nodeId).filter((r) =>
          r.type === RelationshipType.CRUD_CREATES ||
          r.type === RelationshipType.CRUD_READS ||
          r.type === RelationshipType.CRUD_UPDATES ||
          r.type === RelationshipType.CRUD_DELETES,
        )

        for (const edge of crudEdges) {
          const tableNode = graph.getNode(edge.endNodeId)
          if (!tableNode || tableNode.label !== NodeLabel.Table) continue
          const tableName = tableNode.properties.name

          const key = `${namespace}#${statementId}#${tableName}`
          if (!rows.has(key)) {
            rows.set(key, { mapper: namespace, method: statementId, table: tableName, operations: [] })
          }
          const row = rows.get(key)!
          if (!row.operations.includes(operation)) row.operations.push(operation)
        }
      }

      return JSON.stringify([...rows.values()], null, 2)
    },

    // ── find_unused_mapper_methods ─────────────────────────────────────────────
    find_unused_mapper_methods(args: Record<string, never>): string {
      void args
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()

      const unused: Array<Record<string, unknown>> = []

      for (const node of graph.nodes.values()) {
        if (node.label !== NodeLabel.Method) continue
        const props = node.properties as unknown as Record<string, unknown>
        if (!props.isMybatisGenerated) continue

        // Check if any CALLS edge points to this method
        const callers = graph.getRelationshipsByEndNode(node.properties.nodeId)
          .filter((r) => r.type === RelationshipType.CALLS)

        if (callers.length === 0) {
          unused.push({
            method: props.name,
            qualifiedName: props.qualifiedName,
            crudOperation: props.crudOperation ?? null,
            filePath: props.filePath,
          })
        }
      }

      return JSON.stringify(unused, null, 2)
    },

    // ── get_index_candidates ───────────────────────────────────────────────────
    get_index_candidates(args: { tableName?: string }): string {
      if (!store.isReady()) return 'Error: No graph loaded. Run analyze first.'
      const graph = store.getGraph()

      // column usage count: "table::column" → { count, statements[] }
      const columnUsage = new Map<string, { table: string; column: string; count: number; statements: string[] }>()

      for (const rel of graph.relationships.values()) {
        if (rel.type !== RelationshipType.FILTERS_BY) continue

        const tableNode = graph.getNode(rel.endNodeId)
        if (!tableNode || tableNode.label !== NodeLabel.Table) continue
        const tableName = tableNode.properties.name

        if (args.tableName && !tableName.toLowerCase().includes(args.tableName.toLowerCase())) continue

        const stmtNode = graph.getNode(rel.startNodeId)
        const stmtId = stmtNode ? (stmtNode.properties as unknown as Record<string, unknown>).statementId as string ?? '' : rel.startNodeId

        const props = rel.properties as unknown as Record<string, unknown>
        const columnsStr = props.columns as string ?? ''
        for (const col of columnsStr.split(',').map((c: string) => c.trim()).filter(Boolean)) {
          const key = `${tableName}::${col}`
          if (!columnUsage.has(key)) columnUsage.set(key, { table: tableName, column: col, count: 0, statements: [] })
          const entry = columnUsage.get(key)!
          entry.count++
          if (!entry.statements.includes(stmtId)) entry.statements.push(stmtId)
        }
      }

      const results = [...columnUsage.values()].sort((a, b) => b.count - a.count)
      return JSON.stringify(results, null, 2)
    },
  }
}
