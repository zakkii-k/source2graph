import fg from 'fast-glob'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import ignore, { type Ignore } from 'ignore'
import { isSupportedExtension } from '../../shared/language-types.js'

export interface WalkedFile {
  absolutePath: string
  /** リポジトリルートからの相対パス。複数リポジトリモードでは "{repoPrefix}/{path}" 形式になる。 */
  relativePath: string
  extension: string
}

/** 複数リポジトリを一括解析するときのエントリ定義 */
export interface RepoTarget {
  /** リポジトリの絶対パス */
  root: string
  /**
   * グラフ内でのファイルパスプレフィックス。
   * 省略時は root の末尾ディレクトリ名を使用。
   * 単一リポジトリモードでは "" (プレフィックスなし) になる。
   */
  prefix?: string
}

const DEFAULT_IGNORE_PATTERNS = [
  // Build output
  'node_modules/**',
  'dist/**',
  'build/**',
  'out/**',
  'target/**',
  '.gradle/**',
  // Test coverage
  'coverage/**',
  '.nyc_output/**',
  // IDE / OS
  '.git/**',
  '.idea/**',
  '.vscode/**',
  '**/.DS_Store',
  // Lock files and generated
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.min.js',
  '*.bundle.js',
]

function loadIgnoreFile(repoRoot: string, filename: string): Ignore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ig = (ignore as any)() as Ignore
  const filePath = join(repoRoot, filename)
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    ig.add(content)
  }
  return ig
}

export async function walkFiles(repoRoot: string): Promise<WalkedFile[]> {
  const gitIgnore = loadIgnoreFile(repoRoot, '.gitignore')
  const customIgnore = loadIgnoreFile(repoRoot, '.s2gignore')

  const allFiles = await fg('**/*', {
    cwd: repoRoot,
    onlyFiles: true,
    dot: false,
    ignore: DEFAULT_IGNORE_PATTERNS,
  })

  const results: WalkedFile[] = []

  for (const relativePath of allFiles) {
    // Apply .gitignore and .s2gignore filters
    if (gitIgnore.ignores(relativePath)) continue
    if (customIgnore.ignores(relativePath)) continue

    const extMatch = relativePath.match(/(\.[^.]+)$/)
    if (!extMatch) continue
    const ext = extMatch[1].toLowerCase()

    if (!isSupportedExtension(ext)) continue

    results.push({
      absolutePath: join(repoRoot, relativePath),
      relativePath,
      extension: ext,
    })
  }

  return results
}

/**
 * 複数リポジトリを走査してソースファイルを返す。
 * 各ファイルの relativePath は "{prefix}/{original}" 形式になる。
 * repos が1要素の場合はプレフィックスなし（単一リポジトリと同じ）。
 */
export async function walkFilesMulti(repos: RepoTarget[]): Promise<WalkedFile[]> {
  const usePrefix = repos.length > 1
  const results: WalkedFile[] = []

  for (const repo of repos) {
    const prefix = usePrefix
      ? (repo.prefix ?? repo.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'repo')
      : ''
    const walked = await walkFiles(repo.root)
    for (const f of walked) {
      results.push({
        absolutePath: f.absolutePath,
        relativePath: prefix ? `${prefix}/${f.relativePath}` : f.relativePath,
        extension: f.extension,
      })
    }
  }

  return results
}

/** 複数リポジトリを走査して Markdown ファイルを返す。 */
export async function walkMarkdownFilesMulti(repos: RepoTarget[]): Promise<WalkedFile[]> {
  const usePrefix = repos.length > 1
  const results: WalkedFile[] = []

  for (const repo of repos) {
    const prefix = usePrefix
      ? (repo.prefix ?? repo.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'repo')
      : ''
    const walked = await walkMarkdownFiles(repo.root)
    for (const f of walked) {
      results.push({
        absolutePath: f.absolutePath,
        relativePath: prefix ? `${prefix}/${f.relativePath}` : f.relativePath,
        extension: f.extension,
      })
    }
  }

  return results
}

/** Walk MyBatis mapper XML files (*Mapper.xml) in a repo root. */
export async function walkXmlFiles(repoRoot: string): Promise<WalkedFile[]> {
  const gitIgnore = loadIgnoreFile(repoRoot, '.gitignore')
  const customIgnore = loadIgnoreFile(repoRoot, '.s2gignore')

  const allFiles = await fg('**/*Mapper.xml', {
    cwd: repoRoot,
    onlyFiles: true,
    dot: false,
    ignore: DEFAULT_IGNORE_PATTERNS,
  })

  return allFiles
    .filter((p) => !gitIgnore.ignores(p) && !customIgnore.ignores(p))
    .map((relativePath) => ({
      absolutePath: join(repoRoot, relativePath),
      relativePath,
      extension: '.xml',
    }))
}

/** 複数リポジトリを走査して MyBatis Mapper XML ファイルを返す。 */
export async function walkXmlFilesMulti(repos: RepoTarget[]): Promise<WalkedFile[]> {
  const usePrefix = repos.length > 1
  const results: WalkedFile[] = []

  for (const repo of repos) {
    const prefix = usePrefix
      ? (repo.prefix ?? repo.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'repo')
      : ''
    const walked = await walkXmlFiles(repo.root)
    for (const f of walked) {
      results.push({
        absolutePath: f.absolutePath,
        relativePath: prefix ? `${prefix}/${f.relativePath}` : f.relativePath,
        extension: f.extension,
      })
    }
  }

  return results
}

/** Walk markdown files in a repo root, respecting .gitignore and .s2gignore. */
export async function walkMarkdownFiles(repoRoot: string): Promise<WalkedFile[]> {
  const gitIgnore = loadIgnoreFile(repoRoot, '.gitignore')
  const customIgnore = loadIgnoreFile(repoRoot, '.s2gignore')

  const allFiles = await fg('**/*.md', {
    cwd: repoRoot,
    onlyFiles: true,
    dot: false,
    ignore: DEFAULT_IGNORE_PATTERNS,
  })

  return allFiles
    .filter((p) => !gitIgnore.ignores(p) && !customIgnore.ignores(p))
    .map((relativePath) => ({
      absolutePath: join(repoRoot, relativePath),
      relativePath,
      extension: '.md',
    }))
}
