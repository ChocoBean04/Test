#!/bin/bash
# 云端 session 开场时，安装做 Word / PPT / PDF / Excel 要用的套件
# （docx、pptx、pdf、xlsx、question-reveal、holiday-activity-book 等技能会用到）。
# 只在 Claude Code 云端跑；在自己电脑上不会执行。已装好的会直接跳过。
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# 安装过程的输出都导到 stderr，不占用 Claude 的上下文
exec 1>&2

PIP="python3 -m pip install --quiet --disable-pip-version-check --root-user-action=ignore"

# 系统自带的 cryptography 跟这里的 Python 版本不合，会让 pypdf 一 import 就报错，
# 所以另装一份能用的（装在前面，会优先被用到）
if ! python3 -c "import cryptography.exceptions" >/dev/null 2>&1; then
  $PIP --ignore-installed cryptography cffi
fi

# Python 套件
if ! python3 -c "import docx, pptx, openpyxl, pypdf, pdfplumber, PIL, pandas, lxml, defusedxml, markitdown" >/dev/null 2>&1; then
  $PIP python-docx python-pptx openpyxl pypdf pdfplumber pillow pandas lxml defusedxml \
    "markitdown[pptx,docx,xlsx,pdf]"
fi

# Node 套件（做 Word 用 docx，做 PPT 用 pptxgenjs）
for pkg in docx pptxgenjs; do
  if ! npm ls -g "$pkg" >/dev/null 2>&1; then
    npm install -g --silent "$pkg"
  fi
done

# pdftoppm（把 PDF / PPT 转成图片检查排版）；装不了也不影响其他功能
if ! command -v pdftoppm >/dev/null 2>&1; then
  (apt-get install -y -qq poppler-utils >/dev/null 2>&1 \
    || { apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq poppler-utils >/dev/null 2>&1; }) \
    || echo "提示：pdftoppm 没装成功，PDF 转图片的功能会用不了" >&2
fi
