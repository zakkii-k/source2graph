# CodeNexus — 技術スタック

## コアライブラリ

### 構文解析（Parsing）

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `tree-sitter` | ^0.21.1 | MIT | AST解析エンジン本体 |
| `tree-sitter-java` | ^0.23.5 | MIT | Javaグラマー |
| `tree-sitter-typescript` | ^0.23.2 | MIT | TypeScript / TSXグラマー |
| `tree-sitter-javascript` | ^0.23.0 | MIT | JavaScriptグラマー |

**選定理由:**
- GitNexus本体が実証済みの組み合わせ
- 単一の抽象API（Parser + Language）で全言語を統一的に扱える
- S式ベースのクエリ文字列（宣言的）でAST抽出ロジックを記述可能
- エラーリカバリー対応（構文エラーのあるファイルも部分的に解析可能）
- 代替（@babel/parser）はJS/TSのみでJavaに対応しないため不採用

**注意点:** ネイティブモジュール（node-gyp）が必要。Node.js 20向けプリビルドバイナリが配布されており通常はnode-gyp不要。

---

### ファイル走査

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `fast-glob` | ^3.3.x | MIT | ファイルパターンマッチング |
| `ignore` | ^5.x | MIT | .gitignore / .codenexusignore 対応 |

---

### 出力

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `csv-stringify` | ^6.x | MIT/Apache-2.0 | Neo4j bulk import CSV生成 |

> シンプルなスキーマ（バイナリデータなし）のため自前実装も可。依存を減らしたい場合は不要。

---

### CLI

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `commander` | ^12.x | MIT | CLIコマンド定義・引数解析 |
| `cli-progress` | ^3.x | MIT | プログレスバー表示 |

---

### ランタイム / ビルド

| ツール | バージョン | ライセンス | 用途 |
|---|---|---|---|
| Node.js | 20+ | MIT | 実行環境 |
| TypeScript | ^5.4 | Apache-2.0 | 型安全な実装 |
| `tsx` | ^4.x | MIT | 開発時TypeScript直接実行 |
| `vitest` | ^1.x | MIT | ユニット・統合テスト |

---

### MCP（Phase 2）

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.x | MIT | MCPサーバー実装 |

---

### Markdown連携（Phase 3）

| ライブラリ | バージョン | ライセンス | 用途 |
|---|---|---|---|
| `js-yaml` | ^4.x | MIT | YAML frontmatter解析 |

---

## アーキテクチャ方針

### 単一パッケージ（Phase 1）
- 最初はシングルnpmパッケージとして実装
- `src/shared/` に共有型定義を分離することで、将来のmonorepo化を容易にする

### モノレポ化のタイミング
以下いずれかの条件が満たされた時点で分割を検討:
- Webビジュアライゼーション層の追加
- MCPサーバーの独立パッケージ公開

### インメモリグラフ
- 分析中は `Map<nodeId, GraphNode>` + `Map<relId, GraphRelationship>` のシンプルなインメモリ構造
- グラフDBへの依存なし（出力先にNeo4jを使うが、ツール自体は不要）
- Phase 2 MCP用に `graph.json` へシリアライズ → 起動時ロード

### エラー耐性
- 1ファイルの解析失敗はスキップ（パイプライン全体を止めない）
- スキップ・エラーカウントをCLIサマリーで表示

---

## 参照元（GitNexus MITファイル）

以下はGitNexusのMITライセンスコードであり、参照・流用が合法:

| ファイル | 参照内容 |
|---|---|
| `gitnexus-shared/src/graph/types.ts` | ノード/リレーション型定義 |
| `gitnexus/src/core/ingestion/tree-sitter-queries.ts` | Java/TS/JSのS式クエリ文字列 |
| `gitnexus/src/core/ingestion/pipeline.ts` | パイプライン構造・フェーズ順序 |
| `gitnexus/src/core/graph/graph.ts` | インメモリグラフ実装パターン |
| `gitnexus/src/core/ingestion/markdown-processor.ts` | MDプロセッサパターン |
