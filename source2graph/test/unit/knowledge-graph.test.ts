import { describe, it, expect, beforeEach } from 'vitest'
import { createKnowledgeGraph } from '../../src/core/graph/knowledge-graph.js'
import { NodeLabel, RelationshipType } from '../../src/shared/graph-types.js'

describe('createKnowledgeGraph', () => {
  it('starts empty', () => {
    const g = createKnowledgeGraph()
    expect(g.nodeCount()).toBe(0)
    expect(g.relationshipCount()).toBe(0)
  })

  it('addNode stores and retrieves nodes', () => {
    const g = createKnowledgeGraph()
    g.addNode({
      label: NodeLabel.Class,
      properties: {
        nodeId: 'Class:src/Foo.java:Foo',
        name: 'Foo',
        qualifiedName: 'Foo',
        filePath: 'src/Foo.java',
        startLine: 1,
        endLine: 10,
        visibility: 'public',
        isAbstract: false,
        isStatic: false,
        language: 'java',
      },
    })
    expect(g.nodeCount()).toBe(1)
    const node = g.getNode('Class:src/Foo.java:Foo')
    expect(node).toBeDefined()
    expect(node?.label).toBe(NodeLabel.Class)
    expect(node?.properties.name).toBe('Foo')
  })

  it('addRelationship stores edges', () => {
    const g = createKnowledgeGraph()
    g.addRelationship({
      type: RelationshipType.CALLS,
      startNodeId: 'Method:a:foo',
      endNodeId: 'Method:b:bar',
      properties: { relId: 'rel1', confidence: 0.9 },
    })
    expect(g.relationshipCount()).toBe(1)
  })

  it('deduplicate relationships by relId', () => {
    const g = createKnowledgeGraph()
    const rel = {
      type: RelationshipType.EXTENDS,
      startNodeId: 'Class:a:A',
      endNodeId: 'Class:b:B',
      properties: { relId: 'same-id' },
    }
    g.addRelationship(rel)
    g.addRelationship(rel)
    expect(g.relationshipCount()).toBe(1)
  })

  it('getRelationshipsByStartNode returns outgoing edges', () => {
    const g = createKnowledgeGraph()
    g.addRelationship({
      type: RelationshipType.CALLS,
      startNodeId: 'Method:a:foo',
      endNodeId: 'Method:b:bar',
      properties: { relId: 'r1', confidence: 1.0 },
    })
    g.addRelationship({
      type: RelationshipType.CALLS,
      startNodeId: 'Method:a:foo',
      endNodeId: 'Method:c:baz',
      properties: { relId: 'r2', confidence: 0.7 },
    })
    const rels = g.getRelationshipsByStartNode('Method:a:foo')
    expect(rels).toHaveLength(2)
  })

  it('getRelationshipsByEndNode returns incoming edges', () => {
    const g = createKnowledgeGraph()
    g.addRelationship({
      type: RelationshipType.IMPLEMENTS,
      startNodeId: 'Class:a:Impl',
      endNodeId: 'Interface:b:IFoo',
      properties: { relId: 'r1' },
    })
    const rels = g.getRelationshipsByEndNode('Interface:b:IFoo')
    expect(rels).toHaveLength(1)
    expect(rels[0].startNodeId).toBe('Class:a:Impl')
  })
})
