# source2graph (s2g) 利用ガイド

## 目次

1. [インストール・セットアップ](#1-インストールセットアップ)
2. [CLIによる利用](#2-cliによる利用)
   - [analyze — CSV/Cypher出力](#21-analyze--csvcypher出力)
   - [neo4j — Dockerコンテナ管理](#22-neo4j--dockerコンテナ管理)
   - [serve — MCPサーバー起動](#23-serve--mcpサーバー起動)
3. [Neo4jワークフロー（推奨フロー）](#3-neo4jワークフロー推奨フロー)
4. [AI連携（MCPサーバー）](#4-ai連携mcpサーバー)
   - [Claude Code への接続](#41-claude-code-への接続)
   - [Cursor への接続](#42-cursor-への接続)
   - [GitHub Copilot (VS Code) への接続](#43-github-copilot-vs-code-への接続)
   - [利用可能なツール一覧](#44-利用可能なツール一覧)
   - [利用可能なリソース一覧](#45-利用可能なリソース一覧)
5. [出力ファイルの手動インポート](#5-出力ファイルの手動インポート)
6. [対応言語・解析内容](#6-対応言語解析内容)
7. [グラフスキーマ詳細](#7-グラフスキーマ詳細)

## 詳細ガイド

より踏み込んだユースケースは専用ガイドを参照してください。

| ガイド | 内容 |
|---|---|
| [仕様書と実装リポジトリが分離しているとき](./guides/separate-docs-repo.md) | 別リポジトリの Markdown を解析対象に含める方法（共通親ディレクトリ・シンボリックリンク・submodule） |
| [Claude Code で使う（詳細）](./guides/claude-code-mcp.md) | MCP 接続の設定・確認・実際のプロンプト例・トラブルシューティング |
| [ローカルLLM（Ollama）で使う](./guides/local-llm-mcp.md) | llm-rag-trial 経由で Ollama から source2graph MCP を利用する方法 |
| [Neo4jバックエンド（大規模リポジトリ向け）](./guides/neo4j-backend.md) | エッジ数が閾値を超えた際に自動でNeo4jへ切り替える設定と仕組み |

---

## 1. インストール・セットアップ

```bash
cd source2graph
npm install
```

グローバルにリンクしてどこからでも使えるようにする場合:

```bash
npm link
s2g --version
```

または `npx tsx src/cli/index.ts` で直接実行:

```bash
npx tsx src/cli/index.ts --help
```

Docker（Neo4j連携を使う場合）:

```bash
# Docker + docker compose プラグインが必要
docker --version        # 20.10+ 推奨
docker compose version  # v2.x 推奨
```

---

## 2. CLIによる利用

### 2.1 `analyze` — CSV/Cypher出力

ソースディレクトリを解析してファイルに出力します。**複数リポジトリを同時に解析**することもできます。

```bash
s2g analyze <paths...> [options]
```

| オプション | デフォルト | 説明 |
|---|---|---|
| `--output <dir>` | `./s2g-output` | 出力ディレクトリ |
| `--format <format>` | `both` | `csv` / `cypher` / `both` |
| `--verbose` | false | ファイル単位のログを表示 |
| `--no-progress` | — | プログレスバーを無効化 |

**例:**

```bash
# 単一リポジトリ（基本）
s2g analyze ./my-project

# 複数リポジトリを横断解析
s2g analyze ./frontend ./backend ./shared

# CSVのみ、出力先を指定
s2g analyze ./my-project --output /tmp/graph --format csv

# 詳細ログ付き
s2g analyze ./my-project --verbose
```

**複数リポジトリの場合の動作:**
- 各ファイルのパスは `{repoName}/{original}` 形式でグラフに格納されます
- 例: `frontend/src/App.tsx`、`backend/src/server.ts`
- クロスリポジトリの `IMPORTS` / `CALLS` エッジも解決されます

**出力ファイル:**

```
s2g-output/
├── nodes_File.csv
├── nodes_Folder.csv
├── nodes_Class.csv
├── nodes_Interface.csv
├── nodes_Method.csv
├── nodes_Function.csv
├── nodes_Field.csv
├── nodes_Section.csv
├── nodes_Package.csv          # 外部パッケージ（node_modules / Maven等）
├── rels_CONTAINS.csv
├── rels_HAS_METHOD.csv
├── rels_HAS_PROPERTY.csv
├── rels_CALLS.csv
├── rels_EXTENDS.csv
├── rels_IMPLEMENTS.csv
├── rels_IMPORTS.csv
├── rels_REFERENCES.csv
├── rels_DOCUMENTS.csv
├── cypher_schema.txt          # CREATE CONSTRAINT / INDEX
├── cypher_nodes.txt           # MERGE文（500件/バッチ）
├── cypher_rels.txt            # MERGE文（500件/バッチ）
└── neo4j-import.sh            # neo4j-admin import スクリプト
```

---

### 2.2 `neo4j` — Dockerコンテナ管理

Neo4j（Docker）の起動からグラフインポートまでを一括管理します。

#### コンテナ起動

```bash
s2g neo4j up
s2g neo4j up --open   # 起動後にブラウザも開く
```

起動後は以下でアクセスできます:
- Neo4j Browser: http://localhost:7474 （ユーザー: `neo4j` / パスワード: `s2gpass`）
- Bolt URI: `bolt://localhost:7687`

#### コンテナ停止

```bash
s2g neo4j down
```

#### コンテナ・データ削除

```bash
s2g neo4j destroy   # コンテナ停止 + ボリューム削除（データ全消去）
```

#### 状態確認

```bash
s2g neo4j status
```

#### ブラウザを開く

```bash
s2g neo4j open
```

#### グラフインポート

ソースディレクトリを解析してNeo4jに直接インポートします。**複数リポジトリも一括インポート可能**です。

```bash
s2g neo4j import <paths...> [options]
```

| オプション | デフォルト | 説明 |
|---|---|---|
| `--uri <uri>` | `bolt://localhost:7687` | Bolt URI |
| `-u, --user <user>` | `neo4j` | ユーザー名 |
| `-p, --password <pass>` | `s2gpass` | パスワード |
| `--database <db>` | `neo4j` | データベース名 |
| `--clear` | false | インポート前に既存データを削除 |
| `--start` | false | コンテナが未起動なら自動起動 |
| `--open` | false | インポート完了後にブラウザを開く |
| `--verbose` | false | ファイル単位の進捗ログ |

**例:**

```bash
# 単一リポジトリ
s2g neo4j import ./my-project

# 複数リポジトリを横断インポート
s2g neo4j import ./frontend ./backend ./shared

# コンテナ自動起動 + 既存データクリア + 完了後ブラウザ表示
s2g neo4j import ./my-project --start --clear --open

# リモートNeo4j / 別ユーザー
s2g neo4j import ./my-project --uri bolt://remote:7687 -u admin -p secret
```

---

### 2.3 `serve` — MCPサーバー起動

AI（Claude Code / Cursor / GitHub Copilot等）からコードグラフを参照するためのMCPサーバーを起動します。**複数リポジトリを `--repo` を繰り返して指定**できます。

```bash
s2g serve [options]
```

| オプション | デフォルト | 説明 |
|---|---|---|
| `--repo <path>` | — | 初回起動時に解析するリポジトリパス（複数回指定可） |
| `--cache-dir <dir>` | `~/.s2g/cache` | graph.json キャッシュの保存先 |
| `--neo4j-uri <uri>` | — | 指定するとエッジ数が閾値を超えた際に自動でNeo4jへ切り替え |
| `--neo4j-user <user>` | `neo4j` | Neo4j ユーザー名 |
| `--neo4j-password <pass>` | `s2gpassword` | Neo4j パスワード |
| `--neo4j-database <db>` | `neo4j` | Neo4j データベース名 |
| `--neo4j-threshold <n>` | `50000` | この値を超えるエッジ数でNeo4jバックエンドへ切り替える |

```bash
# 単一リポジトリを解析しながらMCPサーバー起動（インメモリ）
s2g serve --repo ./my-project

# 複数リポジトリを横断解析してMCPサーバー起動
s2g serve --repo ./frontend --repo ./backend --repo ./shared

# キャッシュ済みのグラフを読み込んで起動
s2g serve --cache-dir /path/to/cache

# 大規模リポジトリ：エッジ数が 50,000 超でNeo4jに自動切り替え
s2g serve --repo ./large-project --neo4j-uri bolt://localhost:7687

# 閾値を下げて常にNeo4jを使う（--neo4j-threshold 0）
s2g serve --repo ./my-project --neo4j-uri bolt://localhost:7687 --neo4j-threshold 0
```

**バックエンド自動選択の仕組み:**

`--neo4j-uri` を指定した場合のみ自動切り替えが有効になります。Neo4jが起動していない場合はインメモリにフォールバックします。詳細は [Neo4jバックエンドガイド](./guides/neo4j-backend.md) を参照してください。

---

## 3. Neo4jワークフロー（推奨フロー）

```bash
# 1. Neo4j起動（初回のみ）
s2g neo4j up

# 2. プロジェクトを解析してインポート
s2g neo4j import ./my-project --open

# 3. ブラウザでグラフ確認
#    → http://localhost:7474 で以下のCypherを試す
```

**よく使うCypherクエリ:**

```cypher
// ノード種別ごとの件数
MATCH (n) RETURN labels(n), count(*) ORDER BY count(*) DESC

// クラスの継承ツリー
MATCH path = (child)-[:EXTENDS*]->(parent)
RETURN path LIMIT 25

// メソッド呼び出し関係
MATCH (caller)-[:CALLS]->(callee)
RETURN caller.name, callee.name LIMIT 50

// 特定クラスの全メソッド
MATCH (c:Class {name: "UserService"})-[:HAS_METHOD]->(m:Method)
RETURN m.name, m.startLine

// ファイルの依存関係（ローカルファイルのみ）
MATCH (f:File)-[:IMPORTS]->(dep:File)
RETURN f.name, dep.name LIMIT 50

// 外部パッケージへの依存
MATCH (f:File)-[:IMPORTS]->(p:Package)
RETURN p.packageName, count(f) AS importCount ORDER BY importCount DESC
```

**コードを更新した場合の再インポート:**

```bash
s2g neo4j import ./my-project --clear
```

---

## 4. AI連携（MCPサーバー）

source2graph の MCPサーバーは **stdio トランスポート**で動作します。各AIツールの設定ファイルに以下の形式で接続設定を追加してください。

### 4.1 Claude Code への接続

`claude mcp add` コマンドで登録するのが最も簡単です:

```bash
# 単一リポジトリ
claude mcp add s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/your/project

# 複数リポジトリ
claude mcp add s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/frontend \
  --repo /path/to/backend
```

または `~/.claude.json`（グローバル）や `.mcp.json`（プロジェクト）を直接編集できます:

```json
{
  "mcpServers": {
    "s2g": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo",
        "/path/to/your/project"
      ]
    }
  }
}
```

接続確認・プロンプト例・トラブルシューティングは **[詳細ガイド](./guides/claude-code-mcp.md)** を参照してください。

### 4.2 Cursor への接続

`~/.cursor/mcp.json`（グローバル）またはプロジェクトルートの `.cursor/mcp.json` に追加:

```json
{
  "mcpServers": {
    "s2g": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo",
        "/path/to/your/project"
      ]
    }
  }
}
```

### 4.3 GitHub Copilot (VS Code) への接続

VS Code 1.99 以降では GitHub Copilot Chat がネイティブで MCP をサポートします。

#### プロジェクト単位で設定する場合

プロジェクトルートに `.vscode/mcp.json` を作成:

```json
{
  "servers": {
    "s2g": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo",
        "${workspaceFolder}"
      ]
    }
  }
}
```

`${workspaceFolder}` は VS Code が自動展開するので、プロジェクトを変えても設定ファイルの共有が楽になります。

#### ユーザー設定で有効にする場合

VS Code の `settings.json`（`Ctrl+Shift+P` → "Open User Settings (JSON)"）に追加:

```json
{
  "mcp": {
    "servers": {
      "s2g": {
        "type": "stdio",
        "command": "node",
        "args": [
          "/path/to/source2graph/dist/cli/index.js",
          "serve",
          "--repo",
          "/path/to/your/project"
        ]
      }
    }
  }
}
```

#### Copilot Chat での使い方

設定後、VS Code のコマンドパレット（`Ctrl+Shift+P`）から **"MCP: List Servers"** で `s2g` が表示されれば接続成功です。

Copilot Chat（`Ctrl+Alt+I`）で `@s2g` を入力すると MCP ツールが呼び出せます:

```
@s2g UserServiceクラスのコンテキストを教えて
@s2g findByIdを呼んでいるメソッドをすべて挙げて
```

> **注意:** GitHub Copilot の MCP サポートは VS Code 1.99 以降かつ Copilot Chat 拡張機能が必要です。
> 詳細: https://code.visualstudio.com/docs/copilot/chat/mcp-servers

### 4.4 利用可能なツール一覧

| ツール名 | 説明 | 主なパラメータ |
|---|---|---|
| `analyze` | 指定パスを解析してグラフを構築・キャッシュ | `paths: string`（複数はカンマ区切り） |
| `query_nodes` | ラベル・名前パターン・ファイルパスでノード検索 | `label?`, `namePattern?`, `filePath?`, `limit?` |
| `get_callers` | 指定シンボルを呼び出しているノードを取得 | `symbolName`, `depth?` (1–5) |
| `get_callees` | 指定シンボルが呼び出すノードを取得 | `symbolName`, `depth?` (1–5) |
| `get_context` | シンボルの360度ビュー（コンテナ/メソッド/フィールド/継承/呼び出し） | `symbolName` |

**AIへの利用例（プロンプト）:**

```
UserServiceクラスのget_contextを取得して、
どのメソッドが他のクラスから呼ばれているか教えてください。
```

```
query_nodesでlabel=Classのすべてのクラスを取得し、
継承関係の概要を説明してください。
```

### 4.5 利用可能なリソース一覧

| URI | 内容 |
|---|---|
| `s2g://graph/schema` | ノードラベル・リレーション型・プロパティ定義 |
| `s2g://graph/stats` | ラベル/タイプ別カウント・解析日時 |
| `s2g://graph/nodes/{label}` | 指定ラベルの全ノード（例: `nodes/Class`）|

---

## 5. 出力ファイルの手動インポート

`s2g analyze` で出力したファイルをNeo4jに手動でインポートする方法です。

### Cypher Shell を使う場合

```bash
# スキーマ（制約・インデックス）を先に適用
cat s2g-output/cypher_schema.txt | cypher-shell -u neo4j -p s2gpass

# ノードをインポート
cat s2g-output/cypher_nodes.txt | cypher-shell -u neo4j -p s2gpass

# リレーションをインポート
cat s2g-output/cypher_rels.txt | cypher-shell -u neo4j -p s2gpass
```

### Neo4j Browser を使う場合

1. http://localhost:7474 を開く
2. `cypher_schema.txt` の内容をコピーして実行
3. `cypher_nodes.txt`、`cypher_rels.txt` の内容を順に実行

### neo4j-admin import を使う場合（大規模向け）

生成された `neo4j-import.sh` を実行します:

```bash
bash s2g-output/neo4j-import.sh
```

> **注意:** `neo4j-admin import` はデータベースが停止している状態でのみ使えます。

---

## 6. 対応言語・解析内容

| 言語 | 拡張子 | クラス | インターフェース | メソッド | フィールド | 関数 | 継承 | 実装 | インポート | 呼び出し |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Java | `.java` | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| TypeScript | `.ts` `.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` | ✅ | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ |
| Scala | `.scala` `.sbt` | ✅ | ✅ (trait) | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |

**Scalaの補足:**
- `trait` は `Interface` ノードとして扱います
- `object`（シングルトン）は `Class` ノード（名前に `$` サフィックス）として扱います
- `extends` / `with` の相手がクラスなら `EXTENDS`、トレイトなら `IMPLEMENTS` エッジを張ります
- グループインポート `import com.example.{Foo, Bar}` は各シンボルごとに個別解決します
- ワイルドカードインポート `import com.example._` はスキップします

**インポート解決の動作:**

| インポート種別 | 結果 |
|---|---|
| 相対パス (`./`, `../`) | `File -[IMPORTS]-> File` |
| パスエイリアス（tsconfig `paths` 等） | `File -[IMPORTS]-> File`（サフィックスマッチで解決） |
| Java/Scala FQN（リポジトリ内） | `File -[IMPORTS]-> File`（パス変換で解決） |
| 外部パッケージ（npm / Maven等） | `File -[IMPORTS]-> Package` |

---

## 7. グラフスキーマ詳細

詳細なオントロジー（ノード・エッジのラベルとプロパティ定義）は [`docs/ontology.md`](./ontology.md) を参照してください。
