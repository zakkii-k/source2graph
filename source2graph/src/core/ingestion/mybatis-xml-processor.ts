/**
 * mybatis-xml-processor.ts
 *
 * MyBatis Mapper XML ファイルを解析して以下をグラフに追加する:
 *  - SqlStatement ノード (select/insert/update/delete 要素ごとに1つ)
 *  - Table ノード (SQL から抽出したテーブル名)
 *  - CRUD_CREATES/READS/UPDATES/DELETES エッジ (SqlStatement → Table)
 *  - FILTERS_BY エッジ (SqlStatement → Table, WHERE カラム情報付き)
 *  - MAPPED_TO エッジ (Java Mapper Method → SqlStatement)
 */

import { readFileSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'
import type { KnowledgeGraph } from '../../shared/graph-types.js'
import { NodeLabel, RelationshipType } from '../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId } from '../../shared/utils.js'
import type { SymbolTable } from './symbol-table.js'
import type { WalkedFile } from './file-walker.js'

// ── MyBatis Generator の既知メソッド名 ────────────────────────────
const MBG_METHOD_NAMES = new Set([
  'insert', 'insertSelective',
  'selectByPrimaryKey', 'selectByExample', 'selectAll', 'selectByExampleWithRowbounds',
  'countByExample',
  'updateByPrimaryKey', 'updateByPrimaryKeySelective',
  'updateByExample', 'updateByExampleSelective',
  'deleteByPrimaryKey', 'deleteByExample',
])

function isMbgGenerated(statementId: string): boolean {
  return MBG_METHOD_NAMES.has(statementId)
}

// ── SQL タグ種別 → CRUD 分類 ──────────────────────────────────────
const TAG_TO_CRUD: Record<string, 'C' | 'R' | 'U' | 'D'> = {
  select: 'R',
  insert: 'C',
  update: 'U',
  delete: 'D',
}

// ── SQL からテーブル名を抽出 ──────────────────────────────────────
function extractTableName(sql: string, operation: 'C' | 'R' | 'U' | 'D'): string | null {
  const s = sql.replace(/\s+/g, ' ').toUpperCase()
  let m: RegExpMatchArray | null = null
  if (operation === 'R') m = s.match(/\bFROM\s+([A-Z_][A-Z0-9_]*)/)
  if (operation === 'C') m = s.match(/\bINTO\s+([A-Z_][A-Z0-9_]*)/)
  if (operation === 'U') m = s.match(/\bUPDATE\s+([A-Z_][A-Z0-9_]*)/)
  if (operation === 'D') m = s.match(/\bFROM\s+([A-Z_][A-Z0-9_]*)/)
  return m ? m[1].toLowerCase() : null
}

// ── WHERE 句のカラム名を抽出 ──────────────────────────────────────
const SQL_KEYWORDS = new Set([
  'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'BETWEEN', 'LIKE',
  'EXISTS', 'ALL', 'ANY', 'SOME', 'SELECT', 'FROM', 'WHERE',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'SET', 'INTO', 'VALUES',
])

function extractWhereColumns(sql: string): string[] {
  const columns = new Set<string>()

  // MyBatis パラメータ参照 #{...} / ${...} の直前にあるカラム名を拾う
  // 例: "AND user_id = #{userId}" → user_id
  const paramPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]=?\s*[#$]\{/g
  let m: RegExpExecArray | null
  while ((m = paramPattern.exec(sql)) !== null) {
    const col = m[1].toUpperCase()
    if (!SQL_KEYWORDS.has(col) && col.length > 1) columns.add(m[1].toLowerCase())
  }

  // WHERE / AND / OR の後ろにあるカラム名を拾う（より広めに）
  const condPattern = /\b(?:WHERE|AND|OR)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/gi
  while ((m = condPattern.exec(sql)) !== null) {
    const col = m[1].toUpperCase()
    if (!SQL_KEYWORDS.has(col) && col.length > 1) columns.add(m[1].toLowerCase())
  }

  return [...columns].sort()
}

// ── XML 要素を平坦化する再帰ヘルパー ─────────────────────────────
// fast-xml-parser は入れ子要素を子オブジェクトとして返す。
// SQL テキスト（MyBatis タグ内部のテキスト）を平坦な文字列として得る。
function flattenToText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenToText).join(' ')
  if (node && typeof node === 'object') {
    return Object.values(node as Record<string, unknown>).map(flattenToText).join(' ')
  }
  return ''
}

// ── メイン処理 ───────────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  parseTagValue: false,   // text を文字列のまま保持
  trimValues: true,
  isArray: (tagName) =>
    ['select', 'insert', 'update', 'delete', 'resultMap', 'sql'].includes(tagName),
})

