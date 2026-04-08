import type { NodeLabel } from '../../shared/graph-types.js'

export interface SymbolDefinition {
  nodeId: string
  name: string
  qualifiedName: string
  label: NodeLabel
  filePath: string
  startLine: number
  endLine: number
}

export interface SymbolTable {
  /** Register a symbol */
  define(symbol: SymbolDefinition): void
  /** Look up by simple name (may return multiple if name is ambiguous) */
  lookupByName(name: string): SymbolDefinition[]
  /** Look up by qualified name (e.g. com.example.Foo) */
  lookupByQualifiedName(qualifiedName: string): SymbolDefinition | undefined
  /** Look up by file path + label */
  lookupByFile(filePath: string, label?: NodeLabel): SymbolDefinition[]
  /** Find the symbol that contains a given line number in a file */
  lookupByLine(filePath: string, line: number): SymbolDefinition | undefined
  /** All symbols */
  all(): SymbolDefinition[]
}

export function createSymbolTable(): SymbolTable {
  const byName = new Map<string, SymbolDefinition[]>()
  const byQualifiedName = new Map<string, SymbolDefinition>()
  const byFile = new Map<string, SymbolDefinition[]>()
  const all: SymbolDefinition[] = []

  return {
    define(symbol: SymbolDefinition): void {
      all.push(symbol)

      const nameEntries = byName.get(symbol.name) ?? []
      nameEntries.push(symbol)
      byName.set(symbol.name, nameEntries)

      byQualifiedName.set(symbol.qualifiedName, symbol)

      const fileEntries = byFile.get(symbol.filePath) ?? []
      fileEntries.push(symbol)
      byFile.set(symbol.filePath, fileEntries)
    },

    lookupByName(name: string): SymbolDefinition[] {
      return byName.get(name) ?? []
    },

    lookupByQualifiedName(qualifiedName: string): SymbolDefinition | undefined {
      return byQualifiedName.get(qualifiedName)
    },

    lookupByFile(filePath: string, label?: NodeLabel): SymbolDefinition[] {
      const entries = byFile.get(filePath) ?? []
      if (label) return entries.filter((s) => s.label === label)
      return entries
    },

    lookupByLine(filePath: string, line: number): SymbolDefinition | undefined {
      const entries = byFile.get(filePath) ?? []
      // Find the narrowest symbol that contains this line
      let best: SymbolDefinition | undefined
      let bestSize = Infinity
      for (const sym of entries) {
        if (sym.startLine <= line && line <= sym.endLine) {
          const size = sym.endLine - sym.startLine
          if (size < bestSize) {
            bestSize = size
            best = sym
          }
        }
      }
      return best
    },

    all(): SymbolDefinition[] {
      return all
    },
  }
}
