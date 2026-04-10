// Temporary debug script for same-package IMPORTS issue
// Usage: node debug-imports.mjs /path/to/your/project [DtoNameSubstring]
// Example: node debug-imports.mjs /home/user/myproject Dto

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const projectPath = process.argv[2]
const filter = process.argv[3] ?? 'Dto'

if (!projectPath) {
  console.error('Usage: node debug-imports.mjs /path/to/project [FilterKeyword]')
  process.exit(1)
}

const { runPipeline } = await import(resolve(__dirname, 'dist/core/ingestion/pipeline.js'))

console.log(`Analyzing: ${projectPath}`)
console.log(`Filter keyword: ${filter}\n`)

const graph = await runPipeline(projectPath, { verbose: false })

// 1. Show Class nodes matching filter
const classNodes = [...graph.nodes.values()].filter(
  n => n.label === 'Class' && (n.properties?.name ?? '').includes(filter)
)
console.log(`=== Class nodes matching "${filter}" (${classNodes.length} found) ===`)
for (const n of classNodes) {
  console.log(`  name: ${n.properties?.name}`)
  console.log(`  qualifiedName: ${n.properties?.qualifiedName ?? '(null/undefined)'}`)
  console.log(`  filePath: ${n.properties?.filePath}`)
  console.log()
}

// 2. Show IMPORTS edges involving those files
const matchingFilePaths = new Set(classNodes.map(n => n.properties?.filePath).filter(Boolean))
const importsEdges = [...graph.relationships.values()].filter(r => r.type === 'IMPORTS')

console.log(`=== IMPORTS edges (total: ${importsEdges.length}) ===`)
const relevant = importsEdges.filter(
  e => [...matchingFilePaths].some(p => e.startNodeId.includes(p) || e.endNodeId.includes(p))
)
if (relevant.length === 0) {
  console.log(`  (none involving "${filter}" files)`)
} else {
  for (const e of relevant) {
    console.log(`  ${e.startNodeId}`)
    console.log(`    -> ${e.endNodeId}`)
    console.log(`    importPath: ${e.properties?.importPath}`)
    console.log()
  }
}

// 3. Check if dist has CRLF fix
const pipelineJs = resolve(__dirname, 'dist/core/ingestion/pipeline.js')
const pipelineSrc = readFileSync(pipelineJs, 'utf-8')
const hasCrlfFix = pipelineSrc.includes('replace(/\\r/g')
console.log(`=== Build check ===`)
console.log(`  CRLF fix in dist/pipeline.js: ${hasCrlfFix ? 'YES' : 'NO (needs npm run build)'}`)
