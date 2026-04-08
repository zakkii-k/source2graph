import { Command } from 'commander'
import { resolve } from 'path'
import { runPipeline } from '../core/ingestion/pipeline.js'
import { OutputCoordinator } from '../output/output-coordinator.js'

export function registerAnalyzeCommand(program: Command): void {
  program
    .command('analyze <paths...>')
    .description('Analyze one or more source code directories and output a Neo4j graph')
    .option('-o, --output <dir>', 'Output directory', './s2g-output')
    .option('-f, --format <format>', 'Output format: csv | cypher | both', 'both')
    .option('-v, --verbose', 'Show per-file progress', false)
    .option('--no-progress', 'Disable progress bar')
    .action(async (targetPaths: string[], options: { output: string; format: string; verbose: boolean; progress: boolean }) => {
      const absPaths = targetPaths.map((p) => resolve(p))
      const absOutput = resolve(options.output)

      const format = options.format as 'csv' | 'cypher' | 'both'
      if (!['csv', 'cypher', 'both'].includes(format)) {
        console.error(`Invalid format "${format}". Use: csv | cypher | both`)
        process.exit(1)
      }

      console.log(`Analyzing: ${absPaths.join(', ')}`)
      console.log(`Output:    ${absOutput}`)
      console.log(`Format:    ${format}`)
      console.log()

      try {
        const repos = absPaths.map((p) => ({ root: p }))
        const graph = await runPipeline(repos.length === 1 ? repos[0].root : repos, {
          verbose: options.verbose,
          progress: options.progress && !options.verbose,
        })

        console.log()
        console.log(`Nodes:         ${graph.nodeCount()}`)
        console.log(`Relationships: ${graph.relationshipCount()}`)
        console.log()

        const coordinator = new OutputCoordinator(absOutput, format)
        await coordinator.write(graph)

        console.log(`Done. Output written to: ${absOutput}`)
      } catch (err) {
        console.error('Analysis failed:', err)
        process.exit(1)
      }
    })
}
