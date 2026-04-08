import { describe, it, expect } from 'vitest'
import { generateNodeId, generateRelationshipId, escapeCsvValue, toCsvLine, normalizeFilePath } from '../../src/shared/utils.js'

describe('generateNodeId', () => {
  it('produces a deterministic ID', () => {
    const id1 = generateNodeId('Class', 'src/Foo.java', 'com.example.Foo')
    const id2 = generateNodeId('Class', 'src/Foo.java', 'com.example.Foo')
    expect(id1).toBe(id2)
  })

  it('includes label, path, and qualifiedName', () => {
    const id = generateNodeId('Method', 'src/Bar.ts', 'Bar.doThing')
    expect(id).toBe('Method:src/Bar.ts:Bar.doThing')
  })

  it('normalizes path separators', () => {
    const id = generateNodeId('File', 'src\\com\\Foo.java', 'src/com/Foo.java')
    expect(id).not.toContain('\\')
  })
})

describe('generateRelationshipId', () => {
  it('produces a deterministic 16-char hex ID', () => {
    const id1 = generateRelationshipId('CALLS', 'A', 'B')
    const id2 = generateRelationshipId('CALLS', 'A', 'B')
    expect(id1).toBe(id2)
    expect(id1).toHaveLength(16)
  })

  it('differs for different inputs', () => {
    expect(generateRelationshipId('CALLS', 'A', 'B')).not.toBe(generateRelationshipId('CALLS', 'A', 'C'))
  })
})

describe('escapeCsvValue', () => {
  it('passes through simple strings', () => {
    expect(escapeCsvValue('hello')).toBe('hello')
  })

  it('wraps strings containing commas in quotes', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
  })

  it('escapes inner double quotes', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
  })

  it('handles null and undefined as empty string', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })

  it('converts booleans to string', () => {
    expect(escapeCsvValue(true)).toBe('true')
    expect(escapeCsvValue(false)).toBe('false')
  })
})

describe('toCsvLine', () => {
  it('joins values with commas', () => {
    expect(toCsvLine(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('handles mixed types', () => {
    expect(toCsvLine(['name', 42, true, null])).toBe('name,42,true,')
  })
})
