import neo4j, { type Driver, type Session, type Node as Neo4jNode } from 'neo4j-driver'
import type { GraphNode } from '../../shared/graph-types.js'
import type { Neo4jConfig } from '../../neo4j/neo4j-importer.js'
import type { GraphBackend, ContextResult } from './graph-backend.js'

function toGraphNode(node: Neo4jNode | null | undefined): GraphNode | null {
  if (!node || !node.labels?.length) return null
  return {
    label: node.labels[0] as GraphNode['label'],
    properties: node.properties as unknown as GraphNode['properties'],
  }
}

function nodeToJson(node: GraphNode): Record<string, unknown> {
  return { label: node.label, ...node.properties as unknown as Record<string, unknown> }
}

function toNodes(arr: (Neo4jNode | null | undefined)[]): Record<string, unknown>[] {
  return arr
    .map(toGraphNode)
    .filter((n): n is GraphNode => n !== null)
    .map(nodeToJson)
}

export class Neo4jBackend implements GraphBackend {
  private driver: Driver
  private database: string

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      { disableLosslessIntegers: true },
    )
    this.database = config.database ?? 'neo4j'
  }

  private openSession(): Session {
    return this.driver.session({ database: this.database })
  }

  async queryNodes(args: { label?: string; namePattern?: string; filePath?: string; limit?: number }): Promise<GraphNode[]> {
    const limit = args.limit ?? 50
    const params: Record<string, unknown> = { limit }
    const wheres: string[] = []

    if (args.namePattern) {
      wheres.push('n.name =~ $namePattern')
      // Wrap in (?i).*…* so it behaves like JS RegExp "contains, case-insensitive"
      params.namePattern = `(?i).*${args.namePattern}.*`
    }
    if (args.filePath) {
      wheres.push('n.filePath CONTAINS $filePath')
      params.filePath = args.filePath
    }

    const matchClause = args.label ? `(n:${args.label})` : `(n)`
    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''
    const cypher = `MATCH ${matchClause} ${whereClause} RETURN n LIMIT $limit`

    const session = this.openSession()
    try {
      const result = await session.run(cypher, params)
      return result.records
        .map((r) => toGraphNode(r.get('n')))
        .filter((n): n is GraphNode => n !== null)
    } finally {
      await session.close()
    }
  }

  async getCallers(symbolName: string, depth: number): Promise<GraphNode[]> {
    const cypher = `
      MATCH (caller)-[:CALLS*1..${depth}]->(target)
      WHERE target.name = $symbolName
      RETURN DISTINCT caller
    `
    const session = this.openSession()
    try {
      const result = await session.run(cypher, { symbolName })
      return result.records
        .map((r) => toGraphNode(r.get('caller')))
        .filter((n): n is GraphNode => n !== null)
    } finally {
      await session.close()
    }
  }

  async getCallees(symbolName: string, depth: number): Promise<GraphNode[]> {
    const cypher = `
      MATCH (target)-[:CALLS*1..${depth}]->(callee)
      WHERE target.name = $symbolName
      RETURN DISTINCT callee
    `
    const session = this.openSession()
    try {
      const result = await session.run(cypher, { symbolName })
      return result.records
        .map((r) => toGraphNode(r.get('callee')))
        .filter((n): n is GraphNode => n !== null)
    } finally {
      await session.close()
    }
  }

  async getContext(symbolName: string): Promise<ContextResult | { error: string }> {
    // Pattern comprehensions return arrays of nodes directly
    const cypher = `
      MATCH (target) WHERE target.name = $symbolName
      WITH target LIMIT 1
      RETURN target,
        [(c)-[:CONTAINS|HAS_METHOD]->(target) | c] AS containers,
        [(target)-[:HAS_METHOD]->(m) | m]         AS methods,
        [(target)-[:HAS_PROPERTY]->(f) | f]       AS fields,
        [(target)-[:EXTENDS]->(e) | e]             AS exts,
        [(target)-[:IMPLEMENTS]->(i) | i]          AS impls,
        [(caller)-[:CALLS]->(target) | caller]     AS callers,
        [(target)-[:CALLS]->(callee) | callee]     AS callees,
        [(target)-[:IMPORTS]->(imp) | imp]         AS imports
    `
    const session = this.openSession()
    try {
      const result = await session.run(cypher, { symbolName })
      if (result.records.length === 0) return { error: `Symbol "${symbolName}" not found` }

      const r = result.records[0]
      const target = toGraphNode(r.get('target'))
      if (!target) return { error: `Symbol "${symbolName}" not found` }

      return {
        symbol: nodeToJson(target),
        container: toNodes(r.get('containers')),
        methods: toNodes(r.get('methods')),
        fields: toNodes(r.get('fields')),
        extends: toNodes(r.get('exts')),
        implements: toNodes(r.get('impls')),
        callers: toNodes(r.get('callers')),
        callees: toNodes(r.get('callees')),
        imports: toNodes(r.get('imports')),
      }
    } finally {
      await session.close()
    }
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}
