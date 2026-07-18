# ColorHelper Web

`color-helper-ios` の SwiftUI アプリを、依存関係なしの HTML / CSS / JavaScript で Web 向けに移植した色判定アプリです。画像やカメラ映像はアップロードせず、ブラウザ内だけで処理します。

ColorHelper was built with Codex and GPT-5.6 for the OpenAI Build Week challenge. Codex helped turn the product requirements into a focused implementation plan, port the color model to browser APIs, implement the responsive UI, and create the automated tests. Product decisions—local-only processing, a mobile-first single-screen layout, bounded image decoding, and explicit numerical comparisons—were made deliberately during development.

## Quick start for judges

```bash
npm run dev
```

Open <http://localhost:4173> and try the following:

1. Enter a six-digit HEX color and confirm the normalized HEX, RGB, and HSB values update.
2. Upload an image, sample points A and B, and review the signed RGB deltas, distance, match category, and similarity score.
3. On `localhost` or HTTPS, start the camera to compare its center pixel with the selected color.

Run the automated color parsing and comparison tests with `npm test`. The app has no runtime dependencies, account, backend, or network upload; image and camera processing stays in the browser.

## 起動方法

Node.js と Python 3 が利用できる環境で、次を実行します。

```bash
cd color-helper-web
npm run dev
```

ブラウザで <http://localhost:4173> を開きます。テストは `npm test` で実行できます。

## iPhoneでカメラを使う

iPhone Safariでカメラを使うには、MacとiPhoneを同じWi-Fiへ接続し、HTTPSで開く必要があります。

初回のみ、Macの現在のIPアドレス用に証明書を生成します。

```bash
cd color-helper-web
npm run cert -- <MacのIPアドレス>
npm run dev:https
```

iPhone Safariで次を開き、認証局証明書をダウンロードします。証明書配布用URLだけはHTTPです。

```text
http://<MacのIPアドレス>:4175/color-helper-ca.crt
```

続いてiPhoneで次を設定します。

1. 「設定」→「一般」→「VPNとデバイス管理」から `ColorHelper Local CA` をインストールする。
2. 「設定」→「一般」→「情報」→「証明書信頼設定」で `ColorHelper Local CA` の完全な信頼を有効にする。
3. Safariで `https://<MacのIPアドレス>:4174` を開き、「開始」を押してカメラアクセスを許可する。

MacのIPアドレスが変わった場合は、新しいIPを指定して `npm run cert -- <新しいIP>` を再実行してください。生成される `certificates/` には秘密鍵が含まれるため、共有しないでください。

### iPhoneのホーム画面に追加する

1. Safariで `https://<MacのIPアドレス>:4174` を開く。
2. Safariの共有ボタンを押す。
3. 「ホーム画面に追加」→「追加」を押す。
4. ホーム画面の `ColorHelper` アイコンから起動する。

ホーム画面から起動した場合も、最初にカメラアクセスの許可が必要になる場合があります。Macで `npm run dev:https` が動作している間だけ利用できます。

## 使い方

- 「色を選ぶ」または HEX 入力で選択色を変更します。有効な HEX は `#RRGGBB` に正規化されます。
- HEX / RGB / HSB を確認し、「HEX をコピー」でクリップボードへコピーできます。
- 最近使った色は端末の `localStorage` に最大10件保存されます。
- 「画像を選ぶ」で画像を読み込み、画像上をタップして点 A / 点 B の色を取得します。両方を取得すると差分を比較できます。
- 「カメラ」の開始を押すと、映像中央の色を継続取得して選択色と比較します。カメラは `localhost` または HTTPS 上で利用してください。

## iOS 版から移植した仕様

- 初期色は `#3366FF`
- HEX 入力は先頭の `#` あり・なしを受け付け、6桁の大文字表記に正規化
- RGB から HSB を算出し、整数に丸めて表示
- RGB 各成分の差分と、RGB 空間上のユークリッド距離を表示
- 距離が18未満なら「とても近い」、55未満なら「近い」、それ以上なら「異なる」
- カメラ映像の中央ピクセルを採色し、停止後も最後の比較結果を保持
- 最近使った色は重複を除き、再選択した色を先頭へ移動
- スマホ優先の一画面構成、ライト / ダーク表示対応

## Web 版で追加・置換した仕様

- iOS のネイティブカラーピッカーを HTML のカラーピッカーに置換
- `AVFoundation` を `getUserMedia` と Canvas に置換
- 依頼内容に合わせ、画像読み込み、タップ位置の採色、画像上の2点比較を追加
- 色の違いを色見本だけに依存せず、HEX / RGB / HSB、符号付きRGB差分、距離、カテゴリ、一致率で表示
- 一致率は RGB 空間の最大距離を基準に `100 × (1 - 距離 / 最大距離)` として追加
- iOS 版は日本語 / 英語のローカライズを持ちますが、この Web 版の初期実装は日本語 UI に統一

## iOS 版からの推定仕様

- 画像採色は iOS 版のカメラ中央1ピクセル採色と同じ考え方で、タップ位置の1ピクセルを取得します。
- Canvas へ巨大画像を描画する負荷を抑えるため、解析画像は最大 `1000 × 700` 相当に縮小します。
- ブラウザのカメラでは背面カメラを優先しますが、端末・ブラウザにより別のカメラが選ばれる場合があります。

## 確認手順

1. 初期表示で `#3366FF`、`51, 102, 255`、`225°, 80%, 100%` が表示されることを確認する。
2. 有効・無効な HEX を入力し、無効入力時に最後の有効色が維持されることを確認する。
3. 画像を読み込み、点 A と点 B を採色して比較結果が表示されることを確認する。
4. `localhost` でカメラを開始し、中央色の比較と「カメラの色を使う」を確認する。
5. 画面幅を狭め、スマートフォン向けの一列表示になることを確認する。
