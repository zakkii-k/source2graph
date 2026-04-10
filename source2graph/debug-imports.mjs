// Temporary debug script for same-package IMPORTS issue
// Usage: node debug-imports.mjs /path/to/your/project SpecificClassName
// Example: node debug-imports.mjs /home/user/myproject SomeDto

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const projectPath = process.argv[2]
const filter = process.argv[3] ?? 'Dto'

if (!projectPath) {
  console.error('Usage: node debug-imports.mjs /path/to/project ClassName')
  process.exit(1)
}

// ── Build check ────────────────────────────────────────────────────────────
const pipelineJs = resolve(__dirname, 'dist/core/ingestion/pipeline.js')
const javaJs = resolve(__dirname, 'dist/core/ingestion/languages/java.js')
const pipelineSrc = readFileSync(pipelineJs, 'utf-8')
const javaSrc = readFileSync(javaJs, 'utf-8')

const hasCrlfFix = pipelineSrc.includes('replace(/\\r/g')
const hasSamePackageFix = javaSrc.includes('Implicit same-package') || javaSrc.includes('lookupByName')

console.log(`=== Build check ===`)
console.log(`  CRLF fix (pipeline.js):           ${hasCrlfFix ? 'YES' : 'NO ← npm run build が必要'}`)
console.log(`  Same-package IMPORTS fix (java.js): ${hasSamePackageFix ? 'YES' : 'NO ← npm run build が必要'}`)
console.log()

if (!hasSamePackageFix) {
  console.error('同一パッケージIMPORTS修正がdistに入っていません。npm run build を実行してください。')
  process.exit(1)
}

// ── Analyze ────────────────────────────────────────────────────────────────
const { runPipeline } = await import(resolve(__dirname, 'dist/core/ingestion/pipeline.js'))

console.log(`Analyzing: ${projectPath}`)
console.log(`Filter keyword: ${filter}\n`)

const graph = await runPipeline(projectPath, { verbose: false })

// 0. Sanity check: show sample File node paths from the graph
const fileNodes = [...graph.nodes.values()].filter(n => n.label === 'File')
console.log(`=== File nodes sample (total: ${fileNodes.length}) ===`)
const sample = fileNodes.slice(0, 5)
for (const f of sample) console.log(`  nodeId: ${f.properties?.nodeId}`)
console.log()

// 0b. Show File nodes matching filter
const matchingFileNodes = fileNodes.filter(f => (f.properties?.nodeId ?? '').includes(filter))
console.log(`=== File nodes matching "${filter}" (${matchingFileNodes.length} found) ===`)
for (const f of matchingFileNodes) console.log(`  nodeId: ${f.properties?.nodeId}`)
console.log()

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

// 2. Show ALL IMPORTS edges involving those files (both directions)
const matchingFilePaths = new Set(classNodes.map(n => n.properties?.filePath).filter(Boolean))
const importsEdges = [...graph.relationships.values()].filter(r => r.type === 'IMPORTS')

console.log(`=== IMPORTS edges (total: ${importsEdges.length}) ===`)
console.log(`  Relevant file paths:`)
for (const p of matchingFilePaths) console.log(`    ${p}`)
console.log()

const relevant = importsEdges.filter(
  e => [...matchingFilePaths].some(p => e.startNodeId.includes(p) || e.endNodeId.includes(p))
)
if (relevant.length === 0) {
  console.log(`  (none involving "${filter}" files)`)
} else {
  for (const e of relevant) {
    const direction = [...matchingFilePaths].some(p => e.startNodeId.includes(p)) ? 'OUT' : 'IN'
    console.log(`  [${direction}] ${e.startNodeId}`)
    console.log(`       -> ${e.endNodeId}`)
    console.log(`       importPath: ${e.properties?.importPath}`)
    console.log()
  }
}

// 3. Specifically check: does any file IMPORT into SomeDto's file?
console.log(`=== Incoming IMPORTS to "${filter}" files ===`)
const incoming = importsEdges.filter(
  e => [...matchingFilePaths].some(p => e.endNodeId.includes(p))
)
if (incoming.length === 0) {
  console.log(`  (none) ← これが問題: 同一パッケージから参照されていない`)
} else {
  for (const e of incoming) {
    console.log(`  ${e.startNodeId}`)
    console.log(`    -> ${e.endNodeId}`)
    console.log(`    importPath: ${e.properties?.importPath}`)
    console.log()
  }
}
