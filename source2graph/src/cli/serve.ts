import { Command } from 'commander'
import { resolve } from 'path'
import { homedir } from 'os'
import { join } from 'path'
import { startMcpServer } from '../mcp/server.js'
import { DEFAULT_NEO4J_THRESHOLD } from '../mcp/graph-store.js'

const DEFAULT_NEO4J_URI = 'bolt://localhost:7687'
const DEFAULT_NEO4J_USER = 'neo4j'
const DEFAULT_NEO4J_PASS = 's2gpassword'

export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('Start an MCP server exposing the code knowledge graph via stdio')
    .option('-r, --repo <path...>', 'Analyze one or more repos on startup (repeatable, or uses cached graph)')
    .option('--cache-dir <dir>', 'Directory for caching the graph', join(homedir(), '.s2g', 'cache'))
    // Neo4j options (all optional — omit to stay in-memory regardless of graph size)
    .option('--neo4j-uri <uri>', `Neo4j Bolt URI (enables auto Neo4j backend, default: ${DEFAULT_NEO4J_URI})`)
    .option('--neo4j-user <user>', 'Neo4j username', DEFAULT_NEO4J_USER)
    .option('--neo4j-password <password>', 'Neo4j password', DEFAULT_NEO4J_PASS)
    .option('--neo4j-database <db>', 'Neo4j database name', 'neo4j')
    .option(
      '--neo4j-threshold <n>',
      `Switch to Neo4j when edge count exceeds this value (default: ${DEFAULT_NEO4J_THRESHOLD})`,
      String(DEFAULT_NEO4J_THRESHOLD),
    )
    .action(async (options: {
      repo?: string[]
      cacheDir: string
      neo4jUri?: string
      neo4jUser: string
      neo4jPassword: string
      neo4jDatabase: string
      neo4jThreshold: string
    }) => {
      const cacheDir = resolve(options.cacheDir)
      const repoPaths = options.repo?.map((p) => resolve(p))

      // Only enable Neo4j backend if --neo4j-uri was explicitly provided
      const neo4jConfig = options.neo4jUri
        ? {
            uri: options.neo4jUri,
            user: options.neo4jUser,
            password: options.neo4jPassword,
            database: options.neo4jDatabase,
          }
        : undefined

      const neo4jThreshold = parseInt(options.neo4jThreshold, 10)

      await startMcpServer(cacheDir, repoPaths, { neo4jConfig, neo4jThreshold })
    })
}
