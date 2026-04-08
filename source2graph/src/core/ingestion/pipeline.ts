import { readFileSync } from 'fs'
import { basename, resolve } from 'path'
import cliProgress from 'cli-progress'
import type { KnowledgeGraph } from '../../shared/graph-types.js'
import { createKnowledgeGraph } from '../graph/knowledge-graph.js'
import { walkFilesMulti, walkMarkdownFilesMulti } from './file-walker.js'
import type { RepoTarget } from './file-walker.js'
import { processStructure } from './structure-processor.js'
import { getProviderForExtension } from './languages/index.js'
import { createSymbolTable } from './symbol-table.js'
import { getTreeSitterLanguage } from '../../shared/language-types.js'
import { parseSource } from '../tree-sitter/parser-loader.js'
import type { ParseContext } from './language-provider.js'
import { processMarkdown } from './markdown-processor.js'

export interface PipelineOptions {
  verbose?: boolean
  progress?: boolean
}

export { RepoTarget }

/**
 * コードグラフを構築するメインパイプライン。
 *
 * - 単一リポジトリ: `runPipeline('/path/to/repo', options)`
 * - 複数リポジトリ: `runPipeline([{ root: '/path/to/p1' }, { root: '/path/to/p2' }], options)`
 *
 * 複数リポジトリの場合、各ファイルのパスは "{repoName}/{original}" 形式でグラフに格納される。
 */
export async function runPipeline(
  repos: string | RepoTarget | RepoTarget[],
  options: PipelineOptions = {},
): Promise<KnowledgeGraph> {
  const { verbose = false, progress = false } = options
  const graph = createKnowledgeGraph()
  const symbolTable = createSymbolTable()

  // 入力を RepoTarget[] に正規化
  const targets: RepoTarget[] = typeof repos === 'string'
    ? [{ root: resolve(repos) }]
    : Array.isArray(repos)
      ? repos.map((r) => ({ ...r, root: resolve(r.root) }))
      : [{ ...repos, root: resolve(repos.root) }]

  // Phase 1: Walk files
  if (verbose) console.log('  [1/5] Walking files...')
  const files = await walkFilesMulti(targets)
  const mdFiles = await walkMarkdownFilesMulti(targets)
  if (verbose) {
    const repoList = targets.map((t) => basename(t.root)).join(', ')
    console.log(`        Repos: ${repoList}`)
    console.log(`        Found ${files.length} source files, ${mdFiles.length} markdown files`)
  }

  // Phase 1: Build file/folder structure
  processStructure(graph, [...files, ...mdFiles])

  const allFilePaths = new Set(files.map((f) => f.relativePath))

  // Precompute parse contexts (parse all files once; reused across phases B-D)
  const contexts: ParseContext[] = []

  // Phase 2: Symbol extraction
  if (verbose) console.log('  [2/5] Extracting symbols...')

  let bar: cliProgress.SingleBar | undefined
  if (progress && !verbose) {
    bar = new cliProgress.SingleBar(
      { format: '  Parsing |{bar}| {value}/{total} files  {filename}', clearOnComplete: true },
      cliProgress.Presets.shades_classic,
    )
    bar.start(files.length, 0, { filename: '' })
  }

  let skipped = 0
  for (const file of files) {
    bar?.update({ filename: file.relativePath.slice(-40) })

    const provider = getProviderForExtension(file.extension)
    if (!provider) {
      bar?.increment()
      continue
    }

    try {
      const source = readFileSync(file.absolutePath, 'utf-8')
      const langKey = (
        provider.language === 'typescriptreact' ? 'typescriptreact'
          : provider.language === 'javascriptreact' ? 'javascript'
          : provider.language
      ) as Parameters<typeof getTreeSitterLanguage>[0]
      const tsLang = getTreeSitterLanguage(langKey)
      const tree = parseSource(source, tsLang)

      const ctx: ParseContext = {
        filePath: file.relativePath,
        absolutePath: file.absolutePath,
        source,
        tree,
        graph,
        symbolTable,
        verbose,
      }

      provider.extractSymbols(ctx)
      contexts.push(ctx)

      if (verbose) console.log(`        ✓ ${file.relativePath}`)
    } catch (err) {
      skipped++
      if (verbose) console.warn(`        ✗ ${file.relativePath}: ${err}`)
    }
    bar?.increment()
  }

  bar?.stop()

  if (skipped > 0) {
    console.warn(`  Warning: ${skipped} file(s) skipped due to parse errors`)
  }

  // Phase 3A: Resolve imports
  if (verbose) console.log('  [3/5] Resolving imports...')
  for (const ctx of contexts) {
    const provider = getProviderForExtension(ctx.filePath.match(/(\.[^.]+)$/)?.[1] ?? '')
    if (!provider) continue
    try {
      provider.resolveImports(ctx, allFilePaths)
    } catch {
      // Non-fatal
    }
  }

  // Phase 3B: Resolve heritage (extends / implements)
  if (verbose) console.log('        Resolving heritage...')
  for (const ctx of contexts) {
    const provider = getProviderForExtension(ctx.filePath.match(/(\.[^.]+)$/)?.[1] ?? '')
    if (!provider) continue
    try {
      provider.resolveHeritage(ctx)
    } catch {
      // Non-fatal
    }
  }

  // Phase 3C: Resolve calls
  if (verbose) console.log('  [4/5] Resolving calls...')
  for (const ctx of contexts) {
    const provider = getProviderForExtension(ctx.filePath.match(/(\.[^.]+)$/)?.[1] ?? '')
    if (!provider) continue
    try {
      provider.resolveCalls(ctx)
    } catch {
      // Non-fatal
    }
  }

  // Phase 5: Process markdown files (sections, REFERENCES, DOCUMENTS)
  if (mdFiles.length > 0) {
    if (verbose) console.log(`  [5/5] Processing ${mdFiles.length} markdown files...`)
    for (const mdFile of mdFiles) {
      try {
        processMarkdown(graph, symbolTable, mdFile.relativePath, mdFile.absolutePath, allFilePaths, { verbose })
      } catch {
        // Non-fatal
      }
    }
  }

  return graph
}
