# static-pages

CDNだけで動く静的ページ置き場です。

## ページ一覧

| ページ | 内容 |
| --- | --- |
| [index.html](index.html) | 「なんのえかな？クイズ」（いらすとや のランダム画像クイズ） |
| [css-frameworks/index.html](css-frameworks/index.html) | CSSフレームワーク比較デモ集（10種） |

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
