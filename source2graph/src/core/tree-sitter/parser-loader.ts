import Parser from 'tree-sitter'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Java = require('tree-sitter-java') as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { typescript, tsx } = require('tree-sitter-typescript') as { typescript: any; tsx: any }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JavaScript = require('tree-sitter-javascript') as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Scala = require('tree-sitter-scala') as any

export type TreeSitterLanguageName = 'java' | 'typescript' | 'javascript' | 'scala'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languageMap: Record<TreeSitterLanguageName, any> = {
  java: Java,
  typescript: typescript,
  javascript: JavaScript,
  scala: Scala,
}

// One Parser instance per language to avoid re-creating
const parsers = new Map<TreeSitterLanguageName, Parser>()

export function getParser(language: TreeSitterLanguageName): Parser {
  if (parsers.has(language)) return parsers.get(language)!

  const parser = new Parser()
  parser.setLanguage(languageMap[language])
  parsers.set(language, parser)
  return parser
}

export function getTsxParser(): Parser {
  const parser = new Parser()
  parser.setLanguage(tsx)
  return parser
}

export { tsx as tsxLanguage }

export function parseSource(source: string, language: TreeSitterLanguageName | undefined): Parser.Tree {
  if (!language) throw new Error('language is required')
  return getParser(language).parse(source)
}
