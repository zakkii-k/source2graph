import type { KnowledgeGraph } from '../shared/graph-types.js'
import { writeCsv } from './csv-writer.js'
import { writeCypher } from './cypher-writer.js'
import { writeSchema } from './schema-generator.js'
import { writeImportScript } from './import-script-generator.js'

export class OutputCoordinator {
  constructor(
    private readonly outputDir: string,
    private readonly format: 'csv' | 'cypher' | 'both',
  ) {}

  async write(graph: KnowledgeGraph): Promise<void> {
    const { outputDir, format } = this

    if (format === 'csv' || format === 'both') {
      console.log('Writing CSV files...')
      const csvFiles = await writeCsv(graph, outputDir)
      console.log(`  ${csvFiles.length} CSV file(s) written`)
      const scriptPath = writeImportScript(outputDir)
      console.log(`  Import script: ${scriptPath}`)
    }

    if (format === 'cypher' || format === 'both') {
      console.log('Writing Cypher files...')
      const schemaFile = writeSchema(outputDir)
      console.log(`  Schema:  ${schemaFile}`)
      const cypherFiles = await writeCypher(graph, outputDir)
      for (const f of cypherFiles) console.log(`  Written: ${f}`)
    }
  }
}
