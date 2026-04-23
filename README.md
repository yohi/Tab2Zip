# <img src="icons/icon128.png" width="48" height="48" alt="Tab Exporter Icon" valign="middle"> Tab Exporter (Tab2Zip)
### ブラウザのタブを整理し、まるごと ZIP で持ち出す。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)

---

**Tab Exporter (Tab2Zip)** は、ブラウザで開いている複数のタブからタイトルやコンテンツ（HTML、テキスト、PDF）を自動的に抽出し、構造化された一つの ZIP アーカイブとして一括ダウンロード・保存するための Chrome 拡張機能です。

## 🚀 主な機能

- **一括エクスポート**: コンテキストメニュー（右クリック）から「現在のウィンドウのすべてのタブ」または「選択中のタブ」を ZIP 保存。
- **マルチフォーマット対応**:
    - Web ページを HTML (`.html`) として保存。
    - プレーンテキストや一部の形式をテキスト (`.txt` / `.md` 等) として保存。
    - タブで開いている PDF をそのまま抽出。
- **巨大ファイル対応**: Chrome 拡張機能のメモリ制限を回避するため、2MB を超える ZIP 生成時は自動的にオフスクリーン文書を使用して安全にダウンロード。
- **機密情報の保護**: URL に含まれるアクセストークンやパスワード等の機密パラメータを自動的にマスク（redact）。
- **セキュアな設計**: ローカルデバイス内ですべての処理を完結。PDF 取得時の SSRF（サーバーサイドリクエストフォージェリ）対策も万全。

## 🛠 開発者向けセットアップ

### 推奨環境
- Node.js (v20+)
- npm

### ビルド手順
1. 依存関係のインストール:
   ```bash
   npm install
   ```
2. ビルドの実行:
   ```bash
   npm run build
   ```
   `dist/` ディレクトリに生成物が出力されます。

3. ブラウザへの読み込み:
   - Chrome の `chrome://extensions/` を開く。
   - 「デベロッパー モード」を有効にする。
   - 「パッケージ化されていない拡張機能を読み込む」を選択し、このプロジェクトのルートディレクトリを指定する。

### その他のコマンド
- `npm run watch`: 開発中の自動ビルド
- `npm run lint`: コードの品質チェック（ESLint v9 Flat Config）
- `npm run format`: コードの整形（Prettier）

## ⚖️ ライセンス

[MIT License](LICENSE)
