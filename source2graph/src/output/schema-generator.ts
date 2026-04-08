import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { NodeLabel } from '../shared/graph-types.js'

const SCHEMA_CYPHER = `// source2graph — Schema: Constraints and Indexes
// Run this file before importing nodes and relationships.

// ── Uniqueness constraints (one per node label) ──────────────────────────────
CREATE CONSTRAINT cn_file      IF NOT EXISTS FOR (n:File)      REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_folder    IF NOT EXISTS FOR (n:Folder)    REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_class     IF NOT EXISTS FOR (n:Class)     REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_interface IF NOT EXISTS FOR (n:Interface) REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_method    IF NOT EXISTS FOR (n:Method)    REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_function  IF NOT EXISTS FOR (n:Function)  REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_field     IF NOT EXISTS FOR (n:Field)     REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_section   IF NOT EXISTS FOR (n:Section)   REQUIRE n.nodeId IS UNIQUE;
CREATE CONSTRAINT cn_package   IF NOT EXISTS FOR (n:Package)   REQUIRE n.nodeId IS UNIQUE;

// ── Property indexes (commonly queried fields) ────────────────────────────────
CREATE INDEX cn_idx_file_path       IF NOT EXISTS FOR (n:File)      ON (n.filePath);
CREATE INDEX cn_idx_class_name      IF NOT EXISTS FOR (n:Class)     ON (n.name);
CREATE INDEX cn_idx_class_qname     IF NOT EXISTS FOR (n:Class)     ON (n.qualifiedName);
CREATE INDEX cn_idx_interface_name  IF NOT EXISTS FOR (n:Interface) ON (n.name);
CREATE INDEX cn_idx_method_name     IF NOT EXISTS FOR (n:Method)    ON (n.name);
CREATE INDEX cn_idx_function_name   IF NOT EXISTS FOR (n:Function)  ON (n.name);
CREATE INDEX cn_idx_field_name      IF NOT EXISTS FOR (n:Field)     ON (n.name);
CREATE INDEX cn_idx_package_name    IF NOT EXISTS FOR (n:Package)   ON (n.packageName);
`

export function writeSchema(outputDir: string): string {
  mkdirSync(outputDir, { recursive: true })
  const schemaFile = join(outputDir, 'cypher_schema.txt')
  writeFileSync(schemaFile, SCHEMA_CYPHER, 'utf-8')
  return schemaFile
}
