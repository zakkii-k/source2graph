# Claude Code で source2graph MCP を使う

このガイドでは、source2graph の MCP サーバーを Claude Code に接続して、コードグラフをAI会話から参照できるようにするまでの手順を具体的に説明します。

---

## 前提

- **source2graph** のセットアップが完了している（`npm install` 済み）
- **Claude Code** がインストールされている（`claude --version` で確認）
- Node.js 18 以上

---

## ステップ 1: source2graph をビルドする

MCP サーバーは `dist/` 以下のコンパイル済みファイルを使います。

```bash
cd /path/to/source2graph
npm run build
```

ビルドが成功すると `dist/cli/index.js` が生成されます。

```bash
# 動作確認
node dist/cli/index.js --version
```

---

## ステップ 2: MCP サーバーを Claude Code に登録する

### 方法 1: `claude mcp add` コマンド（推奨）

```bash
claude mcp add s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/your/project
```

これでグローバル設定（`~/.claude.json`）に `s2g` サーバーが登録されます。

**複数リポジトリを横断解析したい場合:**

```bash
claude mcp add s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/frontend \
  --repo /path/to/backend \
  --repo /path/to/shared
```

**プロジェクト単位で管理したい場合:**

```bash
claude mcp add --scope project s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/your/project
```

プロジェクトルートの `.mcp.json` に書き込まれます。チームで共有するリポジトリに含める場合はこちらを使ってください。

### 方法 2: 設定ファイルを直接編集する

#### グローバル設定: `~/.claude.json`

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

#### プロジェクト設定: `.mcp.json`（プロジェクトルートに置く）

```json
{
  "mcpServers": {
    "s2g": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo",
        "."
      ]
    }
  }
}
```

`"."` はプロジェクトルートを指します。`.mcp.json` をリポジトリに含めれば、チームメンバーが `claude` を起動するだけで自動的に接続されます。

#### 複数リポジトリを横断解析する場合

```json
{
  "mcpServers": {
    "s2g": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo", "/path/to/frontend",
        "--repo", "/path/to/backend",
        "--repo", "/path/to/shared"
      ]
    }
  }
}
```

#### ソースから直接実行する場合（開発中）

```json
{
  "mcpServers": {
    "s2g": {
      "command": "npx",
      "args": [
        "--yes",
        "tsx",
        "/path/to/source2graph/src/cli/index.ts",
        "serve",
        "--repo",
        "/path/to/your/project"
      ]
    }
  }
}
```

---

## ステップ 3: 接続を確認する

Claude Code を起動し、次のコマンドで登録されたサーバーを確認します。

```bash
claude
```

起動後、`/mcp` を入力して Enter:

```
> /mcp
```

出力例:

```
MCP Servers
  s2g  connected  (5 tools, 3 resources)
```

`connected` と表示されていれば成功です。`disconnected` の場合はステップ 4 のトラブルシューティングを参照してください。

---

## ステップ 4: ツールとリソースを確認する

### 利用可能なツール

`/mcp` の詳細表示または `/tools` で確認できます。source2graph が提供するツール:

| ツール | 説明 |
|---|---|
| `mcp__s2g__analyze` | 指定パスを解析してグラフを構築（複数パスはカンマ区切り） |
| `mcp__s2g__query_nodes` | ラベル・名前・ファイルパスでノード検索 |
| `mcp__s2g__get_callers` | 指定シンボルを呼び出しているノードを取得 |
| `mcp__s2g__get_callees` | 指定シンボルが呼び出すノードを取得 |
| `mcp__s2g__get_context` | シンボルの360度ビュー |

### 利用可能なリソース

| リソース URI | 内容 |
|---|---|
| `s2g://graph/schema` | ノード・エッジ・プロパティの定義 |
| `s2g://graph/stats` | ノード数・エッジ数・解析日時 |
| `s2g://graph/nodes/{label}` | ラベル別の全ノード |

---

## ステップ 5: 実際に使ってみる

### 初回: リポジトリを解析する

MCP サーバー起動時に `--repo` を指定している場合は自動的に解析されます。
手動で解析したい場合（プロジェクトを変えたときなど）:

```
> /path/to/new-project を解析してください
```

Claude は `mcp__s2g__analyze` ツールを呼び出します。

複数リポジトリを解析させる場合:

```
> /path/to/frontend と /path/to/backend を横断解析してください
```

（paths をカンマ区切りで渡します: `/path/to/frontend,/path/to/backend`）

### コード構造の探索

**クラスの全体像を把握する:**

```
UserService クラスの全体像を教えてください
```

Claude は `get_context` を呼んで以下を返します:
- クラスが属するファイル
- メソッド一覧
- フィールド一覧
- 継承・実装関係
- このクラスのメソッドを呼び出しているもの
- このクラスのメソッドが呼び出しているもの

---

**メソッドの呼び出し連鎖を調べる:**

