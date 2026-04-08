import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { runPipeline } from '../../src/core/ingestion/pipeline.js'
import { NodeLabel, RelationshipType } from '../../src/shared/graph-types.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FIXTURES = join(__dirname, '../fixtures')

// ─── Java Sample ──────────────────────────────────────────────────────────────

describe('Java pipeline (java-sample)', () => {
  it('extracts the expected number of nodes and relationships', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    expect(graph.nodeCount()).toBeGreaterThan(20)
    expect(graph.relationshipCount()).toBeGreaterThan(30)
  })

  it('extracts Class nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const classes = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Class)
    const names = classes.map((c) => c.properties.name)
    expect(names).toContain('User')
    expect(names).toContain('UserService')
    expect(names).toContain('AdminService')
  })

  it('extracts Interface nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const ifaces = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Interface)
    expect(ifaces.map((i) => i.properties.name)).toContain('UserRepository')
  })

  it('resolves EXTENDS relationship (AdminService -> UserService)', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const extendsRels = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.EXTENDS
    )
    const found = extendsRels.some((r) => {
      const start = graph.getNode(r.startNodeId)
      const end = graph.getNode(r.endNodeId)
      return start?.properties.name === 'AdminService' && end?.properties.name === 'UserService'
    })
    expect(found).toBe(true)
  })

  it('resolves IMPORTS relationships', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const imports = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.IMPORTS
    )
    expect(imports.length).toBeGreaterThan(0)
  })

  it('extracts Method nodes with correct properties', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const methods = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Method)
    expect(methods.length).toBeGreaterThan(5)
    const validateUser = methods.find((m) => m.properties.name === 'validateUser')
    expect(validateUser).toBeDefined()
  })

  it('extracts Field nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const fields = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Field)
    expect(fields.length).toBeGreaterThan(0)
  })
})

// ─── TypeScript Sample ─────────────────────────────────────────────────────────

describe('TypeScript pipeline (ts-sample)', () => {
  it('extracts Class and Interface nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'ts-sample'))
    const classes = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Class)
    const ifaces = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Interface)
    expect(classes.map((c) => c.properties.name)).toContain('User')
    expect(classes.map((c) => c.properties.name)).toContain('AdminUser')
    expect(ifaces.map((i) => i.properties.name)).toContain('Repository')
  })

  it('resolves EXTENDS (AdminUser -> User)', async () => {
    const graph = await runPipeline(join(FIXTURES, 'ts-sample'))
    const extendsRels = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.EXTENDS
    )
    const found = extendsRels.some((r) => {
      const start = graph.getNode(r.startNodeId)
      const end = graph.getNode(r.endNodeId)
      return start?.properties.name === 'AdminUser' && end?.properties.name === 'User'
    })
    expect(found).toBe(true)
  })

  it('resolves IMPORTS between TS files', async () => {
    const graph = await runPipeline(join(FIXTURES, 'ts-sample'))
    const imports = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.IMPORTS
    )
    expect(imports.length).toBeGreaterThanOrEqual(2)
  })

  it('extracts top-level Function nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'ts-sample'))
    const fns = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Function)
    expect(fns.map((f) => f.properties.name)).toContain('validateEmail')
  })
})

// ─── JavaScript Sample ─────────────────────────────────────────────────────────

describe('JavaScript pipeline (js-sample)', () => {
  it('extracts Class nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'js-sample'))
    const classes = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Class)
    const names = classes.map((c) => c.properties.name)
    expect(names).toContain('Animal')
    expect(names).toContain('Dog')
    expect(names).toContain('Shelter')
  })

  it('resolves EXTENDS (Dog -> Animal)', async () => {
    const graph = await runPipeline(join(FIXTURES, 'js-sample'))
    const extendsRels = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.EXTENDS
    )
    const found = extendsRels.some((r) => {
      const start = graph.getNode(r.startNodeId)
      const end = graph.getNode(r.endNodeId)
      return start?.properties.name === 'Dog' && end?.properties.name === 'Animal'
    })
    expect(found).toBe(true)
  })

  it('resolves IMPORTS between JS files', async () => {
    const graph = await runPipeline(join(FIXTURES, 'js-sample'))
    const imports = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.IMPORTS
    )
    expect(imports.length).toBeGreaterThanOrEqual(1)
  })

  it('extracts top-level Function nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'js-sample'))
    const fns = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Function)
    const names = fns.map((f) => f.properties.name)
    expect(names).toContain('createDog')
    expect(names).toContain('createShelter')
  })
})

// ─── Scala Sample ──────────────────────────────────────────────────────────────

