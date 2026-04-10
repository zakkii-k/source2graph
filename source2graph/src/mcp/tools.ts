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
