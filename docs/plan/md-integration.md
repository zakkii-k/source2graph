# CodeNexus — Markdown連携設計案

## 概要

Markdown形式の設計書・仕様書をコードグラフと連携させることで、AIが「設計書のこのセクションはこのクラスに対応する」という情報を横断的に利用できるようにする。

---

## Approach A: セクションノード + テキスト自動マッチング（低優先度）

### 仕組み
- MDファイルの見出しを `Section` ノードとして登録
- セクション本文中のテキストをスキャンし、シンボルテーブルに存在する名前と照合
- 一致した名前に `REFERENCES` エッジを自動生成

### 実装イメージ
```markdown
## ユーザー認証フロー

UserServiceクラスのvalidateUserメソッドが呼ばれる。
```
↓ `UserService` がシンボルテーブルにあれば自動的に REFERENCES エッジを生成

### 評価
| 観点 | 評価 |
|---|---|
| 実装コスト | 低（正規表現+シンボルテーブルルックアップ）|
| ノイズ | 高（英単語と重なるシンボル名で誤検知）|
| 必要な記述変更 | 不要 |

### 判断
**後回し。** 一般的な英単語（例: `List`, `File`, `User`）と変数名が重なるとノイズが多い。日本語ドキュメントでは英語識別子を明示的に書くため精度が高まる可能性はあるが、まずApproach BとCを実装する。

---

## Approach B: Markdownリンクによる明示参照（優先実装）

### 仕組み
MDファイル内の標準的なMarkdownリンクを解析し、リンク先がソースファイルかつ行番号フラグメントが存在する場合に `REFERENCES` エッジを生成。

### 記述形式
```markdown
[UserService](../src/service/UserService.java#L15)
[validateUser メソッド](../src/service/UserService.java#L45)
[UserRepository インターフェース](../src/repository/UserRepository.ts#L3)
```

### 処理フロー
1. MDファイルから `[text](path#fragment)` パターンを正規表現で抽出
2. `path` をMDファイルからの相対パスとして解決
3. 解決されたファイルパスが解析済みソースファイルかどうか確認
4. `fragment` が `L{number}` 形式なら行番号として解釈
5. 該当行番号を含む（`startLine <= line <= endLine`）ノードをシンボルテーブルで検索
6. Section ノード → 発見されたノードへ `REFERENCES` エッジを生成

### Neo4jでのクエリ例
```cypher
-- UserServiceクラスを参照している設計書セクションを取得
MATCH (s:Section)-[:REFERENCES]->(c:Class {name: 'UserService'})
RETURN s.heading, s.filePath

-- 設計書から参照されているすべてのクラスを取得
MATCH (s:Section)-[:REFERENCES]->(c:Class)
RETURN s.filePath, s.heading, c.name
```

### 評価
| 観点 | 評価 |
|---|---|
| 実装コスト | 低（正規表現 + 行番号ルックアップ）|
| ノイズ | ゼロ（明示的リンクのみ）|
| 必要な記述変更 | 標準Markdownリンク形式を使うだけ |
| GitHub上での表示 | 通常のファイルリンクとして機能 |

### 判断
**Phase 7で最初に実装。** 記述コストが低く、誤検知がない。既存のMarkdownリンク慣習とも整合。

---

## Approach C: YAMLフロントマター（推奨・明示的マッピング）

### 仕組み
MDファイルの先頭にYAML frontmatterを追加し、`codenexus` キー配下で対応するコードシンボルを明示的に宣言。

### 記述形式
```yaml
---
title: ユーザー認証設計書
codenexus:
  describes:
    - class: com.example.service.UserService
    - method: com.example.service.UserService.validateUser
    - interface: com.example.repository.UserRepository
  layer: service
  domain: authentication
---

# ユーザー認証設計書

このドキュメントは UserService の設計について説明します。
```

### 処理フロー
1. `js-yaml` でfrontmatterを解析
2. `describes` 配列の各エントリを解析
3. `class:` / `method:` / `interface:` キーに対応するノードをシンボルテーブルで検索
4. Fileノード（MDファイル）→ 発見されたノードへ `DOCUMENTS` エッジを生成
5. `layer` / `domain` はFileノードのプロパティとして追加

### Neo4jでのクエリ例
```cypher
-- サービス層のクラスとそれを文書化している設計書を取得
MATCH (f:File {layer: 'service'})-[:DOCUMENTS]->(c:Class)
RETURN f.name, c.name

-- あるクラスに関する設計書を取得
MATCH (f:File)-[:DOCUMENTS]->(c:Class {name: 'UserService'})
RETURN f.filePath, f.name

-- ドメイン別の設計書一覧
MATCH (f:File)
WHERE f.domain IS NOT NULL
RETURN f.domain, collect(f.name)
ORDER BY f.domain
```

### 新しいRelationshipタイプ
- `DOCUMENTS`: File（MD）→ Class / Method / Interface / Function

### 評価
| 観点 | 評価 |
|---|---|
| 実装コスト | 低〜中（js-yaml + シンボル解決）|
| ノイズ | ゼロ（明示的宣言）|
| 必要な記述変更 | frontmatterの追加が必要 |
| クエリ利便性 | 高（layer / domain でアーキテクチャ観点のクエリが可能）|

### 判断
**Phase 7でApproach Bと並行して実装推奨。** 特に正式な設計書・アーキテクチャドキュメントに適している。`layer` / `domain` による階層分類はアーキテクチャ分析に非常に強力。

---

## 実装優先順

```
Phase 7-A: Approach B（MDリンク解析）  ← 実装コスト低・ノイズゼロ
Phase 7-B: Approach C（frontmatter）   ← 設計書向け・クエリ力が高い
Phase X  : Approach A（テキスト自動マッチング） ← 後回し
```

---

## 共通事項

### Section ノードの生成タイミング
Approach A / B どちらの場合も、MDファイルには `Section` ノードを生成する。
生成ロジックは `src/core/ingestion/markdown-processor.ts` に分離。

### MDファイルの検出
- 拡張子 `.md` / `.mdx` を対象
- `--include-markdown` フラグで有効化（デフォルト: 無効）
- 理由: Markdownをコード解析と同時に処理することで混乱を避けるため、オプトインとする

### Approachの組み合わせ
Approach B と C は排他ではなく、同一ファイルに両方の情報があれば両方のエッジを生成する。
