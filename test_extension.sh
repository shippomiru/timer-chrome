#!/bin/bash

echo "准备测试Chrome扩展..."

# 检查文件是否完整
echo "检查文件完整性..."

REQUIRED_FILES=(
  "manifest.json"
  "background.js"
  "content.js"
  "timer.css"
  "popup.html"
  "popup.js"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ 缺少文件: $file"
    MISSING=1
  else
    echo "✅ 文件存在: $file"
  fi
done

# 检查images目录
if [ ! -d "images" ]; then
  echo "❌ 缺少目录: images"
  MISSING=1
else
  echo "✅ 目录存在: images"
  
  # 检查图标文件
  for size in 16 48 128; do
    if [ ! -f "images/icon${size}.png" ]; then
      echo "⚠️ 警告: 缺少图标 images/icon${size}.png"
    else
      echo "✅ 图标存在: images/icon${size}.png"
    fi
  done
fi

# 检查通知音效
if [ ! -f "notification.mp3" ]; then
  echo "⚠️ 警告: 缺少通知音效文件 notification.mp3"
else
  echo "✅ 通知音效存在: notification.mp3"
fi

if [ $MISSING -eq 1 ]; then
  echo "❌ 检测到缺少必要文件，请先补充完整后再测试"
  exit 1
fi

echo "文件检查完成！"
echo ""
echo "测试说明:"
echo "1. 在Chrome浏览器中访问: chrome://extensions/"
echo "2. 开启右上角的'开发者模式'"
echo "3. 点击'加载已解压的扩展程序'按钮"
echo "4. 选择此目录"
echo "5. 在任意网页上使用Alt+T测试计时器"
echo ""
echo "注意: 如果修改了代码，需要在扩展页面点击刷新按钮" 