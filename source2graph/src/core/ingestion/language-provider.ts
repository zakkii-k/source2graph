import type Parser from 'tree-sitter'
import type { KnowledgeGraph } from '../../shared/graph-types.js'
import type { SymbolTable } from './symbol-table.js'

export interface ParseContext {
  filePath: string       // normalized relative path
  absolutePath: string
  source: string
  tree: Parser.Tree
  graph: KnowledgeGraph
  symbolTable: SymbolTable
  verbose: boolean
}

export interface LanguageProvider {
  /** Language identifier (matches SupportedLanguage values) */
  readonly language: string
  /** File extensions handled by this provider */
  readonly extensions: string[]

  /**
   * Phase A: Extract symbols (Class, Interface, Method, Function, Field) from the AST.
   * Populates graph nodes and the symbol table.
   */
  extractSymbols(ctx: ParseContext): void

  /**
   * Phase B: Resolve imports — add IMPORTS edges.
   * Called after all files have been symbol-extracted.
   */
  resolveImports(ctx: ParseContext, allFiles: Set<string>): void

  /**
   * Phase C: Resolve heritage — add EXTENDS / IMPLEMENTS edges.
   * Called after symbol extraction is complete.
   */
  resolveHeritage(ctx: ParseContext): void

  /**
   * Phase D: Resolve calls — add CALLS edges.
   * Called last, after heritage resolution.
   */
  resolveCalls(ctx: ParseContext): void
}
