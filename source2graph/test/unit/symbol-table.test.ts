import { describe, it, expect } from 'vitest'
import { createSymbolTable } from '../../src/core/ingestion/symbol-table.js'
import { NodeLabel } from '../../src/shared/graph-types.js'

const makeSym = (overrides = {}) => ({
  nodeId: 'Class:src/Foo.java:Foo',
  name: 'Foo',
  qualifiedName: 'com.example.Foo',
  label: NodeLabel.Class as typeof NodeLabel.Class,
  filePath: 'src/Foo.java',
  startLine: 1,
  endLine: 20,
  ...overrides,
})

describe('createSymbolTable', () => {
  it('lookupByName returns defined symbols', () => {
    const st = createSymbolTable()
    st.define(makeSym())
    const results = st.lookupByName('Foo')
    expect(results).toHaveLength(1)
    expect(results[0].qualifiedName).toBe('com.example.Foo')
  })

  it('lookupByName returns empty array for unknown name', () => {
    const st = createSymbolTable()
    expect(st.lookupByName('Unknown')).toHaveLength(0)
  })

  it('lookupByQualifiedName finds by qualified name', () => {
    const st = createSymbolTable()
    st.define(makeSym())
    const sym = st.lookupByQualifiedName('com.example.Foo')
    expect(sym).toBeDefined()
    expect(sym?.name).toBe('Foo')
  })

  it('lookupByFile returns symbols for that file', () => {
    const st = createSymbolTable()
    st.define(makeSym({ name: 'Foo', nodeId: 'n1', qualifiedName: 'Foo' }))
    st.define(makeSym({ name: 'Bar', nodeId: 'n2', qualifiedName: 'Bar', filePath: 'src/Bar.java' }))
    const results = st.lookupByFile('src/Foo.java')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Foo')
  })

  it('lookupByFile with label filter narrows results', () => {
    const st = createSymbolTable()
    st.define(makeSym({ name: 'Foo', nodeId: 'c1', label: NodeLabel.Class }))
    st.define(makeSym({ name: 'doThing', nodeId: 'm1', label: NodeLabel.Method, qualifiedName: 'Foo.doThing', startLine: 5, endLine: 8 }))
    const classes = st.lookupByFile('src/Foo.java', NodeLabel.Class)
    expect(classes).toHaveLength(1)
    expect(classes[0].name).toBe('Foo')
  })

  it('lookupByLine finds the narrowest containing symbol', () => {
    const st = createSymbolTable()
    st.define(makeSym({ nodeId: 'c1', startLine: 1, endLine: 30 })) // outer class
    st.define(makeSym({ nodeId: 'm1', name: 'doThing', qualifiedName: 'Foo.doThing', label: NodeLabel.Method, startLine: 5, endLine: 12 }))
    const sym = st.lookupByLine('src/Foo.java', 7)
    expect(sym?.nodeId).toBe('m1') // narrowest match
  })

  it('lookupByLine returns undefined for unmatched line', () => {
    const st = createSymbolTable()
    st.define(makeSym({ startLine: 1, endLine: 10 }))
    expect(st.lookupByLine('src/Foo.java', 99)).toBeUndefined()
  })

  it('all() returns every defined symbol', () => {
    const st = createSymbolTable()
    st.define(makeSym({ nodeId: 'n1', qualifiedName: 'A' }))
    st.define(makeSym({ nodeId: 'n2', qualifiedName: 'B' }))
    expect(st.all()).toHaveLength(2)
  })
})
