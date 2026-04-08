# CodeNexus — 概要・目的・スコープ

## プロジェクト概要

**CodeNexus** は、ソースコードをグラフ構造として解析し、AIが読み込める形式で出力するCLIツールです。

GitNexusと同等の機能を、すべてOSS（商用利用可能）ライブラリのみで実現します。

## 背景・動機

- **GitNexus** はコードベースをグラフ化してAIエージェントに提供する優れたサービスだが、**商用利用不可**
- 社内システム・業務コードへの適用には、商用利用可能なツールが必要
- 将来的に設計書（Markdown）とコードの紐づけも行い、AIがコードと設計の両方を横断的に理解できる環境を作りたい

## 目標

### 最小成果物（MVP）
- Java / TypeScript / JavaScript のソースコードを解析
- クラス・インターフェース・メソッド・関数・フィールド・ファイル間の関係を抽出
- **Neo4j用CSV** または **Cypher CREATE文（.txt）** として出力
- ファイルサイズが大きい場合は自動分割

### 中期目標
- MCPサーバー化 → ClaudeやCursorなどのAIエージェントが直接クエリ可能
- Markdown設計書との連携（コードと設計の双方向参照）

### 長期目標
- AI側にスキーマを渡すことで、AIが自律的にNeo4jへクエリを投げて分析可能
- 対応言語の拡張（Python、Go、Kotlin等）

## スコープ

### Phase 1（MVP対象）
| 項目 | 対象 |
|---|---|
| 対応言語 | Java / TypeScript / JavaScript |
| 出力形式 | Neo4j bulk import CSV / Cypher MERGE文 .txt |
| 実行方法 | CLIコマンド `codenexus analyze <path>` |

### Phase 2以降（対象外だが設計で考慮）
- MCP サーバー
- Markdown連携
- Web UI / グラフ可視化
- 追加言語サポート

## 前提条件

- Node.js 20+
- 使用ライブラリはすべてMIT / Apache 2.0 / ISCライセンス（商用利用可能）
- 外部サービス・有料APIへの依存なし
- GitNexusのコードはMITライセンスのため、クエリ文字列・型定義等の参照・流用は合法
