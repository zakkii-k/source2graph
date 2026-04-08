import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { GraphStore, DEFAULT_NEO4J_THRESHOLD, type Neo4jConfig } from './graph-store.js'
import { buildTools } from './tools.js'
import { buildResources } from './resources.js'
import { NodeLabel } from '../shared/graph-types.js'

export interface ServeOptions {
  neo4jConfig?: Neo4jConfig
  neo4jThreshold?: number
}

export async function startMcpServer(
  cacheDir: string,
  initialRepoPaths?: string[],
  options: ServeOptions = {},
): Promise<void> {
  const store = new GraphStore(cacheDir, options.neo4jConfig, options.neo4jThreshold ?? DEFAULT_NEO4J_THRESHOLD)

  // Try to restore from cache on startup
  if (store.loadFromDisk()) {
    // If Neo4j config was provided, check whether the cached graph exceeds the
    // threshold and switch backends if so (e.g. after a server restart).
    if (options.neo4jConfig) {
      await store.selectBackend()
    }
    const state = store.getState()!
    process.stderr.write(
      `[s2g] Loaded graph from cache: ${state.nodeCount} nodes, ${state.relationshipCount} rels (backend: ${state.backend})\n`,
    )
    process.stderr.write(`[s2g] Analyzed at: ${state.analyzedAt}\n`)
  } else if (initialRepoPaths && initialRepoPaths.length > 0) {
    process.stderr.write(`[s2g] Analyzing ${initialRepoPaths.join(', ')}...\n`)
    await store.analyze(initialRepoPaths)
    const state = store.getState()!
    process.stderr.write(
      `[s2g] Done: ${state.nodeCount} nodes, ${state.relationshipCount} rels (backend: ${state.backend})\n`,
    )
  } else {
    process.stderr.write('[s2g] No cached graph found. Use the analyze tool to index a repository.\n')
  }

  const server = new McpServer({
    name: 'source2graph',
    version: '0.1.0',
  })

  const tools = buildTools(store)
  const resources = buildResources(store)

  // ── Tools ──────────────────────────────────────────────────────────────────

  server.tool(
    'analyze',
    'Analyze one or more source code directories and build a knowledge graph',
    { paths: z.string().describe('Absolute or relative path(s) to repository roots, comma-separated for multiple repos') },
    async ({ paths }) => ({
      content: [{ type: 'text', text: await tools.analyze({ paths }) }],
    }),
  )

  server.tool(
    'query_nodes',
    'Find nodes in the graph by label, name pattern, or file path',
    {
      label: z.enum(Object.values(NodeLabel) as [string, ...string[]]).optional()
        .describe('Node label: File | Folder | Class | Interface | Method | Function | Field'),
      namePattern: z.string().optional().describe('Regex pattern to match against node names'),
      filePath: z.string().optional().describe('Substring to match against file paths'),
      limit: z.number().int().min(1).max(200).optional().describe('Max results (default 50)'),
    },
    async ({ label, namePattern, filePath, limit }) => ({
      content: [{ type: 'text', text: await tools.query_nodes({ label, namePattern, filePath, limit }) }],
    }),
  )

  server.tool(
    'get_callers',
    'Return all nodes that call the named symbol (methods or functions)',
    {
      symbolName: z.string().describe('Name of the method or function'),
      depth: z.number().int().min(1).max(5).optional().describe('How many hops to traverse (default 1)'),
    },
    async ({ symbolName, depth }) => ({
      content: [{ type: 'text', text: await tools.get_callers({ symbolName, depth }) }],
    }),
  )

  server.tool(
    'get_callees',
    'Return all nodes that the named symbol calls',
    {
      symbolName: z.string().describe('Name of the method or function'),
      depth: z.number().int().min(1).max(5).optional().describe('How many hops to traverse (default 1)'),
    },
    async ({ symbolName, depth }) => ({
      content: [{ type: 'text', text: await tools.get_callees({ symbolName, depth }) }],
    }),
  )

  server.tool(
    'get_context',
    'Get a 360-degree view of a symbol: container, methods, fields, extends, implements, callers, callees',
    { symbolName: z.string().describe('Exact name of the class, method, or function') },
    async ({ symbolName }) => ({
      content: [{ type: 'text', text: await tools.get_context({ symbolName }) }],
    }),
  )

  // ── Resources ──────────────────────────────────────────────────────────────

  server.resource(
    'schema',
    's2g://graph/schema',
    { mimeType: 'application/json' },
    () => ({
      contents: [{ uri: 's2g://graph/schema', text: resources.schemaResource() }],
    }),
  )

  server.resource(
    'stats',
    's2g://graph/stats',
    { mimeType: 'application/json' },
    () => ({
      contents: [{ uri: 's2g://graph/stats', text: resources.statsResource() }],
    }),
  )

  server.resource(
    'nodes-by-label',
    new ResourceTemplate('s2g://graph/nodes/{label}', { list: undefined }),
    { mimeType: 'application/json' },
    (uri, { label }) => ({
      contents: [{
        uri: uri.href,
        text: resources.nodesByLabelResource(Array.isArray(label) ? label[0] : label),
      }],
    }),
  )

  // ── Start ──────────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[s2g] MCP server ready (stdio)\n')
}
