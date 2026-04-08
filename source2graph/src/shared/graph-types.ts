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
