#!/bin/bash
# =============================================================
# テストハーネス（test harness）
# =============================================================
# Claude Code から呼ばれる統合検証スクリプト。
# テスト・ビルド・静的解析を一括実行し、結果をまとめて報告する。
#
# 使い方:
#   bash scripts/harness.sh          # 全チェック実行
#   bash scripts/harness.sh --test   # テストのみ
#   bash scripts/harness.sh --build  # ビルドのみ
#   bash scripts/harness.sh --lint   # 型チェックのみ
# =============================================================

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS="${GREEN}✅ PASS${NC}"
FAIL="${RED}❌ FAIL${NC}"
WARN="${YELLOW}⚠️  WARN${NC}"

RESULTS=()
HAS_FAILURE=false

run_step() {
  local name="$1"
  local cmd="$2"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ${name}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if eval "$cmd" 2>&1; then
    RESULTS+=("${name}: $(echo -e ${PASS})")
  else
    RESULTS+=("${name}: $(echo -e ${FAIL})")
    HAS_FAILURE=true
  fi
}

# ------- 型チェック -------
run_lint() {
  run_step "型チェック (tsc --noEmit)" "npx tsc --noEmit"
}

# ------- テスト -------
run_test() {
  run_step "ユニットテスト (Jest)" "npx jest --verbose --forceExit 2>&1"
}

# ------- ビルド -------
run_build() {
  run_step "ビルド (esbuild → dist/Code.js)" "npm run build"
  
  if [ -f "dist/Code.js" ]; then
    local size=$(wc -c < dist/Code.js)
    echo "  出力ファイル: dist/Code.js (${size} bytes)"
    
    # グローバル関数の確認
    local missing_funcs=""
    for func in main setupTriggers testRun; do
      if ! grep -q "$func" dist/Code.js; then
        missing_funcs="${missing_funcs} ${func}"
      fi
    done
    
    if [ -n "$missing_funcs" ]; then
      echo -e "  ${WARN} グローバル関数が見つかりません:${missing_funcs}"
      RESULTS+=("グローバル関数チェック: $(echo -e ${FAIL})")
      HAS_FAILURE=true
    else
      echo -e "  グローバル関数: main, setupTriggers, testRun → OK"
      RESULTS+=("グローバル関数チェック: $(echo -e ${PASS})")
    fi
  else
    echo -e "  ${FAIL} dist/Code.js が生成されませんでした"
    HAS_FAILURE=true
  fi
}

# ------- サマリ -------
print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  サマリ"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  for result in "${RESULTS[@]}"; do
    echo -e "  ${result}"
  done
  echo ""
  
  if [ "$HAS_FAILURE" = true ]; then
    echo -e "  ${FAIL} 一部のチェックが失敗しました"
    exit 1
  else
    echo -e "  ${PASS} 全チェック通過"
    exit 0
  fi
}

# ------- メイン -------
cd "$(dirname "$0")/.."

case "${1:-all}" in
  --test)  run_test ;;
  --build) run_build ;;
  --lint)  run_lint ;;
  *)
    run_lint
    run_test
    run_build
    ;;
esac

print_summary
