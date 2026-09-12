# static-pages

CDNだけで動く静的ページ置き場です。

## ページ一覧

| ページ | 内容 |
| --- | --- |
| [index.html](index.html) | トップ（各ページへのリンク集） |
| [games/index.html](games/index.html) | ミニゲームセンター（ブラウザで遊べるゲーム4本） |
| [kids/index.html](kids/index.html) | こどもあそび（1歳ごろから遊べる知育あそび6本） |
| [3d/freethrow.html](3d/freethrow.html) | 3Dフリースロー（Three.js + cannon-es） |
| [css-frameworks/index.html](css-frameworks/index.html) | CSSフレームワーク比較デモ集（10種）の比較表・選び方 |

## ミニゲームセンター

ブラウザだけで遊べるミニゲーム集です。外部ライブラリも通信も使っていないので、
HTMLを保存すればオフラインでもそのまま動きます。ハイスコアは localStorage に保存されます。

| ゲーム | 内容 | 操作 |
| --- | --- | --- |
| [2048](games/2048.html) | 同じ数字を合体させて2048を目指すパズル | 矢印キー／スワイプ |
| [ブロック崩し](games/breakout.html) | アイテムを拾いながらステージを進むアクション | マウス／タッチ／矢印キー |
| [もぐらたたき](games/mogura.html) | 30秒勝負。爆弾を避けて金もぐらを狙う | クリック／タップ |
| [ことわざタイピング](games/typing.html) | 60秒でことわざをローマ字入力。shi/si などの表記ゆれに対応 | キーボード |

## こどもあそび

1歳ごろから遊べる知育あそびです。スコアも勝ち負けも制限時間もなく、画面のどこを触っても
必ず音や光で反応が返ります。ミニゲーム同様、通信も外部ライブラリも使っていません。

| あそび | 内容 |
| --- | --- |
| [しゃぼんだま](kids/bubbles.html) | 浮かぶシャボン玉をタッチするとポンッとはじけ、中の絵が飛び出す |
| [どうぶつタッチ](kids/animals.html) | どうぶつを押すと名前と鳴き声を大きく表示し、音声で読み上げる |
| [にじいろおえかき](kids/doodle.html) | なぞると虹色の線、ちょんと押すとスタンプ。線は1分ほどでふんわり消える |
| [おとあそび](kids/piano.html) | 6色のボタンがペンタトニック音階。どの順で押しても濁らない |
| [つみき](kids/blocks.html) | 触ると積み木が降ってきて積み上がる。少しのズレは自動で揃い、崩れても失敗にならない |
| [どうぶつつかまえ](kids/catch.html) | のはらを歩きまわるどうぶつをタッチで捕まえる。名前を読み上げ、6匹そろうとお祝い |

「つみき」は積み上げた高さに合わせてペンタトニック音階が上がっていき、数段ごとに紙吹雪でお祝いします。
画面の上まで届くと自動で片付くので、遊べなくなることがありません（右上の🧹ボタンの長押しでも片付きます）。

「どうぶつつかまえ」のどうぶつは逃げも隠れもせず、ゆっくり歩きながら少しずつ離れて重ならないようにします。
触れば必ずつかまり、かごが6匹でいっぱいになると紙吹雪でお祝いして、新しいどうぶつが出てきます。

小さな子どもの誤操作を防ぐため、各ページの🏠ボタンは**約1秒の長押し**で戻る仕組みです。
音はすべて Web Audio API で合成しており、音声ファイルは持ちません。

## 3Dフリースロー

Three.js（描画）と cannon-es（物理演算）をCDNから読み込んで動かす3Dデモです。
ミニゲーム集と違ってライブラリをネットワークから取得するため、表示にはネット接続が必要です。

| 項目 | 内容 |
| --- | --- |
| ライブラリ | [Three.js](https://threejs.org/) 0.160.0 / [cannon-es](https://pmndrs.github.io/cannon-es/) 0.20.0（jsDelivr、失敗時は unpkg にフォールバック） |
| 操作 | 上へドラッグでパワー、左右で狙い、離すとシュート。Space長押し→離す でも可 |
| カメラ | 右ドラッグで首振り、ホイールでズーム、1〜4 キーまたは右上のボタンで視点切替 |

コートの寸法はFIBA規格の実寸に合わせてあります（リング高3.05m・内径45.72cm、
バックボード1.80×1.05m、フリースローラインまで4.60m、7号球は半径11.9cm・620g）。

物理まわりの作りは次のとおりです。

- リングは細いトーラスなので、当たり判定は小さな球28個を円周に並べた複合ボディで作っている
- すり抜け防止のため物理の刻み幅は 1/240 秒（1フレームあたり最大12回まで細かく進める）
- バックスピンはリングとの摩擦を通して効く（マグヌス力は cannon-es では計算されない）
- ネットは見た目のみで、ボールはすり抜ける
- 外した／止まった／転がっていった ボールは自動で手元に戻る

スコアは数えません。パワーゲージの白い目盛りは「その角度でリング中心を通る計算上の初速」で、
ボールに太さがあるぶん、角度が低いと目盛りどおりでもリングに当たります。

## CSSフレームワーク比較デモ集

主要なCSSフレームワーク10種を、**まったく同じ題材**（架空SaaS「Aurora Notes」のランディングページ）で
1ページずつ実装したものです。すべてCDN読み込みのみ・ビルド不要で、1ファイルで完結しています。

| フレームワーク | タイプ | デモ |
| --- | --- | --- |
| Bootstrap 5.3.8 | コンポーネント＋ユーティリティ | [bootstrap.html](css-frameworks/bootstrap.html) |
| Tailwind CSS (Play CDN) | ユーティリティファースト | [tailwind.html](css-frameworks/tailwind.html) |
| Bulma 1.0.4 | コンポーネント（JSゼロ） | [bulma.html](css-frameworks/bulma.html) |
| Foundation 6.9.0 | コンポーネント（jQuery必須） | [foundation.html](css-frameworks/foundation.html) |
| UIkit 3.25.21 | 属性駆動コンポーネント | [uikit.html](css-frameworks/uikit.html) |
| Materialize 2.3.3 | マテリアルデザイン特化 | [materialize.html](css-frameworks/materialize.html) |
| Fomantic UI 2.9.4 | コンポーネント（jQuery必須） | [fomantic-ui.html](css-frameworks/fomantic-ui.html) |
| Pico.css 2.1.1 | クラスレス | [pico.html](css-frameworks/pico.html) |
| Spectre.css 0.5.9 | 軽量コンポーネント | [spectre.html](css-frameworks/spectre.html) |
| Open Props 1.7.23 | デザイントークン | [open-props.html](css-frameworks/open-props.html) |

各ページには共通で以下を実装しています。

- ナビゲーション／ヒーロー／機能カード3件／料金プラン3種／FAQ（開閉）／問い合わせフォーム／モーダル
- そのフレームワークならではの機能（例：Bootstrapのカラーモード、Bulmaのスケルトン、UIkitのスクロール演出、Picoのクラスレス、Open Propsのトークン一覧）
- 末尾に「長所・短所・向いているケース・CDNの書き方」のまとめ

比較表と選び方のめやすは [css-frameworks/index.html](css-frameworks/index.html) にまとめてあります。
