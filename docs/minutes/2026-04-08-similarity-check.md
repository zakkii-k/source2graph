# 議事録 — 2026-04-08（類似度検査）

## 目的

CodeNexusがGitNexusのコードを流用していないことを、ツールで客観的に検証する。

---

## 使用ツール

### jscpd（JavaScript Copy-Paste Detector）v4.0.8
- MIT ライセンス
- トークンベースのコピー検出
- `npx jscpd /app/codenexus/src /app/GitNexus/gitnexus/src --min-tokens 50`

### Python difflib（標準ライブラリ）
- 行ベースの類似度計算（SequenceMatcher）
- ファイルペアごとの類似率を算出

---

## jscpd 検査結果

| 項目 | 数値 |
|---|---|
| 解析ファイル数合計 | 206ファイル（22 CodeNexus + 184 GitNexus） |
| 総行数 | 44,628行 |
| **クロスプロジェクト一致（CodeNexus ↔ GitNexus）** | **0件** |
| CodeNexus内部の一致 | 26件（言語プロバイダの共通パターン） |
| GitNexus内部の一致 | 120件 |

### 結論
**CodeNexusとGitNexusの間にコピー検出は一切なし（0件）。**

---

## ファイルペア別類似率（difflib）

| ファイルペア | 類似率 | 行数A | 行数B |
|---|---|---|---|
| tree-sitter-queries.ts | **3.1%** | 337 | 1196 |
| java.ts | **1.3%** | 417 | 51 |
| typescript.ts | **1.3%** | 421 | 203 |
| knowledge-graph.ts vs graph.ts | **16.6%** | 52 | 93 |
| symbol-table.ts | **4.2%** | 84 | 346 |
| pipeline.ts | **0.8%** | 113 | 1831 |
| graph-types.ts vs types.ts | **4.7%** | 162 | 134 |

### 最高類似ファイルの内訳（knowledge-graph.ts: 16.6%）
実際に一致する行をdifflibで検証した結果：

**一致した唯一の意味ある行: `return {`**

→ TypeScriptのオブジェクト返却構文であり、あらゆるコードに現れる汎用構文。著作権上問題なし。

---

## tree-sitter-queries.ts の詳細比較

| 指標 | 値 |
|---|---|
| CodeNexus ユニークトークン数 | 102 |
| GitNexus ユニークトークン数 | 639 |
| Jaccard類似度（トークンセット） | **8.2%** |
| 一致するクエリ文字列（完全一致） | **0件** |

Jaccard 8.2%の内訳：共有トークンは `class_declaration`・`identifier`・`method_declaration` などのtree-sitter文法語彙（S式の構文キーワード）。これらはtree-sitterの仕様であり、どのtree-sitter実装でも共通して使われる語彙。コードの流用とは無関係。

---

## CodeNexus内部類似（26件）の評価

全26件が `java.ts` / `typescript.ts` / `javascript.ts` の間での一致。

**原因**: 3言語プロバイダはすべて同じ `LanguageProvider` インターフェースを実装しているため、以下のパターンが繰り返される：
```typescript
const classNode = match.captures.find((c) => c.name === 'class')?.node
const nameNode = match.captures.find((c) => c.name === 'name')?.node
if (!classNode || !nameNode) continue
```
これはインターフェース契約上の必然的な繰り返しであり、問題なし。将来的にリファクタリングで共通化できるが、現時点では機能上問題ない。

---

## 総合評価

| 観点 | 評価 | 根拠 |
|---|---|---|
| コードの直接流用 | **問題なし** | jscpdクロスプロジェクト一致0件 |
| アルゴリズムレベルの類似 | **問題なし** | 最高16.6%、一致行は `return {` のみ |
| クエリ文字列の流用 | **問題なし** | 完全一致0件、共通語彙はS式の仕様語 |
| 構造・設計の類似 | **独立して設計** | 同一課題に対する自然な設計収束 |

**結論: Phase 5以降の実装を問題なく継続できる。**

---

## 補足: なぜ「設計が似ている」のは問題ない

コードグラフ解析ツールを作る場合、以下の設計判断は当然・必然の収束：
- ファイルウォーカー + 言語プロバイダのStrategy パターン
- インメモリMap型グラフ（nodeId → GraphNode）
- フェーズ分け（抽出 → インポート解決 → 継承解決 → 呼び出し解決）
- Neo4j出力（スキーマ定義 → ノード → リレーション の順）

これらは「この課題を解く唯一の自然な方法」であり、著作権保護の対象外（アイデア・アルゴリズム自体は保護されない）。
