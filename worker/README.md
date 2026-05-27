# Cloudflare Workers デプロイ手順

## 1. KV Namespace の作成

Cloudflare Dashboard にログインして:

1. **Workers & Pages** → **KV** を開く
2. **Create a namespace** をクリック
3. 名前: `HONNOJI_KV` で作成
4. 発行された **ID** をコピーしておく

## 2. wrangler.toml を更新

`worker/wrangler.toml` の以下の行を編集:

```toml
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

↓ コピーした ID に置き換える:

```toml
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 3. Wrangler CLI でデプロイ

```bash
cd worker
npx wrangler deploy
```

初回は Cloudflare アカウントへのログインが求められます。

デプロイ後: `https://kpi-dashboard.kpi-gmotech.workers.dev` でアクセス可能になります。

## 4. (オプション) API キー認証を設定

認証が必要な場合:

1. Cloudflare Dashboard → **Workers & Pages** → `kpi-dashboard` → **Settings** → **Variables**
2. 変数名 `API_KEY`、値に任意の文字列を設定 → **Save**
3. フロントエンドの `.env.local` に追記:
   ```
   VITE_API_KEY=設定したキー文字列
   ```

## エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | /api/deals | 案件データ取得 |
| POST | /api/deals | 案件データ保存 |
| GET | /api/tasks | タスク取得 |
| POST | /api/tasks | タスク保存 |
| GET | /api/members | メンバー取得 |
| POST | /api/members | メンバー保存 |
| GET | /api/requests | 要望取得 |
| POST | /api/requests | 要望保存 |
| GET | /api/notifs | 通知ログ取得 |
| POST | /api/notifs | 通知ログ保存 |
| GET | /api/monthend | 月末チェック取得 |
| POST | /api/monthend | 月末チェック保存 |
| GET | /api/health | ヘルスチェック |
