# Googleカレンダー連携アプリ

Next.jsを使用したGoogleカレンダー連携アプリです。Googleアカウントでログインして、カレンダーの予定を表示することができます。

## 機能

- Googleアカウントでのログイン/ログアウト
- カレンダーイベントの取得と表示
- 日本語対応のUI

## セットアップ方法

### 1. Google Cloud Platformでプロジェクトを作成

1. [Google Cloud Platform Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」から以下のAPIを有効化:
   - Google Calendar API
   - People API
4. 「APIとサービス」→「認証情報」からOAuth 2.0クライアントIDを作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのJavaScript生成元: `http://localhost:3000`
   - 承認済みのリダイレクトURI: `http://localhost:3000`
5. 作成したクライアントIDとAPIキーをメモ

### 2. アプリケーションの設定

1. リポジトリをクローン
```bash
git clone <リポジトリURL>
cd google-calendar-app
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数の設定
プロジェクトのルートディレクトリに`.env.local`ファイルを作成し、以下の内容を追加します：
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=あなたのGoogleクライアントID
NEXT_PUBLIC_GOOGLE_API_KEY=あなたのAPIキー
```

4. アプリケーションを起動
```bash
npm run dev
```

5. ブラウザで[http://localhost:3000](http://localhost:3000)にアクセス

## 使用技術

- Next.js
- React
- Google API Client Library
- Google Identity Services

## 注意事項

- このアプリケーションはデモ用であり、本番環境での使用には適切なセキュリティ対策が必要です。
- クライアントIDとAPIキーは公開リポジトリにコミットしないでください。`.env.local`ファイルは`.gitignore`に追加してください。
- 本番環境では、より安全な環境変数の管理方法を検討してください。 # makeme-nicho
