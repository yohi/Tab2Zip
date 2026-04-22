# Tab Exporter (Tab2Zip) Specification

## 1. Overview
ブラウザで開いているタブのタイトルとコンテンツ（HTML、テキスト、PDF）を一括で抽出し、構造化された一つの ZIP アーカイブとしてダウンロード・保存する Chrome Manifest V3 拡張機能です。

## 2. Core Features
- **コンテキストメニューからのエクスポート**:
    - **Download Highlighted Tabs as ZIP**: 現在選択されているタブのみを対象。
    - **Download All Tabs as ZIP**: 現在のウィンドウ内のすべてのタブを対象。
- **コンテンツ抽出**:
    - **HTML**: `document.documentElement.outerHTML` をキャプチャ。
    - **Text/Markdown**: プレーンテキストや一部のテキスト形式は `.txt` または元の拡張子で保存。
    - **PDF**: タブで開かれている PDF を `fetch` により Blob として取得し保存。
- **巨大ファイルのダウンロード支援**:
    - **2MB 未満**: Data URI を使用した直接ダウンロード。
    - **2MB 以上**: Offscreen Document を利用して Blob URL を生成し、メモリ制限を回避。
- **機密情報の保護**:
    - エクスポートされるファイル名やメタデータから、特定の機密パラメータを排除・マスク。

## 3. Technical Stack
- **Framework**: Chrome Manifest V3 API
- **Language**: TypeScript
- **Bundler**: esbuild
- **Dependencies**:
    - `jszip`: ZIP アーカイブの生成。
- **Linting/Formatting**: ESLint (v9 Flat Config), Prettier

## 4. Architecture
### Background Service Worker (`src/background.ts`)
- コンテキストメニューの管理とイベントハンドリング。
- `chrome.scripting` を使用したタブコンテンツの抽出。
- `JSZip` を用いたメモリ上でのアーカイブ構築。
- ダウンロードフローの制御（Data URI vs. Offscreen Blob URL）。

### Offscreen Document (`offscreen.html`/`src/offscreen.ts`)
- 巨大な ZIP データの Blob URL 生成。
- Service Worker からのメッセージを受け取り、URL の作成と破棄を行う。

## 5. Security & Privacy Considerations
### SSRF (Server-Side Request Forgery) 対策
PDF などのリソースを `fetch` する際、以下の制限を設けています。
- **プロトコル制限**: `http:` および `https:` のみ許可。
- **プライベートネットワークの遮断**: `localhost`、RFC1918、リンクローカル、ループバックアドレス等へのアクセスを拒否。

### ローカル処理の徹底
タブの内容はすべてユーザーのブラウザ内で処理され、外部サーバーへ送信されることはありません。

### スキーマ制限
以下のブラウザ内部スキーマや特殊な URL はエクスポート対象外とします。
- `chrome://`, `file://`, `edge://`, `about:`, `brave://`, `view-source:`, `moz-extension://`

## 6. Data Redaction Policy (機密情報のマスク)
エクスポート処理において、URL やファイル名の生成時に以下のパラメータが含まれる場合はマスクされます。
- **既定のマスク対象**: `token`, `key`, `access_token`, `auth`, `password`, `secret`
- **処理内容**: 値を `<redacted>` に置換。

## 7. Error Handling & Policies
- **ダウンロード失敗**: `chrome.downloads.download` のエラーをキャッチし、コンソールへログ出力。
- **タイムアウト**: PDF の取得時に 10 秒のタイムアウトを設定。
- **重複ファイル名**: 同名のタブが存在する場合、`(1)`, `(2)` のような接尾辞を付与して衝突を回避。

## 8. Testing Strategy
- **機能検証**: 2 種類のエクスポート範囲（Highlighted/All）が正しく ZIP 化されるか確認。
- **機密情報マスク検証**: テスト用 URL に含まれるトークンが `<redacted>` に置換されているか確認。
- **巨大ファイル検証**: 多数のタブ（合計 2MB 超）を開いた状態で、オフスクリーン文書経由のダウンロードが成功するか確認。
- **静的解析**: `npm run lint` によるコード品質の維持。
