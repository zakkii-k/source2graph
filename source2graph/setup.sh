#!/usr/bin/env bash
# setup.sh — source2graph 環境構築スクリプト
# 対象: CentOS 8 / RHEL 8 系 WSL（dnf ベース）
# 実行: bash setup.sh
#
# 実行すると以下を行います:
#   1. ビルドツール (gcc, make, python3) のインストール
#   2. nvm のインストール（未インストール時）
#   3. Node.js 20 LTS のインストールと有効化
#   4. npm install（ネイティブアドオンのコンパイル含む）
#   5. npm run build（TypeScript → dist/）
#   6. npm link（s2g コマンドをグローバル登録）
#   7. s2g --version で動作確認

set -euo pipefail

### ── 色付きログ ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[s2g-setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[s2g-setup]${NC} $*"; }
error() { echo -e "${RED}[s2g-setup]${NC} $*" >&2; exit 1; }

### ── 前提確認 ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "作業ディレクトリ: $SCRIPT_DIR"

# このスクリプトは source2graph/ 直下で実行することを想定
[[ -f "$SCRIPT_DIR/package.json" ]] || error "package.json が見つかりません。source2graph/ ディレクトリで実行してください。"

### ── 1. ビルドツール (gcc / make / python3) ─────────────────────
info "ビルドツールの確認..."

NEED_PKGS=()
command -v gcc   >/dev/null 2>&1 || NEED_PKGS+=(gcc)
command -v make  >/dev/null 2>&1 || NEED_PKGS+=(make)
command -v python3 >/dev/null 2>&1 || NEED_PKGS+=(python3)

if [[ ${#NEED_PKGS[@]} -gt 0 ]]; then
  info "以下のパッケージをインストールします: ${NEED_PKGS[*]}"
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y "${NEED_PKGS[@]}"
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y "${NEED_PKGS[@]}"
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get install -y "${NEED_PKGS[@]}"
  else
    error "パッケージマネージャが見つかりません。手動で gcc / make / python3 をインストールしてください。"
  fi
else
  info "ビルドツールは既にインストール済みです。"
fi

### ── 2. nvm のインストール ──────────────────────────────────────
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  info "nvm をインストールします..."
  # 公式インストールスクリプト（バージョンは適宜更新可）
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
else
  info "nvm は既にインストール済みです ($NVM_DIR)"
fi

# nvm をこのセッションで有効化
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
\. "$NVM_DIR/nvm.sh"

### ── 3. Node.js 20 LTS のインストール ──────────────────────────
NODE_TARGET="20"

CURRENT_NODE="$(node --version 2>/dev/null || echo 'none')"
CURRENT_MAJOR="$(echo "$CURRENT_NODE" | sed 's/v\([0-9]*\).*/\1/')"

if [[ "$CURRENT_MAJOR" -lt "$NODE_TARGET" ]] 2>/dev/null; then
  info "Node.js $NODE_TARGET LTS をインストールします（現在: $CURRENT_NODE）..."
  nvm install "$NODE_TARGET"
  nvm use "$NODE_TARGET"
  nvm alias default "$NODE_TARGET"
else
  info "Node.js $CURRENT_NODE は要件を満たしています（>= v$NODE_TARGET）。"
  nvm use "$NODE_TARGET" 2>/dev/null || true
fi

info "使用する Node: $(node --version)  npm: $(npm --version)"

### ── 4. npm install ─────────────────────────────────────────────
info "npm install を実行します（tree-sitter などネイティブアドオンのコンパイルを含むため数分かかります）..."
cd "$SCRIPT_DIR"

# node-gyp がグローバルに入っていない環境向け
npm install --include=dev

info "npm install 完了。"

### ── 5. npm run build ────────────────────────────────────────────
info "TypeScript をビルドします..."
npm run build
info "ビルド完了 → dist/cli/index.js"

### ── 6. npm link ────────────────────────────────────────────────
info "s2g コマンドをグローバル登録します（npm link）..."
npm link
info "npm link 完了。"

### ── 7. 動作確認 ────────────────────────────────────────────────
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
