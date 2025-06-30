#!/bin/bash

# フロントエンドデプロイ + キャッシュ無効化スクリプト

set -e

# 設定
S3_BUCKET="quizstack-websitebucket75c24d94-2v9qgloirfkb"
DISTRIBUTION_ID="E3FM8O72NXVEAZ"
FRONTEND_DIR="../frontend/src"

if [ -z "$S3_BUCKET" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "Usage: $0 <s3-bucket-name> <cloudfront-distribution-id>"
    echo "Example: $0 quizstack-websitebucket-abc123 E1234567890ABC"
    exit 1
fi

echo "🚀 Starting frontend deployment..."

# S3にファイルをアップロード
echo "📁 Uploading files to S3..."
aws s3 sync "$FRONTEND_DIR" "s3://$S3_BUCKET" --delete

# CloudFrontキャッシュを無効化
echo "🗑️  Invalidating CloudFront cache..."
node invalidate-cache.js "$DISTRIBUTION_ID"

echo "✅ Frontend deployment completed!"
echo "🌐 Website will be updated in a few minutes."