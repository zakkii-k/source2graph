# ローカルLLM（Ollama）で source2graph MCP を使う

このガイドでは、llm-rag-trial を経由して Ollama ローカルLLM（llama / qwen2.5-coder / qwen3 / qwen3.5 / gemma2）から source2graph MCP を利用する方法を説明します。

---

## アーキテクチャ

```
Claude Code      ─┐
GitHub Copilot   ─┤──→ source2graph MCP server（s2g serve）
Cursor           ─┤
Ollama（本ガイド）─┘
         ↑
   llm-rag-trial（s2g_chat.py）が中継
```

`s2g_chat.py` が source2graph MCP サーバーをサブプロセスとして起動し、Ollama のツール呼び出し（function calling）に橋渡しします。source2graph 側のコード変更は不要です。

---

## 前提条件

| 項目 | 確認コマンド |
|---|---|
| Node.js 18以上 | `node --version` |
| source2graph ビルド済み | `ls dist/cli/index.js` |
| Ollama 起動中 | `curl http://localhost:11434/api/tags` |
| ツール呼び出し対応モデルのpull済み | `ollama list` |
| Python 3.11以上 | `python --version` |

### ツール呼び出し対応モデル

以下のモデルが source2graph ツールを呼び出せます：

| モデルキー | Ollama モデル名 | 備考 |
|---|---|---|
| `qwen-small` | `qwen2.5-coder:7b` | **GraphRAG 推奨**（Cypher 生成精度が高い） |
| `qwen-large` | `qwen2.5-coder:14b` | 高精度版 |
| `qwen3-small` | `qwen3:8b` | 汎用 |
| `qwen3-medium` | `qwen3:14b` | 汎用・高精度 |
| `qwen35-small` | `qwen3.5:4b` | 軽量 |
| `small` | `llama3.2` | 軽量・低精度 |
| `large` | `gemma2:27b` | 高精度・要スペック |

```bash
# 例: qwen2.5-coder:7b を pull
ollama pull qwen2.5-coder:7b
```

---

## ステップ 1: source2graph をビルドする

```bash
cd /path/to/source2graph
npm install
npm run build

# 確認
node dist/cli/index.js --version
```

---

## ステップ 2: llm-rag-trial をセットアップする

```bash
git clone https://github.com/zakkii-k/llm-rag-trial.git
cd llm-rag-trial
pip install -r requirements.txt
```

---

## ステップ 3: 起動する

```bash
cd llm-rag-trial

python app/s2g_chat.py \
  --repo /path/to/your/project \
  --model qwen-small
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--repo` | 解析対象リポジトリのパス | `/app` |
| `--model` | 使用モデルキー | `qwen-small` |
| `--s2g` | source2graph CLI のパス | `/app/source2graph/dist/cli/index.js` |

source2graph CLI のパスが異なる場合は `--s2g` で指定します：

```bash
python app/s2g_chat.py \
  --repo ~/myproject \
  --model qwen3-small \
  --s2g ~/source2graph/dist/cli/index.js
```

---

## ステップ 4: 使ってみる

起動すると対話モードになります：

```
source2graph MCP サーバーに接続中... (repo: /path/to/your/project)
接続完了 — ツール: analyze, query_nodes, get_callers, get_callees, get_context
モデル : qwen2.5-coder:7b

質問> GraphManagerクラスはどこから呼ばれていますか？
  → get_callers({"symbolName": "GraphManager"})

GraphManagerは以下のファイルから呼ばれています...
```

### 使えるツール

| ツール | 説明 |
|---|---|
| `analyze` | リポジトリを解析してグラフを構築 |
| `query_nodes` | ラベル・名前パターン・ファイルパスでノードを検索 |
| `get_callers` | 指定シンボルを呼び出している箇所を取得 |
| `get_callees` | 指定シンボルが呼び出すものを取得 |
| `get_context` | シンボルの360度ビュー（呼び出し元・先・継承関係） |

---

## トラブルシューティング

### `Cannot find module` エラー

source2graph がビルドされていません：

```bash
cd /path/to/source2graph
npm run build
```

### ツール呼び出しが発生しない

モデルがツール呼び出しに対応していないか、質問が曖昧な可能性があります。明示的に指示してください：

```
質問> get_context ツールを使って UserService クラスの情報を取得してください
```

または `qwen2.5-coder` 系モデルへの切り替えを検討してください。

### Ollama に接続できない

`OLLAMA_BASE_URL` 環境変数で接続先を変更できます：

```bash
OLLAMA_BASE_URL=http://192.168.1.10:11434 python app/s2g_chat.py --repo /app
```
