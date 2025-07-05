#!/bin/bash

# DynamoDB設定インポートスクリプト
cd ../backend

echo "Importing game configuration to DynamoDB...

IMPORTANT: Make sure infrastructure is deployed first!
If you get 'ResourceNotFoundException', run: ./deploy-infra.sh"

# 環境変数設定
export AWS_REGION=${AWS_REGION:-ap-northeast-1}

# CDKスタックからテーブル名を取得
if [ -z "$CHAPTERS_TABLE" ]; then
  echo "Getting table name from CDK stack..."
  export CHAPTERS_TABLE=$(aws cloudformation describe-stacks --stack-name QuizStack --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==`ChaptersTableName`].OutputValue' --output text 2>/dev/null || echo "QuizStack-ChaptersTable")
fi

echo "Using table: $CHAPTERS_TABLE"

# 設定インポート実行
npm run import-config