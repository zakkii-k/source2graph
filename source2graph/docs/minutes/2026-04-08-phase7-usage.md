# 議事録 — 2026-04-08（Phase 7 + Neo4j統合 + 利用ガイド）

## 実施内容

Phase 5〜6完了後、以下を実装・整備した。

---

## Neo4j Docker統合（Phase 4拡張）

### 追加ファイル

| ファイル | 内容 |
|---|---|
| `docker-compose.yml` | Neo4j 5.20-community、APOC、ヘルスチェック、永続ボリューム |
| `src/neo4j/neo4j-importer.ts` | `Neo4jImporter`クラス — `neo4j-driver`でBOLT接続、バッチMERGE（200件/バッチ）、スキーマ（CONSTRAINT）自動適用 |
| `src/neo4j/docker-manager.ts` | `startNeo4j` / `stopNeo4j` / `destroyNeo4j` / `getStatus` / `waitForNeo4j` / `openBrowser` |
| `src/cli/neo4j.ts` | `codenexus neo4j` サブコマンド群 |

### コマンド一覧

```
codenexus neo4j up [--open]
codenexus neo4j down
codenexus neo4j destroy
codenexus neo4j status
codenexus neo4j open
codenexus neo4j import <path> [--uri] [-u] [-p] [--database] [--clear] [--start] [--open] [--verbose]
```

### バグ修正

`openBrowser()` で `spawnSync` に `detached` オプション（非対応）を渡していた問題を修正。
`spawn(...).unref()` に変更し、バックグラウンドでブラウザを起動するようにした。

---

## 利用ガイド作成

`docs/usage.md` を新規作成。以下を網羅:

- CLIセットアップ・インストール
- `analyze` コマンドの全オプションと出力ファイル一覧
- `neo4j` サブコマンド群の使い方（推奨ワークフロー付き）
- `serve` コマンド（MCPサーバー）の使い方
- Claude Code / Cursor への接続設定（`mcp.json`）
- 利用可能なMCPツール・リソース一覧
- 出力ファイルの手動インポート方法（Cypher Shell / Neo4j Browser / neo4j-admin）
- 対応言語・解析内容の対応表

---

## Phase 7: Markdown連携

### 追加ファイル

| ファイル | 内容 |
|---|---|
| `src/core/ingestion/markdown-processor.ts` | MD解析メインモジュール |
| `test/unit/markdown-processor.test.ts` | ユニットテスト（6件）|
| `test/fixtures/md-sample/` | テスト用フィクスチャ（TS + MD）|

### 実装アプローチ

**Approach B** — MDリンク → REFERENCES:
- `[text](path#Lnn)` 形式のリンクを正規表現で抽出
- ファイルパスをMDファイルからの相対パスで解決（外部URL・アンカーのみはスキップ）
- `#Lnn` アンカーがある場合、`SymbolTable.lookupByLine()` で最小包含シンボルを特定
- アンカーなしの場合はFileノードへのREFERENCES
- リンクが存在するセクション（見出し）を起点ノードとする（セクション外はFileノードが起点）

**Approach C** — YAMLフロントマター → DOCUMENTS:
- `---...---` ブロックを手動パース（依存ライブラリ追加なし）
- `codenexus.describes: SymbolName` または `- SymbolName` リスト形式に対応
- `SymbolTable.lookupByName()` でシンボルを解決 → DOCUMENTSリレーション追加

**Section ノード**:
- `#`〜`######` の見出しをスキャンしてSectionノードを生成
- FileノードとSectionノードの間にCONTAINSリレーションを追加
- フロントマター行数を考慮して行番号を正確に算出

### パイプライン統合

- `file-walker.ts` に `walkMarkdownFiles()` を追加
- `pipeline.ts` を5フェーズに拡張（`[5/5] Processing N markdown files...`）
- シンボル解決フェーズ（Phase 3〜4）完了後にMarkdownを処理することでルックアップ精度を確保

### テスト結果

```
Test Files: 5 passed
Tests:      49 passed (0 failed)
Duration:   ~1.0s
```

### 動作確認（md-sampleフィクスチャ）

```
[1/5] Walking files...
      Found 1 source files, 1 markdown files
[5/5] Processing 1 markdown files...
      [MD] Section "Calculator" in docs/calculator.md
      [MD] Section "Usage" in docs/calculator.md
      [MD] Section "Addition" in docs/calculator.md
      [MD] Section "Multiplication" in docs/calculator.md
      [MD] DOCUMENTS docs/calculator.md → Calculator
      [MD] REFERENCES "Calculator source" → src/calculator.ts
      [MD] REFERENCES "add method" → src/calculator.ts#L2
      [MD] REFERENCES "multiply function" → src/calculator.ts#L11

Nodes: 12  Relationships: 14
```

---

## 現在の実装状態

| フェーズ | 状態 |
|---|---|
| Phase 0: スキャフォールディング | ✅ 完了 |
| Phase 1: ファイル走査 + 構造解析 | ✅ 完了 |
| Phase 2: Tree-sitter構文解析 + シンボル抽出 | ✅ 完了 |
| Phase 3: クロスファイルリレーション解決 | ✅ 完了 |
| Phase 4: Neo4j CSV / Cypher出力 + Docker統合 | ✅ 完了 |
| Phase 5: テスト + CLI整備 | ✅ 完了 |
| Phase 6: MCPサーバー | ✅ 完了 |
| Phase 7: Markdown連携 | ✅ 完了 |
