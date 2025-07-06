#!/bin/bash

# /quiz/パス設定スクリプト
set -e

echo "🔧 Setting up /quiz/ path access..."

# インフラをデプロイ
echo "📡 Deploying infrastructure changes..."
cd ../infra/ap-northeast-1
cdk deploy --require-approval never

# フロントエンドをデプロイ
echo "🚀 Deploying frontend to /quiz/ path..."
cd ../../scripts
./deploy-frontend.sh

echo "✅ Setup completed!"
echo "🌐 Access URL: https://[cloudfront-domain]/quiz/"
echo "🚫 Root access (/) will return 404"