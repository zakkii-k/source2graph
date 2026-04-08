# 仕様書・ドキュメントと実装リポジトリが分離しているとき

source2graph は通常、単一のディレクトリを「リポジトリルート」として解析します。
仕様書リポジトリと実装リポジトリが別々に管理されている場合でも、以下の方法でドキュメントのリンク（`REFERENCES`）と文書化関係（`DOCUMENTS`）をグラフに含めることができます。

---

## なぜ別リポジトリだと問題になるか

source2graph が Markdown のリンクを解決する仕組みは次のとおりです。

1. 解析対象ルートからすべてのソースファイルを走査して「既知ファイル一覧」を構築する
2. Markdown 内の `[text](path)` リンクを、**その Markdown ファイルからの相対パス**で解決する
3. 解決結果が「既知ファイル一覧」に含まれれば `REFERENCES` エッジを作成する

つまり、リンク先のファイルが解析ルートの外にあると解決できず、エッジが作られません。

---

## 方法 A（推奨）: 共通親ディレクトリをルートにする

両リポジトリを並べて置き、**共通の親ディレクトリを source2graph のルートとして渡す**方法です。
コード・ドキュメント両方のファイルパスが同じルート基準になるため、クロスリポジトリのリンクが正しく解決されます。

### ディレクトリ構成

```
workspace/                      ← ここを解析ルートにする
├── myapp/                      ← 実装リポジトリ
│   ├── .git/
│   ├── src/
│   │   ├── service/
│   │   │   └── UserService.ts
│   │   └── model/
│   │       └── User.ts
│   └── package.json
└── myapp-docs/                 ← ドキュメントリポジトリ
    ├── .git/
    ├── spec/
    │   └── user-service.md
    └── api/
        └── overview.md
```

### Markdown でのリンクの書き方

`workspace/myapp-docs/spec/user-service.md` から `UserService.ts` を参照する例:

```markdown
---
s2g:
  describes: UserService
---

# UserService 仕様

実装は [`UserService`](../myapp/src/service/UserService.ts) を参照。

## findById メソッド

[`findById`](../myapp/src/service/UserService.ts#L10) はIDでユーザーを検索する。
```

- `../myapp/src/service/UserService.ts` — ファイルへのリンク → `REFERENCES` (→ File)
- `../myapp/src/service/UserService.ts#L10` — 行指定リンク → `REFERENCES` (→ Method/Function)
- フロントマターの `describes: UserService` → `DOCUMENTS` (→ Class)

### 解析コマンド

```bash
# CSV/Cypher 出力
s2g analyze ./workspace

# Neo4j に直接インポート
s2g neo4j import ./workspace --start --open

# MCP サーバー起動
s2g serve --repo ./workspace
```

### 確認用 Cypher クエリ

```cypher
// ドキュメントからコードへの REFERENCES を確認
MATCH (sec:Section)-[:REFERENCES]->(target)
RETURN sec.filePath, sec.heading, labels(target), target.name
LIMIT 20

// DOCUMENTS（仕様書とクラスの対応）を確認
MATCH (md:File)-[:DOCUMENTS]->(sym)
WHERE md.language = 'markdown'
RETURN md.filePath, labels(sym), sym.name
```

---

## 方法 B: シンボリックリンクを使う

実装リポジトリのルート内にドキュメントリポジトリへのシンボリックリンクを作る方法です。
既存のリポジトリ構成を変えたくない場合に有効です。

### セットアップ

```bash
cd myapp/                         # 実装リポジトリのルートへ移動
ln -s ../myapp-docs docs           # ドキュメントリポジトリをリンク
```

結果:

```
myapp/
├── .git/
├── src/
│   └── service/
│       └── UserService.ts
└── docs -> ../myapp-docs/         ← シンボリックリンク
    └── spec/
        └── user-service.md
```

### Markdown でのリンクの書き方

`myapp/docs/spec/user-service.md`（シンボリックリンク経由のパス）から参照する例:

```markdown
# UserService 仕様

実装は [`UserService`](../../src/service/UserService.ts) を参照。
```

パスは **シンボリックリンクの位置（`docs/spec/`）からの相対パス**で書きます。

### 解析コマンド

```bash
# fast-glob がシンボリックリンクをたどるよう設定済みのため、そのまま使える
s2g analyze ./myapp
```

> **注意:** シンボリックリンク先の `.gitignore` は読み込まれません。
> ドキュメントリポジトリ側で除外したいファイルがある場合は、実装リポジトリ側の `.s2gignore` に追記してください。

---

## 方法 C: git submodule / git subtree を使う

ドキュメントリポジトリを実装リポジトリの submodule または subtree として取り込む方法です。
CI/CD と組み合わせてグラフを自動更新する場合に向いています。

### submodule の場合

```bash
cd myapp/
git submodule add https://github.com/yourorg/myapp-docs.git docs
git commit -m "add docs submodule"
```

以降の操作は方法 B と同様です。`docs/` ディレクトリ内の Markdown が解析対象に含まれます。

---

## 方法ごとの比較

| | 方法 A（共通親） | 方法 B（symlink） | 方法 C（submodule） |
|---|:---:|:---:|:---:|
| リポジトリ構成の変更 | なし | あり（リンク追加） | あり（submodule追加） |
| CI/CD との相性 | △（checkout が2つ必要） | △ | ◎ |
| Markdown リンクのパス | `../myapp/src/...` | `../../src/...` | `../../src/...` |
| 推奨シーン | ローカル開発・探索 | 既存リポジトリに後付け | 本番運用・自動更新 |

---

## Markdown に書く YAML フロントマターのリファレンス

```markdown
---
s2g:
  describes: UserService
---
```

```markdown
---
s2g:
  describes:
    - UserService
    - UserRepository
---
```

- `describes` に書いたシンボル名は `DOCUMENTS` エッジで接続されます
- シンボル名はクラス名・インターフェース名・関数名いずれも可
- 複数のシンボルをリスト形式で指定できます

---

## トラブルシューティング

### リンクが解決されない

`s2g analyze` に `--verbose` を付けて実行すると、解決に成功したリンクだけが `[MD] REFERENCES ...` として出力されます。出力されない場合はパスが正しくありません。

```bash
s2g analyze ./workspace --verbose 2>&1 | grep "\[MD\]"
```

### ドキュメントのファイルが解析対象に含まれない

`.gitignore` または `.s2gignore` で除外されていないか確認してください。
特定のディレクトリだけ除外する場合は、ルートに `.s2gignore` を作成します:

```
# .s2gignore
myapp-docs/drafts/
myapp-docs/archive/
```
