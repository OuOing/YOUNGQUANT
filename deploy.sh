#!/bin/bash
# YoungQuant 一键部署脚本
set -e

echo "=== YoungQuant 部署脚本 ==="

# 检查环境变量
if [ -z "$JWT_SECRET" ]; then
  echo "⚠️  JWT_SECRET 未设置，生成随机值..."
  export JWT_SECRET=$(openssl rand -hex 32)
  echo "JWT_SECRET=$JWT_SECRET" >> .env
fi

if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "❌ 错误：DEEPSEEK_API_KEY 未设置"
  echo "请在 .env 文件中设置 DEEPSEEK_API_KEY=your_key"
  exit 1
fi

# 构建前端
echo "📦 构建前端..."
cd frontend && npm ci && npm run build && cd ..

# 编译后端
echo "🔨 编译后端..."
go build -o youngquant_server ./server/...

echo "✅ 构建完成！"
echo ""
echo "启动方式："
echo "  直接运行: ./youngquant_server"
echo "  Docker:   docker-compose up -d"
echo ""
echo "访问地址: http://localhost:8080"
