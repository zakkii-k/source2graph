import { Command } from 'commander'
import { resolve } from 'path'
import { homedir } from 'os'
import { join } from 'path'
import { startMcpServer } from '../mcp/server.js'

export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('Start an MCP server exposing the code knowledge graph via stdio')
    .option('-r, --repo <path...>', 'Analyze one or more repos on startup (repeatable, or uses cached graph)')
    .option('--cache-dir <dir>', 'Directory for caching the graph', join(homedir(), '.s2g', 'cache'))
    .action(async (options: { repo?: string[]; cacheDir: string }) => {
      const cacheDir = resolve(options.cacheDir)
      const repoPaths = options.repo?.map((p) => resolve(p))
      await startMcpServer(cacheDir, repoPaths)
    })
}
