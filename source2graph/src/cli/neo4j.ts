import { Command } from 'commander'
import { resolve } from 'path'
import { runPipeline } from '../core/ingestion/pipeline.js'
import { Neo4jImporter } from '../neo4j/neo4j-importer.js'
import {
  startNeo4j, stopNeo4j, destroyNeo4j,
  getStatus, waitForNeo4j, openBrowser,
} from '../neo4j/docker-manager.js'

const DEFAULT_URI = 'bolt://localhost:7687'
const DEFAULT_USER = 'neo4j'
const DEFAULT_PASS = 's2gpass'

export function registerNeo4jCommands(program: Command): void {

  const neo4jCmd = program
    .command('neo4j')
    .description('Manage Neo4j Docker container and graph import')

  // ── neo4j up ──────────────────────────────────────────────────────────────
  neo4jCmd
    .command('up')
    .description('Start the Neo4j Docker container (docker-compose up)')
    .option('--open', 'Open Neo4j Browser after startup', false)
    .action(async (opts: { open: boolean }) => {
      console.log('Starting Neo4j container...')
      const r = startNeo4j()
      if (!r.ok) {
        console.error('Failed to start Neo4j:')
        console.error(r.output)
        process.exit(1)
      }
      console.log('Waiting for Neo4j to be ready...')
      const ready = await waitForNeo4j(DEFAULT_URI, { user: DEFAULT_USER, password: DEFAULT_PASS }, 90_000)
      if (!ready) {
        console.error('Neo4j did not become ready within 90s. Check: docker logs s2g-neo4j')
        process.exit(1)
      }
      console.log(`Neo4j is ready.`)
      console.log(`  Browser: http://localhost:7474  (user: ${DEFAULT_USER} / pass: ${DEFAULT_PASS})`)
      console.log(`  Bolt:    bolt://localhost:7687`)
      if (opts.open) openBrowser()
    })

  // ── neo4j down ────────────────────────────────────────────────────────────
  neo4jCmd
    .command('down')
    .description('Stop the Neo4j Docker container')
    .action(() => {
      const r = stopNeo4j()
      console.log(r.ok ? 'Neo4j stopped.' : `Error: ${r.output}`)
    })

  // ── neo4j destroy ─────────────────────────────────────────────────────────
  neo4jCmd
    .command('destroy')
    .description('Stop Neo4j and delete all data volumes')
    .action(() => {
      const r = destroyNeo4j()
      console.log(r.ok ? 'Neo4j destroyed (data deleted).' : `Error: ${r.output}`)
    })

  // ── neo4j status ──────────────────────────────────────────────────────────
  neo4jCmd
    .command('status')
    .description('Show Neo4j container status')
    .action(() => {
      const s = getStatus()
      console.log(`Running: ${s.running}`)
      console.log(`Healthy: ${s.healthy}`)
      if (s.running) {
        console.log(`Browser: ${s.browserUrl}`)
        console.log(`Bolt:    ${s.boltUri}`)
      }
    })

  // ── neo4j open ────────────────────────────────────────────────────────────
  neo4jCmd
    .command('open')
    .description('Open Neo4j Browser in the default web browser')
    .action(() => {
      openBrowser()
      console.log('Opening http://localhost:7474 ...')
    })

  // ── neo4j import ──────────────────────────────────────────────────────────
  neo4jCmd
    .command('import <paths...>')
    .description('Analyze one or more source directories and import the graph into Neo4j')
    .option('--uri <uri>', 'Bolt URI', DEFAULT_URI)
    .option('-u, --user <user>', 'Neo4j username', DEFAULT_USER)
    .option('-p, --password <password>', 'Neo4j password', DEFAULT_PASS)
    .option('--database <db>', 'Neo4j database name', 'neo4j')
    .option('--clear', 'Delete all existing nodes before importing', false)
    .option('--start', 'Start Neo4j container if not running', false)
    .option('--open', 'Open Neo4j Browser after import', false)
    .option('-v, --verbose', 'Show per-file progress', false)
    .action(async (
      targetPaths: string[],
      opts: { uri: string; user: string; password: string; database: string; clear: boolean; start: boolean; open: boolean; verbose: boolean },
    ) => {
      const absPaths = targetPaths.map((p) => resolve(p))

      // Optionally start Docker
      if (opts.start) {
        console.log('Starting Neo4j container...')
        startNeo4j()
        console.log('Waiting for Neo4j...')
        const ready = await waitForNeo4j(opts.uri, { user: opts.user, password: opts.password }, 90_000)
        if (!ready) { console.error('Neo4j did not start in time.'); process.exit(1) }
        console.log('Neo4j ready.\n')
      }

      // Verify connection
      const importer = new Neo4jImporter({
        uri: opts.uri, user: opts.user, password: opts.password, database: opts.database,
      })
      try {
        await importer.verifyConnectivity()
      } catch (err) {
        console.error(`Cannot connect to Neo4j at ${opts.uri}: ${err}`)
        console.error('Start Neo4j first: s2g neo4j up')
        process.exit(1)
      }

      // Analyze
      console.log(`Analyzing: ${absPaths.join(', ')}`)
      const repos = absPaths.map((p) => ({ root: p }))
      const graph = await runPipeline(repos.length === 1 ? repos[0].root : repos, { verbose: opts.verbose, progress: !opts.verbose })
      console.log(`Nodes: ${graph.nodeCount()}  Relationships: ${graph.relationshipCount()}`)
      console.log()

      // Import
      console.log('Importing into Neo4j...')
      if (opts.clear) console.log('  (--clear: deleting existing data first)')

      const { nodesImported, relsImported } = await importer.importGraph(graph, {
        clearFirst: opts.clear,
        onProgress: (phase, done, total) => {
          process.stdout.write(`\r  ${phase}: ${done}/${total}           `)
        },
      })
      process.stdout.write('\n')

      await importer.close()

      console.log(`\nImport complete.`)
      console.log(`  Nodes:         ${nodesImported}`)
      console.log(`  Relationships: ${relsImported}`)
      console.log()
      console.log(`  Neo4j Browser: http://localhost:7474`)
      console.log(`  Try: MATCH (n) RETURN labels(n), count(*) ORDER BY count(*) DESC`)

      if (opts.open) openBrowser()
    })
}
