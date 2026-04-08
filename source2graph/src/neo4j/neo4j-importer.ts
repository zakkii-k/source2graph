import neo4j, { type Driver, type Session } from 'neo4j-driver'
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
  CallsRelationshipProperties,
  ImportsRelationshipProperties,
  ReferencesRelationshipProperties,
} from '../shared/graph-types.js'

export interface Neo4jConfig {
  uri: string
  user: string
  password: string
  database?: string
}

const BATCH_SIZE = 200

async function runBatched<T>(
  session: Session,
  items: T[],
  cypher: string,
  paramsFn: (item: T) => Record<string, unknown>,
  label: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    await session.run(
      `UNWIND $rows AS row ${cypher}`,
      { rows: batch.map(paramsFn) },
    )
    onProgress?.(Math.min(i + BATCH_SIZE, items.length), items.length)
  }
}

function nodeParams(node: GraphNode): Record<string, unknown> {
  const p = node.properties as unknown as Record<string, unknown>
  return { ...p, _label: node.label }
}

function relParams(rel: GraphRelationship): Record<string, unknown> {
  const p = rel.properties as unknown as Record<string, unknown>
  return { startId: rel.startNodeId, endId: rel.endNodeId, ...p }
}

export class Neo4jImporter {
  private driver: Driver

  constructor(private config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
    )
  }

  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity()
  }

  async applySchema(session: Session): Promise<void> {
    const constraints = [
      `CREATE CONSTRAINT cn_file      IF NOT EXISTS FOR (n:File)      REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_folder    IF NOT EXISTS FOR (n:Folder)    REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_class     IF NOT EXISTS FOR (n:Class)     REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_interface IF NOT EXISTS FOR (n:Interface) REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_method    IF NOT EXISTS FOR (n:Method)    REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_function  IF NOT EXISTS FOR (n:Function)  REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_field     IF NOT EXISTS FOR (n:Field)     REQUIRE n.nodeId IS UNIQUE`,
      `CREATE CONSTRAINT cn_section   IF NOT EXISTS FOR (n:Section)   REQUIRE n.nodeId IS UNIQUE`,
    ]
    for (const c of constraints) {
      await session.run(c)
    }
  }

  /** Import (or merge) a knowledge graph into Neo4j. */
  async importGraph(
    graph: KnowledgeGraph,
    options: { clearFirst?: boolean; onProgress?: (phase: string, done: number, total: number) => void } = {},
  ): Promise<{ nodesImported: number; relsImported: number }> {
    const { clearFirst = false, onProgress } = options
    const db = this.config.database ?? 'neo4j'
    const session = this.driver.session({ database: db })

    try {
      if (clearFirst) {
        process.stderr.write('  Clearing existing graph...\n')
        await session.run('MATCH (n) DETACH DELETE n')
      }

      await this.applySchema(session)

      // ── Nodes (grouped by label) ──────────────────────────────────────────
      const nodesByLabel = new Map<string, GraphNode[]>()
      for (const node of graph.nodes.values()) {
        const arr = nodesByLabel.get(node.label) ?? []
        arr.push(node)
        nodesByLabel.set(node.label, arr)
      }

      let nodesImported = 0
      for (const [label, nodes] of nodesByLabel) {
        const total = nodes.length
        await runBatched(
          session,
          nodes,
          `MERGE (n:${label} {nodeId: row.nodeId}) SET n += row`,
          nodeParams,
          label,
          (done) => {
            nodesImported = done
            onProgress?.('nodes', done, total)
          },
        )
        nodesImported += nodes.length
      }

      // ── Relationships (grouped by type) ───────────────────────────────────
      const relsByType = new Map<string, GraphRelationship[]>()
      for (const rel of graph.relationships.values()) {
        const arr = relsByType.get(rel.type) ?? []
        arr.push(rel)
        relsByType.set(rel.type, arr)
      }

      let relsImported = 0
      for (const [type, rels] of relsByType) {
        await runBatched(
          session,
          rels,
          `MATCH (a {nodeId: row.startId}), (b {nodeId: row.endId})
           MERGE (a)-[r:${type}]->(b)
           SET r += row { .* , startId: null, endId: null }`,
          relParams,
          type,
          (done) => onProgress?.(type, done, rels.length),
        )
        relsImported += rels.length
      }

      return { nodesImported: graph.nodeCount(), relsImported: graph.relationshipCount() }
    } finally {
      await session.close()
    }
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}
