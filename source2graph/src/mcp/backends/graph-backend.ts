import type { GraphNode } from '../../shared/graph-types.js'

export interface ContextResult {
  symbol: Record<string, unknown>
  container: Record<string, unknown>[]
  methods: Record<string, unknown>[]
  fields: Record<string, unknown>[]
  extends: Record<string, unknown>[]
  implements: Record<string, unknown>[]
  callers: Record<string, unknown>[]
  callees: Record<string, unknown>[]
  imports: Record<string, unknown>[]
}

export interface GraphBackend {
  queryNodes(args: { label?: string; namePattern?: string; filePath?: string; limit?: number }): Promise<GraphNode[]>
  getCallers(symbolName: string, depth: number): Promise<GraphNode[]>
  getCallees(symbolName: string, depth: number): Promise<GraphNode[]>
  getContext(symbolName: string): Promise<ContextResult | { error: string }>
  close(): Promise<void>
}
