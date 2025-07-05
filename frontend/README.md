# 1ST ENGINEER - Programming Quiz Game

プログラミング学習用のクイズゲームです。選択式問題、記述式問題、コード問題の3つの形式をサポートしています。

## 特徴
- 📚 図書館風のデザイン
- ⏱️ タイマー機能付き問題
- 🔥 コンボシステム
- 💻 リアルタイムコード実行・テスト
- 🎊 アニメーション演出

## 技術スタック
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: AWS Lambda, DynamoDB, API Gateway
- **Infrastructure**: AWS CDK, CloudFront, S3
- **Libraries**: Anime.js, Axios, Canvas Confetti

## 開発環境

### Live Server開発環境
1. VS Code拡張「Live Server」をインストール
2. `src/index.html`または`src/preview.html`を右クリック
3. "Open with Live Server"を選択

### ファイル構成
- `index.html`: 本番用ページ
- `preview.html`: 開発用ページ（デバッグ機能付き）
- `styles.css`: メインスタイル
- `app.js`: アプリケーションロジック
- `config.js`: API設定

### デバッグ機能（preview.html）
- 画面切り替えボタン
- コード問題テスト機能
- モックデータ

## デプロイ
```bash
# インフラデプロイ
./scripts/deploy-infra.sh

# 設定データインポート
./scripts/deploy-config.sh
```

## ライセンス
© Inagaki-GH

## クレジット
Created by Amazon Q Developer