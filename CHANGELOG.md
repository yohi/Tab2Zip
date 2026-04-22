# Changelog

## [1.1.0](https://github.com/yohi/Tab2Zip/compare/tab-exporter-extension-v1.0.0...tab-exporter-extension-v1.1.0) (2026-04-22)


### Features

* add extension icons ([ff0fd25](https://github.com/yohi/Tab2Zip/commit/ff0fd255b15ad21d85740b2c38db0740eab8c167))
* implement masking and large file support with secure build pipeline ([3ef7e3c](https://github.com/yohi/Tab2Zip/commit/3ef7e3c9d58859adb826b3fd53336ec0f84cad62))
* implement ZIP archiving with automatic format detection and duplicate handling ([b250fcd](https://github.com/yohi/Tab2Zip/commit/b250fcdd3240c4aef6f67802597b43598b1dc0c1))
* setup release-please and zip creation workflow ([8ae6456](https://github.com/yohi/Tab2Zip/commit/8ae6456e927ecc5789677f9248ffd1824a58de2b))
* setup release-please and zip creation workflow ([9902122](https://github.com/yohi/Tab2Zip/commit/9902122a9246de5fdef78880759bdb6fce524ea3))
* use sized icons for better display ([5a86571](https://github.com/yohi/Tab2Zip/commit/5a86571148624dc738277a5f6c8f426d64f02da9))


### Bug Fixes

* Blob URLのメモリリーク修正とBase64変換の最適化 ([cd8a70e](https://github.com/yohi/Tab2Zip/commit/cd8a70e34065441ce17a299c5598b00d39dadb37))
* Blob URLの破棄タイミングの改善と型定義の修正 ([2ab44c4](https://github.com/yohi/Tab2Zip/commit/2ab44c4491f58424ff5420c3bff8b3758a1c1085))
* CodacyのSSRF、HTML受け渡し、冗長な条件分岐への対応 ([7e8f326](https://github.com/yohi/Tab2Zip/commit/7e8f326716201ff13e04878ebabc4edcf8e6deec))
* Codacyの変数名ルールとSSRF警告への徹底対応 ([c44b2d6](https://github.com/yohi/Tab2Zip/commit/c44b2d6172b8a921be60c38c3e6c6d57466e9baf))
* Codacyの複雑度警告とany型の使用を修正 ([ac20ddf](https://github.com/yohi/Tab2Zip/commit/ac20ddfa422358e8384176736b10bcda440a1280))
* Codacyの静的解析警告(6件)への最終対応 ([7733ca6](https://github.com/yohi/Tab2Zip/commit/7733ca6b6f804e1b5f62faf7f66beb8eb25b6231))
* Codacyの静的解析警告へのさらなる対応 ([36c7d3e](https://github.com/yohi/Tab2Zip/commit/36c7d3e5b0c7134f782ae7d20b172142dc8eccd6))
* PDFの取得処理に10秒のタイムアウトを追加 ([41cb877](https://github.com/yohi/Tab2Zip/commit/41cb87790a527b644848664af630eb879269736c))
* SSRF対策の強化、Offscreen Document作成の競合回避、およびダウンロード失敗時のクリーンアップ漏れの修正 ([a5271c9](https://github.com/yohi/Tab2Zip/commit/a5271c92b521d35c6f33a4233adf41dbf511f58a))
* 静的解析ツール(Codacy)の指摘事項への対応 ([c34b366](https://github.com/yohi/Tab2Zip/commit/c34b366fe8128b957d7a51e19c4add3f59ee4adc))


### Reverts

* remove github workflows exclusion from .codacy.yml ([e4072cf](https://github.com/yohi/Tab2Zip/commit/e4072cfb83d6acb7b5bd552f0d4fea65cfb2130f))
