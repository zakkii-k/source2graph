# CodeNexus — グラフスキーマ定義

## Node ラベル

### File
ソースファイル1つに対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `File:{normalizedPath}` |
| `name` | string | ファイル名（例: `UserService.java`）|
| `filePath` | string | リポジトリルートからの相対パス |
| `language` | string | `java` / `typescript` / `javascript` |
| `extension` | string | `.java` / `.ts` / `.js` / `.tsx` |

### Folder
ディレクトリに対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Folder:{normalizedPath}` |
| `name` | string | フォルダ名 |
| `folderPath` | string | リポジトリルートからの相対パス |

### Class
クラス宣言に対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Class:{filePath}:{qualifiedName}` |
| `name` | string | クラス名 |
| `qualifiedName` | string | 完全修飾名（例: `com.example.UserService`）|
| `filePath` | string | 定義ファイルのパス |
| `startLine` | int | 開始行番号 |
| `endLine` | int | 終了行番号 |
| `visibility` | string | `public` / `protected` / `private` / `package` |
| `isAbstract` | boolean | 抽象クラスか |
| `isStatic` | boolean | staticクラスか（Java inner class等）|
| `language` | string | 言語 |

### Interface
インターフェース宣言に対応するノード（JavaのInterface / TypeScriptのinterface）。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Interface:{filePath}:{qualifiedName}` |
| `name` | string | インターフェース名 |
| `qualifiedName` | string | 完全修飾名 |
| `filePath` | string | 定義ファイルのパス |
| `startLine` | int | 開始行番号 |
| `endLine` | int | 終了行番号 |
| `visibility` | string | 可視性 |
| `language` | string | 言語 |

### Method
クラス・インターフェースのメソッドに対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Method:{filePath}:{qualifiedName}#{paramCount}` |
| `name` | string | メソッド名 |
| `qualifiedName` | string | `ClassName.methodName` |
| `filePath` | string | 定義ファイルのパス |
| `startLine` | int | 開始行番号 |
| `endLine` | int | 終了行番号 |
| `visibility` | string | 可視性 |
| `isStatic` | boolean | staticメソッドか |
| `isAsync` | boolean | async/awaitか（TS/JS）|
| `returnType` | string | 戻り値の型（存在する場合）|
| `paramCount` | int | 引数の数 |
| `language` | string | 言語 |

### Function
トップレベルの関数（TypeScript / JavaScript）に対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Function:{filePath}:{name}` |
| `name` | string | 関数名 |
| `filePath` | string | 定義ファイルのパス |
| `startLine` | int | 開始行番号 |
| `endLine` | int | 終了行番号 |
| `isAsync` | boolean | async関数か |
| `isExported` | boolean | exportされているか |
| `returnType` | string | 戻り値の型（存在する場合）|
| `paramCount` | int | 引数の数 |
| `language` | string | 言語 |

### Field
クラスのフィールド・プロパティに対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Field:{filePath}:{className}.{fieldName}` |
| `name` | string | フィールド名 |
| `filePath` | string | 定義ファイルのパス |
| `startLine` | int | 定義行番号 |
| `visibility` | string | 可視性 |
| `isStatic` | boolean | staticか |
| `fieldType` | string | 型（存在する場合）|
| `language` | string | 言語 |

### Section（Phase 3: Markdown連携）
Markdownファイルの見出しセクションに対応するノード。

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodeId` | string (ID) | `Section:{filePath}:{startLine}` |
| `heading` | string | 見出しテキスト |
| `level` | int | 見出しレベル（1〜6）|
| `filePath` | string | MDファイルのパス |
| `startLine` | int | 開始行番号 |
| `endLine` | int | 終了行番号 |

---

## Relationship タイプ

### CONTAINS
コンテナ→被包含の階層関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Folder | File | — |
| Folder | Folder | — |
| File | Class | — |
| File | Interface | — |
| File | Function | — |

### HAS_METHOD
クラス・インターフェース → メソッドの所属関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Class | Method | — |
| Interface | Method | — |

### HAS_PROPERTY
クラス → フィールドの所属関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Class | Field | — |

### CALLS
関数・メソッド間の呼び出し関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Method | Method | `confidence: float` |
| Method | Function | `confidence: float` |
| Function | Function | `confidence: float` |
| Function | Method | `confidence: float` |

**信頼度スコア:**
- `1.0`: 同一ファイル内の確実な呼び出し
- `0.9`: インポート解決済みのシンボルへの呼び出し
- `0.7`: シンボルテーブルでの名前解決による呼び出し
- `0.5`: 名前のみによるベストエフォート解決

### EXTENDS
継承関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Class | Class | — |
| Interface | Interface | — |

### IMPLEMENTS
インターフェース実装関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Class | Interface | — |

### IMPORTS
ファイル間のインポート関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| File | File | `importPath: string` |

### REFERENCES（Phase 3: Markdown連携）
MarkdownセクションからコードシンボルへのREFERENCES関係。

| 起点 | 終点 | プロパティ |
|---|---|---|
| Section | Class | `linkText: string`, `approach: string` |
| Section | Method | `linkText: string`, `approach: string` |
| Section | Function | `linkText: string`, `approach: string` |

---

## Node ID 生成ルール

```
NodeId = "${label}:${normalizedFilePath}:${qualifiedName}"
```

- `normalizedFilePath`: OSに依らないスラッシュ区切り、リポジトリルートからの相対パス
- `qualifiedName`: Java=`com.example.ClassName.methodName`、TS/JS=`ClassName.methodName`
- オーバーロード区別: `#${paramCount}` をsuffixに追加（例: `Method:src/Foo.java:Foo.doThing#2`）
- TypeScriptのオーバーロードシグネチャは実装本体のIDに統合（宣言のみのシグネチャは除外）

---

## Neo4j 出力ファイル構成

### CSVファイル（bulk import用）
```
output/
├── nodes_File.csv
├── nodes_Folder.csv
├── nodes_Class.csv
├── nodes_Interface.csv
├── nodes_Method.csv
├── nodes_Function.csv
├── nodes_Field.csv
├── rels_CONTAINS.csv
├── rels_HAS_METHOD.csv
├── rels_HAS_PROPERTY.csv
├── rels_CALLS.csv
├── rels_EXTENDS.csv
├── rels_IMPLEMENTS.csv
├── rels_IMPORTS.csv
└── neo4j-import.sh      # 自動生成されるインポートコマンド
```

### Cypherファイル（.txt）
```
output/
├── cypher_schema.txt    # CREATE CONSTRAINT / CREATE INDEX
├── cypher_nodes.txt     # UNWIND + MERGE（500件バッチ）
└── cypher_rels.txt      # MATCH + MERGE（全ノード作成後に実行）
```

---

## 便利なNeo4jクエリ例

```cypher
-- クラスの継承ツリー
MATCH path = (c:Class)-[:EXTENDS*]->(parent:Class)
RETURN path

-- あるメソッドを呼び出しているメソッドを全取得
MATCH (caller)-[:CALLS]->(m:Method {name: 'validateUser'})
RETURN caller

-- インターフェースを実装しているクラス一覧
MATCH (c:Class)-[:IMPLEMENTS]->(i:Interface {name: 'UserRepository'})
RETURN c

-- ファイルの依存関係グラフ
MATCH (f:File)-[:IMPORTS]->(dep:File)
RETURN f.name, dep.name
```
