#!/usr/bin/env bash
# setup.sh — source2graph 環境構築スクリプト
# 対象: CentOS 8 / RHEL 8 系 WSL（dnf ベース）
# 実行: bash setup.sh
#
# 実行すると以下を行います:
#   1. CRLF 自己修正（Windows 環境から clone した場合の対策）
#   2. ビルドツール (gcc, make, python3) のインストール
#   3. nvm のインストール（未インストール時）
#   4. Node.js 20 LTS のインストールと有効化
#   5. npm install --build-from-source
#      （プレビルドバイナリの GLIBCXX 非互換を回避してソースからコンパイル）
#   6. npm run build（TypeScript → dist/）
#   7. npm link（s2g コマンドをグローバル登録）
#   8. s2g --version で動作確認

### ── Step 0: CRLF 自己修正 ─────────────────────────────────────
# Windows 側で編集・clone した場合、\r が残って bash が動かないことがある。
# CRLF を検出したら LF に変換して再実行する。
if grep -qP '\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0"
  exec bash "$0" "$@"
fi

set -euo pipefail

### ── 色付きログ ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[s2g-setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[s2g-setup]${NC} $*"; }
error() { echo -e "${RED}[s2g-setup]${NC} $*" >&2; exit 1; }

### ── 前提確認 ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "作業ディレクトリ: $SCRIPT_DIR"

[[ -f "$SCRIPT_DIR/package.json" ]] \
  || error "package.json が見つかりません。source2graph/ ディレクトリで実行してください。"

### ── Step 1: ビルドツール (gcc / g++ / make / python3) ──────────
# tree-sitter のネイティブアドオンをソースからコンパイルするために必要
info "ビルドツールの確認..."

NEED_PKGS=()
command -v gcc    >/dev/null 2>&1 || NEED_PKGS+=(gcc)
command -v g++    >/dev/null 2>&1 || NEED_PKGS+=(gcc-c++)
command -v make   >/dev/null 2>&1 || NEED_PKGS+=(make)
command -v python3 >/dev/null 2>&1 || NEED_PKGS+=(python3)

if [[ ${#NEED_PKGS[@]} -gt 0 ]]; then
  info "以下のパッケージをインストールします: ${NEED_PKGS[*]}"
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y "${NEED_PKGS[@]}"
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y "${NEED_PKGS[@]}"
  elif command -v apt-get >/dev/null 2>&1; then
    # Ubuntu/Debian 向けパッケージ名に読み替え
    APT_PKGS=("${NEED_PKGS[@]/gcc-c++/g++}")
    sudo apt-get install -y "${APT_PKGS[@]}"
  else
    error "パッケージマネージャが見つかりません。gcc / g++ / make / python3 を手動でインストールしてください。"
  fi
else
  info "ビルドツールは既にインストール済みです。"
fi

### ── Step 2: nvm のインストール ────────────────────────────────
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  info "nvm をインストールします..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
else
  info "nvm は既にインストール済みです ($NVM_DIR)"
fi

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
\. "$NVM_DIR/nvm.sh"

### ── Step 3: Node.js 20 LTS のインストール ─────────────────────
NODE_TARGET="20"

CURRENT_NODE="$(node --version 2>/dev/null || echo 'none')"
CURRENT_MAJOR="$(echo "$CURRENT_NODE" | sed 's/v\([0-9]*\).*/\1/' | grep -E '^[0-9]+$' || echo '0')"

if [[ "$CURRENT_MAJOR" -lt "$NODE_TARGET" ]]; then
  info "Node.js $NODE_TARGET LTS をインストールします（現在: $CURRENT_NODE）..."
  nvm install "$NODE_TARGET"
  nvm alias default "$NODE_TARGET"
fi

nvm use "$NODE_TARGET"
info "使用する Node: $(node --version)  npm: $(npm --version)"

### ── Step 4: npm install + プレビルドバイナリ除去 + rebuild ────
# tree-sitter 系パッケージは npm パッケージ内に prebuilds/*.node を同梱しており、
# node-gyp-build がランタイムにそれを優先ロードする。
# CentOS 8 の libstdc++ は最大 GLIBCXX_3.4.25 だが、同梱バイナリは
# GLIBCXX_3.4.29 (GCC 11+) 必須のため ERR_DLOPEN_FAILED が発生する。
#
# 対策: npm install 後にプレビルドバイナリを削除し、npm rebuild で
# ローカルの gcc を使って再コンパイルさせる。
info "npm install を実行します..."
cd "$SCRIPT_DIR"
npm install
info "npm install 完了。"

info "プレビルドバイナリを除去してローカルコンパイルに切り替えます..."
# prebuilds/ 内の .node ファイルを削除（node-gyp-build は build/Release/ を優先するため）
find "$SCRIPT_DIR/node_modules" \
  -path "*/prebuilds/*.node" \
  -delete 2>/dev/null || true

info "ネイティブアドオンをソースからコンパイルします（数分かかります）..."
npm rebuild
info "リビルド完了。"

### ── Step 5: npm run build ──────────────────────────────────────
info "TypeScript をビルドします..."
npm run build
info "ビルド完了 → dist/cli/index.js"

### ── Step 6: npm link ───────────────────────────────────────────
info "s2g コマンドをグローバル登録します（npm link）..."
npm link
info "npm link 完了。"

### ── Step 7: 動作確認 ───────────────────────────────────────────
echo ""
info "動作確認..."
S2G_VERSION="$(s2g --version 2>&1 || true)"

if echo "$S2G_VERSION" | grep -qE '^[0-9]'; then
  echo -e "${GREEN}✔ s2g $S2G_VERSION — セットアップ成功！${NC}"
else
  warn "s2g --version の出力: $S2G_VERSION"
  warn "s2g コマンドが PATH に入っていない可能性があります。"
  warn "以下を ~/.bashrc に追加して再ログインしてください:"
  echo ""
  echo '  export NVM_DIR="$HOME/.nvm"'
  echo '  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
  echo ""
fi

### ── 使い方の案内 ──────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────"
echo " 使い方（例）"
echo "──────────────────────────────────────────"
echo "  s2g analyze /path/to/your/project"
echo "  s2g neo4j up && s2g neo4j import /path/to/your/project --open"
echo "  s2g serve --repo /path/to/your/project"
echo ""
echo " ※ 新しいターミナルで s2g が見つからない場合は:"
echo '   source ~/.bashrc  または  source ~/.bash_profile'
echo "──────────────────────────────────────────"
