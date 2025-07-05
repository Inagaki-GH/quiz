#!/bin/bash

# インフラデプロイスクリプト
set -e

REGION=${AWS_REGION:-ap-northeast-1}
STACK_NAME=${STACK_NAME:-QuizStack}

echo "Deploying infrastructure to region: $REGION"

# ap-northeast-1 (メインスタック)
cd ../infra/ap-northeast-1
echo "Installing dependencies..."
npm install

echo "Deploying main stack..."
npx cdk deploy --require-approval never

# us-east-1 (WAFスタック)
cd "../us-east-1"
echo "Installing dependencies for WAF stack..."
npm install

echo "Deploying WAF stack..."
npx cdk deploy --require-approval never

echo "Infrastructure deployment completed!"
echo "Next steps:"
echo "1. Run ./scripts/deploy-config.sh to import game configuration"
echo "2. Run ./scripts/deploy-frontend.sh to deploy frontend"