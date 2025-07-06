#!/bin/bash

# WAF付きデプロイスクリプト
set -e

echo "🚀 Deploying Quiz App with WAF..."

# WAFスタックをus-east-1にデプロイ
echo "📡 Deploying WAF stack to us-east-1..."
cd infra/us-east-1
cdk deploy CloudFrontWAFStack --require-approval never

# メインスタックをap-northeast-1にデプロイ
echo "🏗️ Deploying main stack to ap-northeast-1..."
cd ../ap-northeast-1
cdk deploy QuizStack --require-approval never

echo "✅ Deployment completed!"
echo "WAF is now associated with CloudFront distribution."