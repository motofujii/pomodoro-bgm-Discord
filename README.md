# 🍅 Discord ポモドーロ BGM Bot

ボイスチャンネルで **ポモドーロタイマー付きYouTube BGM** をボタン操作で再生できるDiscord Botです。

---

## ✨ 機能

- 🎧 5種類のポモドーロBGMをボタンで選択・再生
- 🔄 YouTube動画にポモドーロタイマーが含まれているため、Bot側でのタイマー制御不要
- 🎛 テキストチャンネルにボタンUIを表示（コマンド入力不要）
- 👤 誰もいなくなったら自動退出
- 🔁 動画終了時の自動ループ・エラー時の自動リトライ
- ⏹ 停止・再生状況確認もボタンで操作

### 🎵 収録BGM

| ボタン | BGM | 内容 |
|--------|------|------|
| 🌊 波 | [波の音](https://www.youtube.com/watch?v=B3UM8TizqYQ) | 波の音で集中（25分+5分休憩） |
| 🌳 森 | [森の清流](https://www.youtube.com/watch?v=-11GWcyj_Is) | 森の清流で集中（25分+5分休憩） |
| 🔥 焚き火 | [焚き火](https://www.youtube.com/watch?v=iq9jqLtBx9c) | 焚き火の音で集中（25分+5分休憩） |
| ☕ あつ森 | [あつ森カフェ](https://www.youtube.com/watch?v=v3oPr2InUfc) | マスターのいる喫茶店で集中 |
| 🌧 雨 | [雨の音](https://www.youtube.com/watch?v=6NCCDrn0i9g) | 雨の音で集中（25分+5分休憩） |

---

## 🚀 導入手順（約15分）

### Step 1: Discord Botを作成する

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリック → 名前を入力（例: `ポモドーロBGM`）
3. 左メニューの **Bot** を開く
4. 「Reset Token」で **Botトークン** をコピー（⚠️ 他人に見せないこと）
5. 同ページで以下をONにする:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`
6. 左メニューの **General Information** で **Application ID** をコピー

### Step 2: Botをサーバーに招待する

以下のURLの `YOUR_CLIENT_ID` を自分のApplication IDに置き換えてブラウザで開く:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot
```

必要な権限（自動で設定済み）:
- チャンネルを見る
- 接続
- 発言
- メッセージを送信
- 埋め込みリンク

### Step 3: IDをメモする

Discordの設定 → 詳細設定 → **開発者モード** をONにする。

- **サーバーID**: サーバーアイコンを右クリック →「サーバーIDをコピー」
- **テキストチャンネルID**: BGM操作UIを表示したいチャンネルを右クリック →「チャンネルIDをコピー」

### Step 4: デプロイする

#### 方法A: Railway（おすすめ・無料枠あり）

1. このリポジトリをGitHubにアップロード
2. [Railway](https://railway.app/) にログイン
3. 「New Project」→「Deploy from GitHub repo」
4. このリポジトリを選択
5. **Variables** タブで以下を設定:

| 変数名 | 値 |
|--------|-----|
| `DISCORD_TOKEN` | Step 1でコピーしたBotトークン |
| `CLIENT_ID` | Step 1でコピーしたApplication ID |
| `GUILD_ID` | Step 3でコピーしたサーバーID |
| `TEXT_CHANNEL_ID` | Step 3でコピーしたテキストチャンネルID |

6. 「Deploy」をクリック → 完了！

#### 方法B: ローカルで実行

```bash
# 依存パッケージをインストール
npm install

# .envファイルを作成（.env.exampleをコピー）
cp .env.example .env

# .envを編集して各IDを入力
# （お好みのエディタで開いてください）

# 起動
npm start
```

### Step 5: 動作確認

1. テキストチャンネルにBGM選択ボタンが表示されたら成功
2. ボイスチャンネルに入る
3. ボタンを押す → BGM再生開始

---

## 🎮 使い方

1. ボイスチャンネルに入る
2. テキストチャンネルの BGM選択ボタン を押す
3. 選んだBGMがVCで再生される
4. 停止したいときは ⏹ ボタン

**ポイント**: ポモドーロタイマーはYouTube動画に含まれているので、Botは音楽を流すだけ。25分集中+5分休憩のリズムは動画が自動で作ってくれます。

---

## ⚠️ 注意事項

- YouTube動画の再生は稀に停止することがあります → もう一度ボタンを押してください
- 身内利用を前提としています（YouTube規約は自己責任）
- Node.js 18以上が必要です

---

## 📁 ファイル構成

```
pomodoro-bgm-bot/
├── index.js          # Bot本体
├── package.json      # 依存パッケージ
├── .env.example      # 環境変数テンプレート
├── railway.json      # Railwayデプロイ設定
└── README.md         # このファイル
```

---

## 📄 ライセンス

MIT