```
findById はどこから呼ばれていますか？呼び出し元を深さ2まで辿ってください
```

Claude は `get_callers` を `depth: 2` で呼び出します。

---

**特定条件でノードを絞り込む:**

```
src/service/ 配下にあるクラスを全部リストアップしてください
```

```
名前に "Repository" を含むクラスとインターフェースを検索してください
```

Claude は `query_nodes` に `filePath: "src/service/"` や `namePattern: "Repository"` を渡します。

---

**依存関係の全体像を把握する:**

```
外部パッケージへの依存をリストアップして、どのファイルが何に依存しているかまとめてください
```

Claude は `query_nodes` で `label: "Package"` のノードを取得し、`IMPORTS` エッジを辿ります。

---

**複数リポジトリをまたいだ解析（マルチリポジトリ構成の場合）:**

```
frontend/src/App.tsx が backend のどのエンドポイントを呼んでいるか調べてください
```

マルチリポジトリ構成ではファイルパスが `frontend/src/App.tsx`、`backend/src/server.ts` のようにリポジトリ名プレフィックス付きになります。`filePath: "frontend/"` のように絞り込めます。

---

**仕様書とコードの対応を確認する（別リポジトリ構成の場合）:**

```
仕様書（Markdown）から参照されているクラスを全部教えてください
```

Claude は `s2g://graph/nodes/Section` リソースと `REFERENCES` / `DOCUMENTS` エッジを使います。

---

### リファクタリング支援

```
UserService を UserServiceV2 にリネームしたいのですが、
影響範囲（呼び出し元・継承先）を調べてください
```

```
このプロジェクトで循環依存になっているファイルを探してください
```

---

### 設計レビュー

```
クラス間の継承関係を調べて、設計上の問題点があれば指摘してください
```

```
CALLS エッジを辿って、最も多くのメソッドから呼ばれているのはどの関数ですか？
```

---

## キャッシュについて

MCP サーバーはグラフを `~/.s2g/cache/s2g-graph.json` にキャッシュします。
次回起動時はキャッシュから復元されるため、解析時間ゼロで使い始められます。

コードを更新した場合はキャッシュを無効化して再解析する必要があります:

```
プロジェクトを再解析してください（コードを更新しました）
```

または、キャッシュディレクトリを指定して起動する場合:

```bash
claude mcp add s2g -- \
  node /path/to/source2graph/dist/cli/index.js \
  serve \
  --repo /path/to/your/project \
  --cache-dir /path/to/your/project/.s2g-cache
```

キャッシュをプロジェクトと同じ場所に置いておくと、プロジェクトごとにグラフが分離されて管理しやすくなります（`.gitignore` に `.s2g-cache/` を追加してください）。

---

## 複数プロジェクトを切り替える

複数のプロジェクトを扱う場合、サーバーを複数登録できます。

```json
{
  "mcpServers": {
    "s2g-frontend": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo", "/path/to/frontend",
        "--cache-dir", "/path/to/frontend/.s2g-cache"
      ]
    },
    "s2g-backend": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo", "/path/to/backend",
        "--cache-dir", "/path/to/backend/.s2g-cache"
      ]
    }
  }
}
```

Claude Code には両方のサーバーが接続され、それぞれの `mcp__s2g-frontend__*` / `mcp__s2g-backend__*` ツールが使えます。

---

## トラブルシューティング

### `disconnected` になる

MCP サーバーのプロセスが起動できていない可能性があります。端末で直接実行して確認:

```bash
node /path/to/source2graph/dist/cli/index.js serve --repo /path/to/your/project
```

エラーが表示されれば原因がわかります。よくある原因:

| エラー | 原因 | 対処 |
|---|---|---|
| `Cannot find module` | `npm run build` していない | `npm run build` を実行 |
| `ENOENT: no such file` | パスが間違っている | 絶対パスで指定する |
| `Permission denied` | 実行権限がない | `chmod +x dist/cli/index.js` |

### グラフが空 / ツールが `No graph loaded` を返す

`--repo` で指定したパスが正しくないか、解析に失敗しています。

```
/path/to/your/project を解析してください
```

と Claude に依頼して `analyze` ツールを呼び出させてください。

### `command not found: claude`

Claude Code がインストールされていません。

```bash
npm install -g @anthropic-ai/claude-code
```

### MCP ツールが会話に出てこない

Claude は必要と判断したときだけツールを呼びます。
明示的に使わせたいときはツール名を指定してください:

```
get_context ツールを使って UserService の情報を取得してください
```

---

## 設定ファイルの場所まとめ

| 設定 | パス | スコープ |
|---|---|---|
| グローバル MCP 設定 | `~/.claude.json` | 全プロジェクト共通 |
| プロジェクト MCP 設定 | `.mcp.json`（プロジェクトルート） | そのプロジェクトのみ |
| グラフキャッシュ（デフォルト） | `~/.s2g/cache/s2g-graph.json` | サーバーごと |
