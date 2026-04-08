import { describe, it, expect, beforeEach } from 'vitest'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { createKnowledgeGraph } from '../../src/core/graph/knowledge-graph.js'
import { createSymbolTable } from '../../src/core/ingestion/symbol-table.js'
import { processMarkdown } from '../../src/core/ingestion/markdown-processor.js'
import { NodeLabel, RelationshipType } from '../../src/shared/graph-types.js'
import { generateNodeId } from '../../src/shared/utils.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FIXTURE_DIR = join(__dirname, '../fixtures/md-sample')
const MD_FILE = 'docs/calculator.md'
const MD_ABS = join(FIXTURE_DIR, MD_FILE)
const SRC_FILE = 'src/calculator.ts'

function makeSymbolTable() {
  const st = createSymbolTable()
  // Register Calculator class (startLine 1, endLine 9)
  st.define({
    nodeId: generateNodeId(NodeLabel.Class, SRC_FILE, 'Calculator'),
    name: 'Calculator',
    qualifiedName: 'Calculator',
    label: NodeLabel.Class,
    filePath: SRC_FILE,
    startLine: 1,
    endLine: 9,
  })
  // Register add method (line 2)
  st.define({
    nodeId: generateNodeId(NodeLabel.Method, SRC_FILE, 'Calculator.add'),
    name: 'add',
    qualifiedName: 'Calculator.add',
    label: NodeLabel.Method,
    filePath: SRC_FILE,
    startLine: 2,
    endLine: 4,
  })
  // Register multiply function (line 11)
  st.define({
    nodeId: generateNodeId(NodeLabel.Function, SRC_FILE, 'multiply'),
    name: 'multiply',
    qualifiedName: 'multiply',
    label: NodeLabel.Function,
    filePath: SRC_FILE,
    startLine: 11,
    endLine: 13,
  })
  return st
}

describe('markdown-processor', () => {
  let graph: ReturnType<typeof createKnowledgeGraph>
  let st: ReturnType<typeof createSymbolTable>
  const allFilePaths = new Set([SRC_FILE])
  const fileNodeId = generateNodeId(NodeLabel.File, MD_FILE, MD_FILE)

  beforeEach(() => {
    graph = createKnowledgeGraph()
    // Pre-create the MD File node (normally done by processStructure)
    graph.addNode({
      label: NodeLabel.File,
      properties: {
        nodeId: fileNodeId,
        name: 'calculator.md',
        filePath: MD_FILE,
        language: 'markdown',
        extension: '.md',
      },
    })
    // Pre-create the TS File node
    const tsFileNodeId = generateNodeId(NodeLabel.File, SRC_FILE, SRC_FILE)
    graph.addNode({
      label: NodeLabel.File,
      properties: {
        nodeId: tsFileNodeId,
        name: 'calculator.ts',
        filePath: SRC_FILE,
        language: 'typescript',
        extension: '.ts',
      },
    })
    st = makeSymbolTable()
    processMarkdown(graph, st, MD_FILE, MD_ABS, allFilePaths)
  })

  it('creates Section nodes for each heading', () => {
    const sections = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Section)
    const headings = sections.map((s) => (s.properties as { heading: string }).heading)
    expect(headings).toContain('Calculator')
    expect(headings).toContain('Usage')
    expect(headings).toContain('Addition')
    expect(headings).toContain('Multiplication')
  })

  it('creates CONTAINS relationships from MD file to sections', () => {
    const contains = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.CONTAINS && r.startNodeId === fileNodeId,
    )
    expect(contains.length).toBeGreaterThanOrEqual(4)
  })

  it('creates DOCUMENTS relationship for frontmatter describes', () => {
    const calculatorNodeId = generateNodeId(NodeLabel.Class, SRC_FILE, 'Calculator')
    const docs = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.DOCUMENTS && r.endNodeId === calculatorNodeId,
    )
    expect(docs.length).toBe(1)
    expect(docs[0].startNodeId).toBe(fileNodeId)
  })

  it('creates REFERENCES for link to specific line (add method)', () => {
    const addNodeId = generateNodeId(NodeLabel.Method, SRC_FILE, 'Calculator.add')
    const refs = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.REFERENCES && r.endNodeId === addNodeId,
    )
    expect(refs.length).toBeGreaterThanOrEqual(1)
    const props = refs[0].properties as { linkText: string }
    expect(props.linkText).toBe('add method')
  })

  it('creates REFERENCES for link to specific line (multiply function)', () => {
    const multiplyNodeId = generateNodeId(NodeLabel.Function, SRC_FILE, 'multiply')
    const refs = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.REFERENCES && r.endNodeId === multiplyNodeId,
    )
    expect(refs.length).toBeGreaterThanOrEqual(1)
  })

  it('creates REFERENCES for plain file link (no line anchor)', () => {
    const tsFileNodeId = generateNodeId(NodeLabel.File, SRC_FILE, SRC_FILE)
    const refs = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.REFERENCES && r.endNodeId === tsFileNodeId,
    )
    expect(refs.length).toBeGreaterThanOrEqual(1)
  })
})
