# Neo4jバックエンド（大規模リポジトリ向け）

MCPサーバー（`s2g serve`）は通常、グラフをメモリ上のJSONとして保持します。エッジ数が数万件を超えるような大規模リポジトリでは、代わりにNeo4jをバックエンドとして使うことでメモリ消費を抑えてCypherの検索性能を活かせます。

---

## 仕組み

```
s2g serve 起動
    ↓
analyze（またはキャッシュ読み込み）
    ↓
エッジ数 > --neo4j-threshold ?
    ├─ Yes → Neo4j に自動インポート → Cypherクエリで応答
    └─ No  → インメモリで応答（従来どおり）
```

`--neo4j-uri` を指定しない場合は常にインメモリ動作し、従来の挙動と完全に同一です。

---

## 前提条件

| 項目 | 確認コマンド |
|---|---|
| Neo4j 起動済み | `s2g neo4j status` |
| Bolt ポート疎通 | `curl -s http://localhost:7474` |

Neo4j を起動していない場合は先に起動してください：

```bash
s2g neo4j up
```

---

## 基本的な使い方

```bash
# エッジ数が 50,000 を超えたら自動でNeo4jへ切り替え（デフォルト閾値）
s2g serve --repo ./my-project \
  --neo4j-uri bolt://localhost:7687

# 閾値を変更する（例: 10,000 エッジ超で切り替え）
s2g serve --repo ./my-project \
  --neo4j-uri bolt://localhost:7687 \
  --neo4j-threshold 10000

# 常にNeo4jを使う（閾値を 0 にする）
s2g serve --repo ./my-project \
  --neo4j-uri bolt://localhost:7687 \
  --neo4j-threshold 0
```

---

## オプション一覧

| オプション | デフォルト | 説明 |
|---|---|---|
| `--neo4j-uri <uri>` | — | 指定するとNeo4j自動切り替えが有効になる |
| `--neo4j-user <user>` | `neo4j` | Neo4j ユーザー名 |
| `--neo4j-password <pass>` | `s2gpassword` | Neo4j パスワード |
| `--neo4j-database <db>` | `neo4j` | Neo4j データベース名 |
| `--neo4j-threshold <n>` | `50000` | エッジ数がこの値を超えたらNeo4jへ切り替え |

---

## 起動時のログ

切り替えが発生した場合、`stderr` に以下が出力されます：

```
[s2g] 73542 edges > threshold 50000 — importing into Neo4j...
[s2g] Switched to Neo4j backend.
[s2g] Done: 12000 nodes, 73542 rels (backend: neo4j)
```

インメモリのままの場合：

```
[s2g] 8200 edges ≤ threshold 50000 — using in-memory backend.
[s2g] Done: 1500 nodes, 8200 rels (backend: memory)
```

---

## フォールバック

`--neo4j-uri` を指定していても、Neo4jが起動していない・接続できない場合は自動的にインメモリにフォールバックします：

```
[s2g] Neo4j unavailable, falling back to in-memory: ServiceUnavailable: ...
```

MCPサーバー自体は起動し、ツールは通常どおり使えます。

---

## キャッシュ読み込み時の挙動

一度 `analyze` を実行すると `~/.s2g/cache/s2g-graph.json` にグラフがキャッシュされます。次回起動時にキャッシュから復元する際も、`--neo4j-uri` が指定されていれば閾値チェックを行い、必要に応じてNeo4jへ切り替えます（再インポートも行われます）。

---

## Claude Code / Cursor / Copilot での設定例

```json
{
  "mcpServers": {
    "s2g": {
      "command": "node",
      "args": [
        "/path/to/source2graph/dist/cli/index.js",
        "serve",
        "--repo", "/path/to/large-project",
        "--neo4j-uri", "bolt://localhost:7687",
        "--neo4j-threshold", "20000"
      ]
    }
  }
}
```

---

## インメモリ vs Neo4j バックエンドの比較

| | インメモリ（デフォルト） | Neo4jバックエンド |
|---|---|---|
| 追加セットアップ | 不要 | Neo4j 起動が必要 |
| メモリ消費 | グラフ全体をRAMに保持 | Neo4jプロセスのみ |
| クエリ速度（小規模） | 高速 | オーバーヘッドあり |
| クエリ速度（大規模） | ノード数万件で遅くなる | インデックス活用で高速 |
| 深いホップのCALLS探索 | TypeScriptループで再帰 | `[:CALLS*1..N]` で効率的 |
| Neo4j Browser での可視化 | 別途 `s2g neo4j import` が必要 | 自動インポート済みなので即可視化 |