export function processMybatisXml(
  graph: KnowledgeGraph,
  symbolTable: SymbolTable,
  xmlFiles: WalkedFile[],
  options: { verbose?: boolean } = {},
): void {
  const { verbose = false } = options

  // Table ノードは複数ファイルにまたがって共有（テーブル名がキー）
  const tableNodeIds = new Map<string, string>()

  function ensureTable(tableName: string): string {
    if (tableNodeIds.has(tableName)) return tableNodeIds.get(tableName)!
    const nodeId = generateNodeId(NodeLabel.Table, '__table__', tableName)
    graph.addNode({
      label: NodeLabel.Table,
      properties: { nodeId, name: tableName, tableName },
    })
    tableNodeIds.set(tableName, nodeId)
    return nodeId
  }

  for (const file of xmlFiles) {
    try {
      const source = readFileSync(file.absolutePath, 'utf-8')

      // <mapper> ルート要素がないファイルはスキップ
      if (!source.includes('<mapper')) continue

      const parsed = parser.parse(source) as Record<string, unknown>
      const mapperEl = parsed['mapper'] as Record<string, unknown> | undefined
      if (!mapperEl) continue

      const namespace = (mapperEl['@_namespace'] as string | undefined) ?? ''
      if (!namespace) continue

      for (const [tag, crud] of Object.entries(TAG_TO_CRUD) as [string, 'C' | 'R' | 'U' | 'D'][]) {
        const elements = mapperEl[tag]
        if (!elements) continue
        const items = Array.isArray(elements) ? elements : [elements]

        for (const el of items) {
          if (!el || typeof el !== 'object') continue
          const elObj = el as Record<string, unknown>
          const statementId = (elObj['@_id'] as string | undefined) ?? ''
          if (!statementId) continue

          // SQL テキストを平坦化して取得
          const sqlRaw = flattenToText(elObj).replace(/\s+/g, ' ').trim()
          const sql = sqlRaw.slice(0, 500)

          const tableName = extractTableName(sqlRaw, crud)
          const whereColumns = crud !== 'C' ? extractWhereColumns(sqlRaw) : []
          const isGenerated = isMbgGenerated(statementId)

          // SqlStatement ノード作成
          const stmtNodeId = generateNodeId(NodeLabel.SqlStatement, file.relativePath, `${namespace}#${statementId}`)
          graph.addNode({
            label: NodeLabel.SqlStatement,
            properties: {
              nodeId: stmtNodeId,
              name: statementId,
              statementId,
              operation: crud,
              mapperNamespace: namespace,
              filePath: file.relativePath,
              sql,
              isMybatisGenerated: isGenerated,
              whereColumns: whereColumns.join(','),
            },
          })

          if (tableName) {
            const tableNodeId = ensureTable(tableName)

            // CRUD エッジ: SqlStatement → Table
            const crudRelType = (
              crud === 'C' ? RelationshipType.CRUD_CREATES
              : crud === 'R' ? RelationshipType.CRUD_READS
              : crud === 'U' ? RelationshipType.CRUD_UPDATES
              : RelationshipType.CRUD_DELETES
            )
            graph.addRelationship({
              type: crudRelType,
              startNodeId: stmtNodeId,
              endNodeId: tableNodeId,
              properties: {
                relId: generateRelationshipId(crudRelType, stmtNodeId, tableNodeId),
              },
            })

            // FILTERS_BY エッジ: WHERE カラムがある場合
            if (whereColumns.length > 0) {
              const filtRelId = generateRelationshipId(RelationshipType.FILTERS_BY, stmtNodeId, tableNodeId)
              graph.addRelationship({
                type: RelationshipType.FILTERS_BY,
                startNodeId: stmtNodeId,
                endNodeId: tableNodeId,
                properties: { relId: filtRelId, columns: whereColumns.join(',') } as never,
              })
            }
          }

          // MAPPED_TO エッジ: Java Mapper Method → SqlStatement
          // namespace の末尾部分がインターフェース名、statementId がメソッド名で検索
          const ifaceName = namespace.split('.').pop() ?? namespace
          const methodCandidates = symbolTable.lookupByName(statementId).filter(
            (s) => s.label === NodeLabel.Method && s.qualifiedName?.startsWith(namespace),
          )
          // qualifiedName でヒットしなければインターフェース名で緩く探す
          const fallbackCandidates = methodCandidates.length === 0
            ? symbolTable.lookupByName(statementId).filter(
                (s) => s.label === NodeLabel.Method && s.qualifiedName?.includes(ifaceName),
              )
            : []
          const candidates = methodCandidates.length > 0 ? methodCandidates : fallbackCandidates

          for (const method of candidates) {
            const relId = generateRelationshipId(RelationshipType.MAPPED_TO, method.nodeId, stmtNodeId)
            graph.addRelationship({
              type: RelationshipType.MAPPED_TO,
              startNodeId: method.nodeId,
              endNodeId: stmtNodeId,
              properties: { relId },
            })
          }

          if (verbose) {
            console.log(`        [mybatis] ${namespace}#${statementId} [${crud}] → ${tableName ?? '?'}`)
          }
        }
      }
    } catch (err) {
      if (verbose) console.warn(`        [mybatis] skipped ${file.relativePath}: ${err}`)
    }
  }
}
