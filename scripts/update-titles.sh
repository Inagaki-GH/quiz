#!/bin/bash

# 章タイトル更新スクリプト
cd ../backend

echo "Updating chapter titles..."

# 環境変数設定
export AWS_REGION=${AWS_REGION:-ap-northeast-1}

# CDKスタックからテーブル名を取得
if [ -z "$CHAPTERS_TABLE" ]; then
  echo "Getting table name from CDK stack..."
  export CHAPTERS_TABLE=$(aws cloudformation describe-stacks --stack-name QuizStack --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==`ChaptersTableName`].OutputValue' --output text 2>/dev/null || echo "QuizStack-ChaptersTable")
fi

echo "Using table: $CHAPTERS_TABLE"

# タイトル更新実行
npm run update-titles