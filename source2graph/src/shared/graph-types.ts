// Node labels in the knowledge graph
export const NodeLabel = {
  File: 'File',
  Folder: 'Folder',
  Class: 'Class',
  Interface: 'Interface',
  Method: 'Method',
  Function: 'Function',
  Field: 'Field',
  Section: 'Section',
  Package: 'Package',
  Table: 'Table',
  SqlStatement: 'SqlStatement',
} as const

export type NodeLabel = (typeof NodeLabel)[keyof typeof NodeLabel]

// Relationship types in the knowledge graph
export const RelationshipType = {
  CONTAINS: 'CONTAINS',
  HAS_METHOD: 'HAS_METHOD',
  HAS_PROPERTY: 'HAS_PROPERTY',
  CALLS: 'CALLS',
  EXTENDS: 'EXTENDS',
  IMPLEMENTS: 'IMPLEMENTS',
  IMPORTS: 'IMPORTS',
  REFERENCES: 'REFERENCES',
  DOCUMENTS: 'DOCUMENTS',
  // MyBatis / CRUD
  MAPPED_TO: 'MAPPED_TO',       // Java Mapper method → SqlStatement
  CRUD_CREATES: 'CRUD_CREATES', // SqlStatement → Table
  CRUD_READS: 'CRUD_READS',     // SqlStatement → Table
  CRUD_UPDATES: 'CRUD_UPDATES', // SqlStatement → Table
  CRUD_DELETES: 'CRUD_DELETES', // SqlStatement → Table
  FILTERS_BY: 'FILTERS_BY',    // SqlStatement → Table (WHERE columns)
} as const

export type RelationshipType = (typeof RelationshipType)[keyof typeof RelationshipType]

// Base properties shared by all nodes
export interface BaseNodeProperties {
  nodeId: string
  name: string
}

export interface FileNodeProperties extends BaseNodeProperties {
  filePath: string
  language: string
  extension: string
}

export interface FolderNodeProperties extends BaseNodeProperties {
  folderPath: string
}

export interface ClassNodeProperties extends BaseNodeProperties {
  qualifiedName: string
  filePath: string
  startLine: number
  endLine: number
  visibility: string
  isAbstract: boolean
  isStatic: boolean
  language: string
}

export interface InterfaceNodeProperties extends BaseNodeProperties {
  qualifiedName: string
  filePath: string
  startLine: number
  endLine: number
  visibility: string
  language: string
}

export interface MethodNodeProperties extends BaseNodeProperties {
  qualifiedName: string
  filePath: string
  startLine: number
  endLine: number
  visibility: string
  isStatic: boolean
  isAsync: boolean
  returnType: string
  paramCount: number
  language: string
  // MyBatis: set when the method belongs to a *Mapper / *Dao interface
  isMybatisMapper?: boolean
  isMybatisGenerated?: boolean
  crudOperation?: 'C' | 'R' | 'U' | 'D'
}

export interface FunctionNodeProperties extends BaseNodeProperties {
  filePath: string
  startLine: number
  endLine: number
  isAsync: boolean
  isExported: boolean
  returnType: string
  paramCount: number
  language: string
}

export interface FieldNodeProperties extends BaseNodeProperties {
  filePath: string
  startLine: number
  visibility: string
  isStatic: boolean
  fieldType: string
  language: string
}

export interface SectionNodeProperties extends BaseNodeProperties {
  heading: string
  level: number
  filePath: string
  startLine: number
  endLine: number
}

export interface PackageNodeProperties extends BaseNodeProperties {
  packageName: string
}

export interface TableNodeProperties extends BaseNodeProperties {
  /** Lowercase table name as it appears in SQL */
  tableName: string
}

export interface SqlStatementNodeProperties extends BaseNodeProperties {
  /** The id attribute from the XML element (= Java method name) */
  statementId: string
  /** C | R | U | D */
  operation: 'C' | 'R' | 'U' | 'D'
  /** mapper namespace attribute (Java interface FQN) */
  mapperNamespace: string
  filePath: string
  /** Raw SQL text (trimmed, first 500 chars) */
  sql: string
  /** true if the statement id matches known MyBatis Generator patterns */
  isMybatisGenerated: boolean
  /** Comma-separated column names found in WHERE clause */
  whereColumns: string
}

export type NodeProperties =
  | FileNodeProperties
  | FolderNodeProperties
  | ClassNodeProperties
  | InterfaceNodeProperties
  | MethodNodeProperties
  | FunctionNodeProperties
  | FieldNodeProperties
  | SectionNodeProperties
  | PackageNodeProperties
  | TableNodeProperties
  | SqlStatementNodeProperties

export interface GraphNode {
  label: NodeLabel
  properties: NodeProperties
}

export interface BaseRelationshipProperties {
  relId: string
}

export interface CallsRelationshipProperties extends BaseRelationshipProperties {
  confidence: number
}

export interface ImportsRelationshipProperties extends BaseRelationshipProperties {
  importPath: string
}

export interface ReferencesRelationshipProperties extends BaseRelationshipProperties {
  linkText: string
  approach: string
}

export interface DocumentsRelationshipProperties extends BaseRelationshipProperties {
  describes: string
}

export type RelationshipProperties =
  | BaseRelationshipProperties
  | CallsRelationshipProperties
  | ImportsRelationshipProperties
  | ReferencesRelationshipProperties
  | DocumentsRelationshipProperties

export interface GraphRelationship {
  type: RelationshipType
  startNodeId: string
  endNodeId: string
  properties: RelationshipProperties
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>
  relationships: Map<string, GraphRelationship>
  addNode(node: GraphNode): void
  addRelationship(rel: GraphRelationship): void
  getNode(nodeId: string): GraphNode | undefined
  getRelationshipsByStartNode(nodeId: string): GraphRelationship[]
  getRelationshipsByEndNode(nodeId: string): GraphRelationship[]
  nodeCount(): number
  relationshipCount(): number
}
