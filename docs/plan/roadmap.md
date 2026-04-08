# CodeNexus — ロードマップ

## フェーズ概要

```
Phase 0  スキャフォールディング
Phase 1  ファイル走査 + 構造解析
Phase 2  Tree-sitter構文解析 + シンボル抽出    ← コアMVP
Phase 3  クロスファイルリレーション解決
Phase 4  Neo4j出力                              ← MVP完成
Phase 5  テスト + CLI整備
──── MVP完成ライン ────────────────────────────────────────
Phase 6  MCPサーバー
Phase 7  Markdown連携
Phase X  拡張（追加言語・Web UI等）
```

---

## Phase 0: スキャフォールディング

### 目標
プロジェクト基盤の構築

### タスク
- [ ] `codenexus/` ディレクトリ作成
- [ ] `package.json` 初期化（TypeScript / tsx / vitest / commander）
- [ ] `tsconfig.json` 設定
- [ ] `src/shared/graph-types.ts` — NodeLabel / RelationshipType / GraphNode / GraphRelationship の型定義
- [ ] `src/shared/language-types.ts` — SupportedLanguage enum / getLanguageFromFilename()
- [ ] `src/shared/utils.ts` — generateNodeId() / normalizeFilePath()
- [ ] `src/core/graph/knowledge-graph.ts` — createKnowledgeGraph() （Map型インメモリグラフ）

### 完了条件
`npx tsx src/cli/index.ts --version` が動作する

---

## Phase 1: ファイル走査 + 構造解析

### 目標
対象リポジトリのファイル構造をグラフ化

### タスク
- [ ] `src/core/ingestion/file-walker.ts` — fast-glob + ignore ライブラリ統合
- [ ] `.codenexusignore` / `.gitignore` サポート
- [ ] `src/core/ingestion/structure-processor.ts` — File / Folder ノード + CONTAINS リレーション生成
- [ ] CLI骨格: `codenexus analyze <path>` → ノード数のコンソール出力

### 完了条件
任意のリポジトリに対して `codenexus analyze .` を実行するとFile/Folderノード数が表示される

---

## Phase 2: Tree-sitter構文解析 + シンボル抽出

### 目標
各ソースファイルからClass / Interface / Method / Function / Field ノードを抽出

### タスク
- [ ] `src/core/tree-sitter/parser-loader.ts` — tree-sitterの3言語ローダー
- [ ] `src/core/ingestion/language-provider.ts` — LanguageProvider インターフェース定義
- [ ] `src/core/ingestion/tree-sitter-queries.ts` — Java / TS / JS のS式クエリ文字列
- [ ] `src/core/ingestion/symbol-table.ts` — シンボルテーブル（名前 → ノード のマップ）
- [ ] `src/core/ingestion/parsing-processor.ts` — 汎用ASTクエリランナー
- [ ] `src/core/ingestion/languages/java.ts` — Javaプロバイダ実装
- [ ] `src/core/ingestion/languages/typescript.ts` — TypeScriptプロバイダ実装
- [ ] `src/core/ingestion/languages/javascript.ts` — JavaScriptプロバイダ実装

### 完了条件
サンプルJavaプロジェクトを解析し、Class / Method ノードが正しく抽出される

---

## Phase 3: クロスファイルリレーション解決

### 目標
ファイル間の依存関係・継承・呼び出し関係をリレーションとして解決

### タスク
- [ ] `src/core/ingestion/import-processor.ts` — IMPORTS エッジ（相対パス解決 / Java完全修飾名）
- [ ] `src/core/ingestion/heritage-processor.ts` — EXTENDS / IMPLEMENTS エッジ
- [ ] `src/core/ingestion/call-processor.ts` — CALLS エッジ（信頼度スコア付き）
- [ ] `src/core/ingestion/pipeline.ts` — 全フェーズを順番に実行するオーケストレーター

### 完了条件
クラス継承・インターフェース実装・メソッド呼び出しのリレーションが正しく生成される

---

## Phase 4: Neo4j出力（MVP完成）

### 目標
グラフをNeo4j互換ファイルとして出力

### タスク
- [ ] `src/output/csv-writer.ts` — ラベル/タイプ別CSVストリーミング出力（メモリ効率重視）
- [ ] `src/output/cypher-writer.ts` — バッチMERGE文生成（500件/バッチ）
- [ ] `src/output/schema-generator.ts` — CREATE CONSTRAINT / CREATE INDEX
- [ ] `src/output/import-script-generator.ts` — `neo4j-import.sh` 自動生成
- [ ] `src/output/output-coordinator.ts` — フォーマット選択・全ライター統括
- [ ] CLI更新: `--output <dir>` `--format csv|cypher|both` オプション追加

### 完了条件
```bash
codenexus analyze ./sample-project --output ./output --format both
```
実行後、Neo4j Desktop で CSV インポートが成功し、Cypherクエリで期待通りのグラフが取得できる

---

## Phase 5: テスト + CLI整備

### 目標
品質保証・使いやすいCLI

### タスク
- [ ] `test/fixtures/java-sample/` — 小規模Javaサンプル（クラス3〜5個、継承あり、呼び出しあり）
- [ ] `test/fixtures/ts-sample/` — TypeScriptサンプル
- [ ] `test/fixtures/js-sample/` — JavaScriptサンプル
- [ ] `test/unit/` — 各プロセッサの単体テスト
- [ ] `test/integration/pipeline.test.ts` — フルパイプラインの統合テスト
- [ ] プログレスバー（cli-progress）追加
- [ ] `--verbose` フラグ（ファイル別ログ表示）
- [ ] README + スキーマドキュメント

### 完了条件
`vitest run` 全テストパス

---

## Phase 6: MCPサーバー（Future）

### 目標
AIエージェントがCodeNexusのグラフを直接クエリできるMCPサーバー

### 概要
- `codenexus serve` コマンドでstdio MCPサーバー起動
- 分析結果を `graph.json` にシリアライズ、起動時にロード
- `@modelcontextprotocol/sdk` の `StdioServerTransport` を使用

### 初期ツール（5種）
| ツール | 説明 |
|---|---|
| `analyze` | 指定パスを解析（再実行可）|
| `query_nodes` | ラベル / 名前パターン / ファイルパスでノード検索 |
| `get_callers` | 指定シンボルを呼び出しているノードを取得 |
| `get_callees` | 指定シンボルが呼び出しているノードを取得 |
| `get_context` | シンボルの360度ビュー（親/子/呼び出し元/呼び出し先）|

### 公開リソース
| URI | 内容 |
|---|---|
| `codenexus://graph/schema` | ノードラベル・リレーション型・プロパティ定義 |
| `codenexus://graph/stats` | ラベル/タイプ別ノード・リレーション数 |
| `codenexus://graph/nodes/{label}` | 指定ラベルの全ノード一覧 |

---

## Phase 7: Markdown連携（Future）

詳細は [md-integration.md](md-integration.md) を参照。

### 優先実装順
1. **Approach B**: MDリンク `[text](path#L45)` → 行番号でノード特定 → REFERENCES（ノイズゼロ）
2. **Approach C**: YAML frontmatterで明示マッピング → DOCUMENTS（クエリしやすい）

---

## Phase X: 将来的な拡張

- 対応言語の追加（Python / Go / Kotlin / C# / Rust）
- コミュニティ検出（Leidenアルゴリズムによるクラスタリング）
- 実行フロートレース（エントリーポイント → コールチェーン）
- BM25 + セマンティック検索
- Web UIによるグラフ可視化（Sigma.js + Graphology）
- git差分連携（変更影響範囲の自動解析）
