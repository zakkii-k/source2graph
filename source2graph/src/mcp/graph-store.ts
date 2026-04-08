/**
 * In-memory graph store for the MCP server.
 * Loads from disk on startup; refreshed when analyze() is called.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { KnowledgeGraph, GraphNode, GraphRelationship } from '../shared/graph-types.js'
import { createKnowledgeGraph } from '../core/graph/knowledge-graph.js'
import { runPipeline } from '../core/ingestion/pipeline.js'
import { normalizeFilePath } from '../shared/utils.js'

export interface GraphStoreState {
  repoPaths: string[]
  analyzedAt: string
  nodeCount: number
  relationshipCount: number
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

export class GraphStore {
  private graph: KnowledgeGraph = createKnowledgeGraph()
  private state: GraphStoreState | null = null
  private cacheDir: string

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir
    mkdirSync(cacheDir, { recursive: true })
  }

  /** Analyze one or more repos and store the result. */
  async analyze(repos: string | string[]): Promise<GraphStoreState> {
    const paths = Array.isArray(repos) ? repos : [repos]
    const normalized = paths.map(normalizeFilePath)
    const input = normalized.length === 1 ? normalized[0] : normalized.map((p) => ({ root: p }))
    this.graph = await runPipeline(input, { progress: false })

    this.state = {
      repoPaths: normalized,
      analyzedAt: new Date().toISOString(),
      nodeCount: this.graph.nodeCount(),
      relationshipCount: this.graph.relationshipCount(),
    }

    // Persist to disk
    const cachePath = join(this.cacheDir, CACHE_FILENAME)
    writeFileSync(cachePath, JSON.stringify({ state: this.state, graph: serializeGraph(this.graph) }), 'utf-8')

    return this.state
  }

  /** Try to load a cached graph from disk. Returns true if successful. */
  loadFromDisk(): boolean {
    const cachePath = join(this.cacheDir, CACHE_FILENAME)
    if (!existsSync(cachePath)) return false
    try {
      const raw = JSON.parse(readFileSync(cachePath, 'utf-8'))
      this.state = raw.state
      this.graph = deserializeGraph(raw.graph)
      return true
    } catch {
      return false
    }
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
}
