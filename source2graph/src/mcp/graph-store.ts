/**
 * In-memory graph store for the MCP server.
 * Loads from disk on startup; refreshed when analyze() is called.
 * Automatically switches to a Neo4j backend when edge count exceeds
 * the configured threshold (requires --neo4j-uri etc. on `s2g serve`).
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { KnowledgeGraph, GraphNode, GraphRelationship } from '../shared/graph-types.js'
import { createKnowledgeGraph } from '../core/graph/knowledge-graph.js'
import { runPipeline } from '../core/ingestion/pipeline.js'
import { normalizeFilePath } from '../shared/utils.js'
import { Neo4jImporter, type Neo4jConfig } from '../neo4j/neo4j-importer.js'
import { InMemoryBackend } from './backends/in-memory-backend.js'
import { Neo4jBackend } from './backends/neo4j-backend.js'
import type { GraphBackend } from './backends/graph-backend.js'

export type { Neo4jConfig }

export interface GraphStoreState {
  repoPaths: string[]
  analyzedAt: string
  nodeCount: number
  relationshipCount: number
  backend: 'memory' | 'neo4j'
}

const CACHE_FILENAME = 's2g-graph.json'

interface SerializedGraph {
  nodes: Array<{ label: string; properties: Record<string, unknown> }>
  relationships: Array<{
    type: string
    startNodeId: string
    endNodeId: string
    properties: Record<string, unknown>
  }>
}

function serializeGraph(graph: KnowledgeGraph): SerializedGraph {
  return {
    nodes: [...graph.nodes.values()].map((n) => ({ label: n.label, properties: n.properties as unknown as Record<string, unknown> })),
    relationships: [...graph.relationships.values()].map((r) => ({
      type: r.type,
      startNodeId: r.startNodeId,
      endNodeId: r.endNodeId,
      properties: r.properties as unknown as Record<string, unknown>,
    })),
  }
}

function deserializeGraph(data: SerializedGraph): KnowledgeGraph {
  const graph = createKnowledgeGraph()
  for (const n of data.nodes) {
    graph.addNode({ label: n.label as GraphNode['label'], properties: n.properties as unknown as GraphNode['properties'] })
  }
  for (const r of data.relationships) {
    graph.addRelationship({
      type: r.type as GraphRelationship['type'],
      startNodeId: r.startNodeId,
      endNodeId: r.endNodeId,
      properties: r.properties as unknown as GraphRelationship['properties'],
    })
  }
  return graph
}

export const DEFAULT_NEO4J_THRESHOLD = 50_000

export class GraphStore {
  private graph: KnowledgeGraph = createKnowledgeGraph()
  private state: GraphStoreState | null = null
  private backend: GraphBackend = new InMemoryBackend(this.graph)
  private readonly cacheDir: string
  private readonly neo4jConfig?: Neo4jConfig
  private readonly neo4jThreshold: number

  constructor(cacheDir: string, neo4jConfig?: Neo4jConfig, neo4jThreshold = DEFAULT_NEO4J_THRESHOLD) {
    this.cacheDir = cacheDir
    this.neo4jConfig = neo4jConfig
    this.neo4jThreshold = neo4jThreshold
    mkdirSync(cacheDir, { recursive: true })
  }

  /** Analyze one or more repos, store the result, and select the best backend. */
  async analyze(repos: string | string[]): Promise<GraphStoreState> {
    const paths = Array.isArray(repos) ? repos : [repos]
    const normalized = paths.map(normalizeFilePath)
    const input = normalized.length === 1 ? normalized[0] : normalized.map((p) => ({ root: p }))
    this.graph = await runPipeline(input, { progress: false })

    const backendName = await this._selectBackend()

    this.state = {
      repoPaths: normalized,
      analyzedAt: new Date().toISOString(),
      nodeCount: this.graph.nodeCount(),
      relationshipCount: this.graph.relationshipCount(),
      backend: backendName,
    }

    // Persist graph to disk (always keep JSON cache for fallback)
    const cachePath = join(this.cacheDir, CACHE_FILENAME)
    writeFileSync(cachePath, JSON.stringify({ state: this.state, graph: serializeGraph(this.graph) }), 'utf-8')

    return this.state
  }

  /**
   * Try to load a cached graph from disk. Returns true if successful.
   * Call selectBackend() afterwards to switch to Neo4j if needed.
   */
  loadFromDisk(): boolean {
    const cachePath = join(this.cacheDir, CACHE_FILENAME)
    if (!existsSync(cachePath)) return false
    try {
      const raw = JSON.parse(readFileSync(cachePath, 'utf-8'))
      this.state = raw.state
      this.graph = deserializeGraph(raw.graph)
      this.backend = new InMemoryBackend(this.graph)
      return true
    } catch {
      return false
    }
  }

  /**
   * Select the appropriate backend based on edge count and Neo4j availability.
   * Call this after loadFromDisk() if Neo4j support is desired for cached graphs.
   */
  async selectBackend(): Promise<void> {
    await this._selectBackend()
    if (this.state) {
      this.state.backend = this.backend instanceof Neo4jBackend ? 'neo4j' : 'memory'
    }
  }

  private async _selectBackend(): Promise<'memory' | 'neo4j'> {
    const edgeCount = this.graph.relationshipCount()

    if (this.neo4jConfig && edgeCount > this.neo4jThreshold) {
      try {
        process.stderr.write(
          `[s2g] ${edgeCount} edges > threshold ${this.neo4jThreshold} — importing into Neo4j...\n`,
        )
        const importer = new Neo4jImporter(this.neo4jConfig)
        await importer.verifyConnectivity()
        await importer.importGraph(this.graph, { clearFirst: true })
        await importer.close()

        await this.backend.close()
        this.backend = new Neo4jBackend(this.neo4jConfig)
        process.stderr.write('[s2g] Switched to Neo4j backend.\n')
        return 'neo4j'
      } catch (err) {
        process.stderr.write(`[s2g] Neo4j unavailable, falling back to in-memory: ${err}\n`)
      }
    } else if (this.neo4jConfig) {
      process.stderr.write(
        `[s2g] ${edgeCount} edges ≤ threshold ${this.neo4jThreshold} — using in-memory backend.\n`,
      )
    }

    await this.backend.close()
    this.backend = new InMemoryBackend(this.graph)
    return 'memory'
  }

  getBackend(): GraphBackend {
    return this.backend
  }

  getGraph(): KnowledgeGraph {
    return this.graph
  }

  getState(): GraphStoreState | null {
    return this.state
  }

  isReady(): boolean {
    return this.state !== null && this.graph.nodeCount() > 0
  }

  async close(): Promise<void> {
    await this.backend.close()
  }
}
