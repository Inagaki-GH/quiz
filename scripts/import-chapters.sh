#!/bin/bash

# 章データインポートスクリプト
cd ../backend

echo "Importing chapter data..."

# 環境変数設定
export AWS_REGION=${AWS_REGION:-ap-northeast-1}

# CDKスタックからテーブル名を取得
if [ -z "$CHAPTERS_TABLE" ]; then
  echo "Getting table name from CDK stack..."
  export CHAPTERS_TABLE=$(aws cloudformation describe-stacks --stack-name QuizStack --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==`ChaptersTableName`].OutputValue' --output text 2>/dev/null || echo "QuizStack-ChaptersTable4735C94E-NL1SYVL5XRBR")
fi

echo "Using table: $CHAPTERS_TABLE"

# 使用方法を表示
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage:"
  echo "  $0                    # Import all categories"
  echo "  $0 --category basic   # Import specific category"
  echo "  $0 file.json          # Import specific file"
  exit 0
fi

# インポート実行
node src/data/import-data.js "$@"