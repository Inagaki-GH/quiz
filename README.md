# Programming Quiz Game

AWS Lambda + API Gateway + DynamoDB + S3/CloudFront構成のプログラミング学習クイズゲーム

## 構成
- Backend: AWS Lambda (Node.js)
- Frontend: Vanilla JS + HTML/CSS
- Database: DynamoDB
- Infrastructure: AWS CDK (Multi-region)

## 初回セットアップ
```bash
# AWS CLI設定
aws configure

# CDK初期化（初回のみ）
npm install -g aws-cdk
```

## セットアップ
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# Infrastructure
cd infra && npm install
```

## デプロイ手順
```bash
# 既存スタックがある場合は先にap-northeast-1をデプロイ
cd infra
npm run deploy-main

# 次にus-east-1のWAFスタックをデプロイ
npm run deploy-waf

# 最後にap-northeast-1を再デプロイしてWAFを関連付け
npm run deploy-main
```

## API エンドポイント
- GET /chapter/{chapterId} - 章のミッション取得
- POST /answer - 回答送信・採点

## CDK生成リソース
### ap-northeast-1
- **Lambda Function** - QuizFunction (Node.js 18.x)
- **API Gateway** - QuizApi (REST API + CORS設定)
- **DynamoDB Tables**
  - ChaptersTable (PK: chapterId)
  - ScoresTable (PK: userId, SK: timestamp)
- **S3 Bucket** - WebsiteBucket (静的ホスティング)
- **CloudFront Distribution** - フロントエンド配信（日本のみ）
- **WAF** - API Gateway保護（レート制限・攻撃対策）

### us-east-1
- **WAF** - CloudFront保護（レート制限・攻撃対策）