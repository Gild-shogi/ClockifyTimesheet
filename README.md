# Clockify勤務表自動生成ツール

ClockifyのAPIを使用して月次勤務表を自動生成するTypeScriptアプリケーションです。時間エントリを取得し、Excel・CSV・Google Sheets形式の勤務表を作成します。

## 🌟 主な機能

- **Clockify連携**: APIを使用した時間エントリの自動取得
- **複数出力形式**: Excel / CSV / Google Sheets に対応
- **日付跨ぎ対応**: 夜勤など日付をまたぐ勤務の自動分割
- **プロジェクト管理**: プロジェクト別の勤務時間表示
- **時間形式**: h:min形式と小数点形式の両方を表示
- **タイムゾーン対応**: 設定可能なタイムゾーン変換
- **カスタマイズ**: 色、フォント、罫線などの外観設定

## 📋 生成される勤務表の例

```
日付    曜日  プロジェクト     出勤時刻  退勤時刻  労働時間  労働時間(h)
12/01   月    Webアプリ開発   09:00    18:00    9:00     9.00
12/02   火    APIサーバー     09:30    12:00    2:30     2.50
              APIサーバー     13:00    17:30    4:30     4.50
12/03   水    Webアプリ開発   22:00    24:00    2:00     2.00
12/04   木    Webアプリ開発   0:00     02:00    2:00     2.00
合計                                            20:00    20.00
```

## 🚀 クイックスタート

### 1. 環境設定

```bash
# 依存関係のインストール
pnpm install

# 環境変数ファイルのコピー
cp .env.example .env
```

### 2. Clockify設定の取得

#### APIキーの取得
1. [Clockify](https://clockify.me/user/settings)にアクセス
2. 「API」セクションでAPIキーを生成

#### ワークスペースIDの取得
```bash
# 1. APIキーを.envファイルに設定
CLOCKIFY_API_KEY=your_api_key_here

# 2. ワークスペース一覧を表示
pnpm list-workspaces
```

#### ユーザーIDの取得
```bash
# 現在のユーザー情報を表示
pnpm get-user-info

# または、メールアドレスで検索
pnpm get-user-info your.email@example.com
```

### 3. 環境変数の設定

`.env`ファイルを編集（APIキーなどの機密情報のみ）：

```env
# Clockify API設定
CLOCKIFY_API_KEY=your_api_key_here
CLOCKIFY_WORKSPACE_ID=your_workspace_id_here
CLOCKIFY_USER_ID=your_user_id_here
```

### 4. 勤務表の生成

```bash
# 当月の勤務表を生成
pnpm start

# または
pnpm generate
```

## 🎨 カスタマイズオプション

タイムゾーンや出力形式、Excelの外観は `clockify.config.ts` で設定します。
TypeScriptファイルなのでコメントで説明を書けて、IDEの補完も効きます。

```typescript
// clockify.config.ts
import { AppConfig } from './src/types';

const config: AppConfig = {
  // 出力形式: 'excel' | 'csv' | 'googleSheets'
  outputFormat: 'excel',

  // タイムゾーン設定
  timezone: 'Asia/Tokyo',

  excel: {
    // ヘッダー背景色（16進数、#なし）
    headerColor: '4472C4',

    // 交互行の背景色
    alternateRowColor: 'F2F2F2',

    // 罫線スタイル: 'thin' | 'medium' | 'thick'
    borderStyle: 'thin',

    // フォント設定
    fontSize: 11,
    fontName: 'Meiryo UI',

    // 作業内容（Description）列を表示するか
    showDescription: false,
  },
};

export default config;
```

設定を変更したら `pnpm build` で再ビルドしてください。

### Google Sheets出力を使う場合

Google Sheetsに直接出力する場合は、以下の追加設定が必要です。

#### 1. Google Cloud設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」→ **Google Sheets API** を有効化
3. 「IAM & 管理」→「サービスアカウント」→ サービスアカウントを作成
4. 作成したサービスアカウントの「鍵」タブ →「鍵を追加」→「新しい鍵を作成」→ JSON
5. ダウンロードしたJSONファイルを `credentials.json` としてプロジェクトルートに配置

#### 2. スプレッドシートの共有設定

サービスアカウントのメールアドレス（`credentials.json` 内の `client_email`）を、出力先スプレッドシートに**編集者**として共有してください。

#### 3. 設定ファイル

```typescript
// clockify.config.ts
const config: AppConfig = {
  outputFormat: 'googleSheets',

  googleSheets: {
    // スプレッドシートID（URLの /d/ と /edit の間の部分）
    // 例: https://docs.google.com/spreadsheets/d/XXXXX/edit → XXXXXがID
    spreadsheetId: 'your-spreadsheet-id',
    // 認証情報ファイルのパス
    credentialsPath: './credentials.json',
  },

  // ... 他の設定
};
```

## 🛠️ 開発者向け

### プロジェクト構造

```
clockify.config.ts             # 設定ファイル（タイムゾーン、出力形式、外観など）
credentials.json               # Google Sheets認証情報（※gitignore対象）
src/
├── interfaces.ts              # インターフェース定義
├── container.ts               # 依存性注入コンテナ
├── services/                  # ビジネスロジック層
│   ├── configurationService.ts         # 設定管理
│   ├── clockifyTimeTrackingClient.ts   # Clockify API クライアント
│   ├── dataProcessor.ts                # データ処理
│   ├── timesheetTableBuilder.ts        # 共通テーブル生成ロジック
│   ├── excelTimesheetGenerator.ts      # Excel生成
│   ├── csvTimesheetGenerator.ts        # CSV生成
│   ├── googleSheetsTimesheetGenerator.ts # Google Sheets生成
│   └── timesheetService.ts             # 勤務表サービス
├── tools/                     # ユーティリティツール
│   ├── listWorkspaces.ts           # ワークスペース一覧
│   └── getUserInfo.ts              # ユーザー情報取得
├── types.ts                   # 型定義
├── settings.ts                # 設定管理
└── index.ts                   # エントリーポイント
```


### 利用可能なスクリプト

```bash
pnpm start              # 勤務表生成
pnpm generate           # 勤務表生成
pnpm build              # TypeScriptコンパイル
pnpm lint               # コード品質チェック
pnpm format             # コード整形
pnpm list-workspaces    # ワークスペース一覧表示
pnpm get-user-info      # ユーザー情報取得
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. APIキーエラー
```
Error: Clockify API request failed: 401
```
**解決方法**:
- APIキーが正しく設定されているか確認
- [Clockify設定画面](https://clockify.me/user/settings)で新しいAPIキーを生成

#### 2. ワークスペースIDエラー
```
Error: Failed to fetch projects: 403
```
**解決方法**:
- `pnpm list-workspaces`でワークスペースIDを確認
- アクセス権限があるワークスペースIDを使用

#### 3. 時間データなし
```
指定期間のデータが見つかりませんでした。
```
**解決方法**:
- Clockifyで該当月に時間エントリが記録されているか確認
- タイムゾーン設定が正しいか確認

#### 4. 日付跨ぎが正しく処理されない
**解決方法**:
- `TIMEZONE`環境変数が正しく設定されているか確認
- UTC時刻からローカル時刻への変換を確認

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. コミット (`git commit -m 'Add amazing feature'`)
4. プッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesを使用してください。

---

**注意**: このツールはClockifyの公式ツールではありません。Clockify APIを使用した非公式のサードパーティツールです。
