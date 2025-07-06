#!/bin/bash

# データベース内容確認スクリプト
cd ../backend

echo "Checking current database content..."

# 環境変数設定
export AWS_REGION=${AWS_REGION:-ap-northeast-1}

# CDKスタックからテーブル名を取得
if [ -z "$CHAPTERS_TABLE" ]; then
  echo "Getting table name from CDK stack..."
  export CHAPTERS_TABLE=$(aws cloudformation describe-stacks --stack-name QuizStack --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==`ChaptersTableName`].OutputValue' --output text 2>/dev/null || echo "QuizStack-ChaptersTable4735C94E-NL1SYVL5XRBR")
fi

echo "Using table: $CHAPTERS_TABLE"

# データベース内容確認
npm run check-chapters