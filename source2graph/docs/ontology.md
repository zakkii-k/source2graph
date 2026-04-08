# CodeNexus グラフオントロジー

CodeNexus が構築するナレッジグラフのノードラベル・エッジ（リレーション）タイプ・プロパティの完全定義です。

## 目次

1. [概要図](#1-概要図)
2. [ノードラベル](#2-ノードラベル)
   - [File](#file)
   - [Folder](#folder)
   - [Class](#class)
   - [Interface](#interface)
   - [Method](#method)
   - [Function](#function)
   - [Field](#field)
   - [Section](#section)
   - [Package](#package)
3. [エッジ（リレーション）タイプ](#3-エッジリレーションタイプ)
   - [CONTAINS](#contains)
   - [HAS_METHOD](#has_method)
   - [HAS_PROPERTY](#has_property)
   - [EXTENDS](#extends)
   - [IMPLEMENTS](#implements)
   - [IMPORTS](#imports)
   - [CALLS](#calls)
   - [REFERENCES](#references)
   - [DOCUMENTS](#documents)
4. [nodeId の生成規則](#4-nodeid-の生成規則)
5. [言語ごとのマッピング](#5-言語ごとのマッピング)

---

## 1. 概要図

```
Folder ──[CONTAINS]──► Folder
  │
  └──[CONTAINS]──► File ──[CONTAINS]──► Class ──[HAS_METHOD]──► Method
                    │                    │   └──[HAS_PROPERTY]──► Field
                    │                    └──[EXTENDS]──► Class
                    │                    └──[IMPLEMENTS]──► Interface
                    │
                    ├──[CONTAINS]──► Interface ──[HAS_METHOD]──► Method
                    │
                    ├──[CONTAINS]──► Function
                    │
                    ├──[CONTAINS]──► Section ──[REFERENCES]──► File/Class/Method/...
                    │                         └──[DOCUMENTS]──► Class/Interface/...
                    │
                    ├──[IMPORTS]──► File        （ローカルファイル）
                    └──[IMPORTS]──► Package     （外部パッケージ）

Method/Function ──[CALLS]──► Method/Function
```

---

## 2. ノードラベル

### File

ソースコードファイル1つを表します。すべてのシンボルノードはいずれかの `File` ノードに帰属します。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"File:src/service/UserService.ts"` |
| `name` | string | ファイル名（パスなし） | `"UserService.ts"` |
| `filePath` | string | リポジトリルートからの相対パス | `"src/service/UserService.ts"` |
| `language` | string | 検出された言語（下記参照） | `"typescript"` |
| `extension` | string | ファイル拡張子 | `".ts"` |

**`language` の値一覧:**

| 値 | 対象 |
|---|---|
| `"java"` | `.java` |
| `"typescript"` | `.ts` |
| `"typescriptreact"` | `.tsx` |
| `"javascript"` | `.js` `.mjs` `.cjs` |
| `"javascriptreact"` | `.jsx` |
| `"scala"` | `.scala` `.sbt` |
| `"markdown"` | `.md` |
| `"unknown"` | 上記以外 |

---

### Folder

ディレクトリを表します。ルートから各ファイルまでのディレクトリ階層がすべてノードとして作成されます。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Folder:src/service"` |
| `name` | string | ディレクトリ名（最後のパス要素） | `"service"` |
| `folderPath` | string | リポジトリルートからの相対パス | `"src/service"` |

---

### Class

クラス宣言を表します。Scala の `object`（シングルトン）も `Class` として格納されます。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Class:src/UserService.ts:UserService"` |
| `name` | string | クラス名 | `"UserService"` |
| `qualifiedName` | string | 完全修飾名（パッケージ含む） | `"com.example.UserService"` |
| `filePath` | string | 定義ファイルの相対パス | `"src/UserService.ts"` |
| `startLine` | integer | 定義開始行（1始まり） | `5` |
| `endLine` | integer | 定義終了行 | `42` |
| `visibility` | string | アクセス修飾子 | `"public"` / `"private"` / `"protected"` / `"package"` |
| `isAbstract` | boolean | 抽象クラスか | `false` |
| `isStatic` | boolean | Scala `object`（シングルトン）の場合 `true` | `false` |
| `language` | string | 定義言語 | `"java"` |

---

### Interface

インターフェース宣言を表します。Scala の `trait` も `Interface` として格納されます。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Interface:src/Repository.ts:Repository"` |
| `name` | string | インターフェース名 | `"Repository"` |
| `qualifiedName` | string | 完全修飾名 | `"com.example.UserRepository"` |
| `filePath` | string | 定義ファイルの相対パス | `"src/Repository.ts"` |
| `startLine` | integer | 定義開始行 | `1` |
| `endLine` | integer | 定義終了行 | `10` |
| `visibility` | string | アクセス修飾子 | `"public"` |
| `language` | string | 定義言語 | `"typescript"` |

---

### Method

クラスまたはインターフェースに属するメソッド定義を表します。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Method:src/UserService.ts:UserService.findById#1"` |
| `name` | string | メソッド名 | `"findById"` |
| `qualifiedName` | string | `クラス名.メソッド名` 形式 | `"UserService.findById"` |
| `filePath` | string | 定義ファイルの相対パス | `"src/UserService.ts"` |
| `startLine` | integer | 定義開始行 | `8` |
| `endLine` | integer | 定義終了行 | `12` |
| `visibility` | string | アクセス修飾子 | `"public"` |
| `isStatic` | boolean | staticメソッドか | `false` |
| `isAsync` | boolean | async/awaitか（JS/TSのみ） | `true` |
| `returnType` | string | 戻り値の型（取得できた場合） | `"Promise<User>"` |
| `paramCount` | integer | パラメータ数 | `1` |
| `language` | string | 定義言語 | `"typescript"` |

**nodeId のフォーマット:** `Method:{filePath}:{qualifiedName}#{paramCount}`

---

### Function

クラスに属さないトップレベル関数を表します（TypeScript・JavaScript・JavaScript の `export function` など）。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Function:src/utils.ts:validateEmail"` |
| `name` | string | 関数名 | `"validateEmail"` |
| `filePath` | string | 定義ファイルの相対パス | `"src/utils.ts"` |
| `startLine` | integer | 定義開始行 | `3` |
| `endLine` | integer | 定義終了行 | `7` |
| `isAsync` | boolean | async 関数か | `false` |
| `isExported` | boolean | `export` されているか | `true` |
| `returnType` | string | 戻り値の型（取得できた場合） | `"boolean"` |
| `paramCount` | integer | パラメータ数 | `1` |
| `language` | string | 定義言語 | `"typescript"` |

---

### Field

クラスのフィールド（メンバー変数）を表します。Scala の `val`/`var` も含みます。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Field:src/UserService.ts:UserService.repo"` |
| `name` | string | フィールド名 | `"repo"` |
| `filePath` | string | 定義ファイルの相対パス | `"src/UserService.ts"` |
| `startLine` | integer | 定義行 | `4` |
| `visibility` | string | アクセス修飾子 | `"private"` |
| `isStatic` | boolean | static フィールドか（Scala の `val` では `true`） | `false` |
| `fieldType` | string | 型名（取得できた場合） | `"UserRepository"` |
| `language` | string | 定義言語 | `"java"` |

---

### Section

Markdown ファイル内の見出しセクションを表します。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Section:docs/api.md:Installation"` |
| `name` | string | 見出しテキスト | `"Installation"` |
| `heading` | string | `name` と同値 | `"Installation"` |
| `level` | integer | 見出しレベル（1〜6） | `2` |
| `filePath` | string | Markdown ファイルの相対パス | `"docs/api.md"` |
| `startLine` | integer | 見出し行 | `10` |
| `endLine` | integer | セクション終了行（次の同レベル見出しの直前） | `25` |

---

### Package

外部パッケージ（npm、Maven等）を表します。リポジトリ内に対応ファイルが見つからないインポートに対して作成されます。

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `nodeId` | string | グラフ内の一意ID | `"Package:express"` |
| `name` | string | パッケージ名 | `"express"` |
| `packageName` | string | パッケージ名（`name` と同値） | `"express"` |

**正規化ルール:**
- スコープ付きパッケージ: `@types/node/fs` → `@types/node`
- サブパス付きパッケージ: `lodash/fp` → `lodash`
- Scala FQN: `scala.collection.mutable` → `scala.collection`（先頭2セグメント）

---

## 3. エッジ（リレーション）タイプ

すべてのエッジは `relId` プロパティを持ちます。

### CONTAINS

包含関係を表します。ファイルシステム階層とシンボル階層の両方で使われます。

**方向:** 包含する側 → 含まれる側

| 開始ノード | 終了ノード | 意味 |
|---|---|---|
| `Folder` | `Folder` | 親ディレクトリ → 子ディレクトリ |
| `Folder` | `File` | ディレクトリ → ファイル |
| `File` | `Class` | ファイル → 定義クラス |
| `File` | `Interface` | ファイル → 定義インターフェース |
| `File` | `Function` | ファイル → トップレベル関数 |
| `File` | `Section` | Markdown ファイル → セクション |

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

### HAS_METHOD

クラス/インターフェースとそのメソッドの関係を表します。

**方向:** `Class` / `Interface` → `Method`

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

### HAS_PROPERTY

クラスとそのフィールドの関係を表します。

**方向:** `Class` → `Field`

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

### EXTENDS

継承関係を表します。

**方向:** 子クラス/インターフェース → 親クラス/インターフェース

| 開始ノード | 終了ノード | 意味 |
|---|---|---|
| `Class` | `Class` | クラス継承 |
| `Interface` | `Interface` | インターフェース継承 |

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

### IMPLEMENTS

実装関係を表します。

**方向:** `Class` → `Interface`

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

### IMPORTS

インポート依存関係を表します。

**方向:** インポートするファイル → インポート先ファイル/パッケージ

| 開始ノード | 終了ノード | 意味 |
|---|---|---|
| `File` | `File` | ローカルファイルへのインポート |
| `File` | `Package` | 外部パッケージへのインポート |

**プロパティ:**

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `relId` | string | エッジの一意ID | |
| `importPath` | string | ソース中のインポートパス文字列そのもの | `"./lib/api"`, `"com.example.model.User"` |

---

### CALLS

メソッド/関数呼び出し関係を表します。シンボルテーブルの名前解決で構築され、信頼度スコアが付きます。

**方向:** 呼び出し元 → 呼び出し先

| 開始ノード | 終了ノード |
|---|---|
| `Method` | `Method` |
| `Method` | `Function` |
| `Function` | `Method` |
| `Function` | `Function` |

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |
| `confidence` | float (0.0–1.0) | 名前解決の確信度。同一ファイル内: `0.9`、クロスファイル: `0.7` |

---

### REFERENCES

Markdown セクション/ファイルからソースコードへのリンク参照を表します。`[text](path#Lnn)` 形式のリンクから構築されます。

**方向:** `Section` / `File` → 参照先ノード（任意ラベル）

**プロパティ:**

| プロパティ | 型 | 説明 | 例 |
|---|---|---|---|
| `relId` | string | エッジの一意ID | |
| `linkText` | string | Markdown リンクのテキスト部分 | `"add method"` |
| `approach` | string | 解決アプローチ（`"line-lookup"` or `"file"`) | `"line-lookup"` |

---

### DOCUMENTS

Markdown ファイルがソースシンボルを文書化していることを表します。YAMLフロントマターの `s2g.describes` フィールドから構築されます。

**方向:** `Section` / `File` → 文書化されるシンボル（`Class` / `Interface` / `Function` / ...）

**プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `relId` | string | エッジの一意ID |

---

## 4. nodeId の生成規則

`nodeId` はグラフ全体で重複しない文字列識別子です。フォーマットはラベルごとに異なります。

| ラベル | フォーマット | 例 |
|---|---|---|
| `File` | `File:{filePath}` | `File:src/utils.ts` |
| `Folder` | `Folder:{folderPath}` | `Folder:src/service` |
| `Class` | `Class:{filePath}:{qualifiedName}` | `Class:src/UserService.ts:UserService` |
| `Interface` | `Interface:{filePath}:{qualifiedName}` | `Interface:src/Repo.ts:com.example.UserRepository` |
| `Method` | `Method:{filePath}:{qualifiedName}#{paramCount}` | `Method:src/UserService.ts:UserService.findById#1` |
| `Function` | `Function:{filePath}:{name}` | `Function:src/utils.ts:validateEmail` |
| `Field` | `Field:{filePath}:{className}.{fieldName}` | `Field:src/UserService.ts:UserService.repo` |
| `Section` | `Section:{filePath}:{heading}` | `Section:docs/api.md:Installation` |
| `Package` | `Package:{packageName}` | `Package:express`, `Package:@types/node` |

> `Package` ノードはパッケージ名で重複排除されるため、同じパッケージを複数ファイルがインポートしても1つのノードになります。

---

## 5. 言語ごとのマッピング

各言語の構文要素がどのノード/エッジにマッピングされるかの対応表です。

### Java

| Java 構文 | ノード/エッジ | 備考 |
|---|---|---|
| `class Foo` | `Class` | `qualifiedName` にパッケージ名を含む |
| `interface Foo` | `Interface` | |
| `void bar(...)` | `Method` | `HAS_METHOD` で `Class`/`Interface` に紐付く |
| `private String field` | `Field` | `HAS_PROPERTY` で `Class` に紐付く |
| `import com.example.Foo` | `IMPORTS` (File→File) | FQNをパスに変換して解決 |
| `import com.example.*` | — | ワイルドカードはスキップ |
| `extends Bar` | `EXTENDS` (Class→Class) | |
| `implements Baz` | `IMPLEMENTS` (Class→Interface) | |
| `foo.bar()` | `CALLS` | |

### TypeScript / JavaScript

| TS/JS 構文 | ノード/エッジ | 備考 |
|---|---|---|
| `class Foo` | `Class` | |
| `interface Foo` | `Interface` | TSのみ |
| `foo() {}` （クラス内） | `Method` | |
| `public field: Type` | `Field` | TSのみ（`public_field_definition`） |
| `function foo()` | `Function` | トップレベルのみ |
| `const foo = () => {}` | `Function` | `export` された arrow function |
| `import ... from './path'` | `IMPORTS` (File→File) | 相対パス・エイリアス両対応 |
| `import ... from 'package'` | `IMPORTS` (File→Package) | 解決できなければ外部扱い |
| `extends Bar` | `EXTENDS` | |
| `implements Baz` | `IMPLEMENTS` | TSのみ |
| `foo()` / `obj.foo()` | `CALLS` | |

### Scala

| Scala 構文 | ノード/エッジ | 備考 |
|---|---|---|
| `class Foo` | `Class` | |
| `trait Foo` | `Interface` | |
| `object Foo` | `Class` | 名前に `$` サフィックス、`isStatic: true` |
| `def bar(...)` （クラス/トレイト内） | `Method` | |
| `val field` / `var field` （クラス直下） | `Field` | メソッド内のローカル `val` は対象外 |
| `import com.example.Foo` | `IMPORTS` (File→File) | FQNをパスに変換して解決 |
| `import com.example.{Foo, Bar}` | `IMPORTS` × 2 | 各シンボルごとに個別解決 |
| `import Foo => Bar` | `IMPORTS` | 元の名前（`Foo`）で解決 |
| `import com.example._` | — | ワイルドカードはスキップ |
| `extends Bar` | `EXTENDS` または `IMPLEMENTS` | 相手が Class → EXTENDS、Interface → IMPLEMENTS |
| `with Baz` | `EXTENDS` または `IMPLEMENTS` | 同上 |
| `foo()` / `obj.foo()` | `CALLS` | |

### Markdown

| Markdown 要素 | ノード/エッジ | 備考 |
|---|---|---|
| `# Heading` 〜 `###### Heading` | `Section` | `CONTAINS` で `File` に紐付く |
| `[text](path#Lnn)` リンク | `REFERENCES` | 行番号からシンボルを解決 |
| `[text](path)` リンク（行番号なし） | `REFERENCES` (→File) | |
| フロントマター `s2g.describes: Foo` | `DOCUMENTS` (→Class等) | |
