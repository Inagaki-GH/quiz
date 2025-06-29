# Programming Quiz Game

AWS Lambda + API Gateway + DynamoDB + S3/CloudFront構成のプログラミング学習クイズゲーム

## 構成
- Backend: AWS Lambda (TypeScript)
- Frontend: Vanilla JS + HTML/CSS
- Database: DynamoDB
- Infrastructure: AWS CDK

## セットアップ
```bash
# Backend
cd backend && npm install && npm run build

# Frontend
cd frontend && npm install

# Infrastructure
cd infra && npm install && cdk deploy
```

## API エンドポイント
- GET /chapter/{chapterId} - 章のミッション取得
- POST /answer - 回答送信・採点