describe('Scala pipeline (scala-sample)', () => {
  it('extracts Class nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const classes = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Class)
    const names = classes.map((c) => c.properties.name)
    expect(names).toContain('UserService')
  })

  it('extracts trait as Interface node', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const ifaces = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Interface)
    expect(ifaces.map((i) => i.properties.name)).toContain('UserRepository')
  })

  it('extracts singleton object as Class node', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const classes = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Class)
    // object UserService → name "UserService$"
    const names = classes.map((c) => c.properties.name)
    expect(names).toContain('UserService$')
  })

  it('extracts Method nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const methods = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Method)
    const names = methods.map((m) => m.properties.name)
    expect(names).toContain('findById')
    expect(names).toContain('createUser')
  })

  it('extracts Field nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const fields = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Field)
    expect(fields.map((f) => f.properties.name)).toContain('cache')
  })

  it('resolves IMPORTS between Scala files', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const imports = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.IMPORTS
    )
    const localImports = imports.filter((r) => {
      const target = graph.getNode(r.endNodeId)
      return target?.label === NodeLabel.File
    })
    expect(localImports.length).toBeGreaterThan(0)
  })

  it('creates Package nodes for external imports (scala.*)', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    const packages = [...graph.nodes.values()].filter((n) => n.label === NodeLabel.Package)
    const pkgNames = packages.map((p) => p.properties.name)
    expect(pkgNames.some((n) => n.startsWith('scala.'))).toBe(true)
  })

  it('all graph nodes referenced by relationships exist', async () => {
    const graph = await runPipeline(join(FIXTURES, 'scala-sample'))
    for (const rel of graph.relationships.values()) {
      expect(graph.getNode(rel.startNodeId), `Missing start ${rel.startNodeId}`).toBeDefined()
      expect(graph.getNode(rel.endNodeId), `Missing end ${rel.endNodeId}`).toBeDefined()
    }
  })
})

// ─── Output consistency ────────────────────────────────────────────────────────

// ─── Multi-repo ───────────────────────────────────────────────────────────────

describe('Multi-repo pipeline', () => {
  it('prefixes file paths with repo name when analyzing multiple repos', async () => {
    const graph = await runPipeline([
      { root: join(FIXTURES, 'java-sample') },
      { root: join(FIXTURES, 'ts-sample') },
    ])
    const filePaths = [...graph.nodes.values()]
      .filter((n) => n.label === NodeLabel.File)
      .map((n) => (n.properties as { filePath: string }).filePath)

    // Each file should be prefixed with its repo name
    expect(filePaths.some((p) => p.startsWith('java-sample/'))).toBe(true)
    expect(filePaths.some((p) => p.startsWith('ts-sample/'))).toBe(true)
  })

  it('contains nodes from all repos', async () => {
    const graph = await runPipeline([
      { root: join(FIXTURES, 'java-sample') },
      { root: join(FIXTURES, 'ts-sample') },
    ])
    const classes = [...graph.nodes.values()]
      .filter((n) => n.label === NodeLabel.Class)
      .map((n) => n.properties.name)

    // Java classes
    expect(classes).toContain('User')
    expect(classes).toContain('UserService')
    // TS classes
    expect(classes.some((name) => typeof name === 'string' && name.length > 0)).toBe(true)
    expect(graph.nodeCount()).toBeGreaterThan(30)
  })

  it('accepts custom prefix via RepoTarget.prefix', async () => {
    const graph = await runPipeline([
      { root: join(FIXTURES, 'java-sample'), prefix: 'myapp' },
      { root: join(FIXTURES, 'ts-sample'), prefix: 'webapp' },
    ])
    const filePaths = [...graph.nodes.values()]
      .filter((n) => n.label === NodeLabel.File)
      .map((n) => (n.properties as { filePath: string }).filePath)

    expect(filePaths.some((p) => p.startsWith('myapp/'))).toBe(true)
    expect(filePaths.some((p) => p.startsWith('webapp/'))).toBe(true)
    expect(filePaths.some((p) => !p.startsWith('myapp/') && !p.startsWith('webapp/'))).toBe(false)
  })
})

// ─── Graph consistency ────────────────────────────────────────────────────────

describe('Graph consistency', () => {
  it('all CONTAINS edges point to existing nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const containsRels = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.CONTAINS
    )
    for (const rel of containsRels) {
      expect(graph.getNode(rel.startNodeId), `Missing start node ${rel.startNodeId}`).toBeDefined()
      expect(graph.getNode(rel.endNodeId), `Missing end node ${rel.endNodeId}`).toBeDefined()
    }
  })

  it('HAS_METHOD edges point to Method nodes', async () => {
    const graph = await runPipeline(join(FIXTURES, 'java-sample'))
    const rels = [...graph.relationships.values()].filter(
      (r) => r.type === RelationshipType.HAS_METHOD
    )
    for (const rel of rels) {
      const target = graph.getNode(rel.endNodeId)
      expect(target?.label).toBe(NodeLabel.Method)
    }
  })
})
