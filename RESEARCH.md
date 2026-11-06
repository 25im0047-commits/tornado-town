# 実装方式と参照資料

確認日: 2026-11-06 JST

## 表現の参考

[ユーザー指定動画](https://x.com/0xKense1/status/2116999596299657492/video/1)と[投稿者の記事](https://x.com/0xKense1/status/2116639754598903932)を前の分析で確認した。街の色と形、影、竜巻の帯、浮き上がる建物、足元の砂ぼこり、成長に応じたカメラを参考にした。今回の造形・ゲームコード・UI・効果音は新規制作であり、原作素材やソースは利用していない。

## 描画基盤の比較

| 候補 | 実装方式と依存 | 保守の確認 | ライセンス | 判断 |
| --- | --- | --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | メッシュ・インスタンス描画・ライト・影・カスタムシェーダーを組み合わせられる描画ライブラリー。コアは追加の実行時依存を持たない | 今回、公式リポジトリー・package.json・リリース一覧を閲覧。r187のリリース表示と多数の継続した履歴を確認 | MIT | 採用。小さな独自ルールの試作に必要な構成だけを同梱しやすい |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | ゲーム向け機能を含むエンジン。任意の物理機能などは別途構成する | 今回、公式リポジトリーとリリース一覧を閲覧。継続した履歴と開発用設定を確認 | Apache-2.0 | 有力な候補。今回は単一ファイルの小さな試作としてThree.jsを選択 |
| [Roblox向け竜巻の例](https://github.com/xyxneweraxyx/tornado) | READMEはTweenServiceと数式による吸収軌道を説明。Roblox実行環境が必要 | 前の分析では3コミットの小規模例。現行Studioでの実行は未確認 | 明示的な再利用条件を確認できず | 動作分解の参考に限り、コードは転用しない |

参照先: [Three.js package.json](https://github.com/mrdoob/three.js/blob/dev/package.json)、[Three.js releases](https://github.com/mrdoob/three.js/releases)、[Babylon.js releases](https://github.com/BabylonJS/Babylon.js/releases)。

実際に同梱したものはローカルに存在した同一組のThree.js r180の `three.module.js` と `three.core.js`。新しいリリースへ変更する前に、今回の表現と配布形式を実機で確認する方針とした。ソース中の `REVISION = '180'` と、実行中の描画ライブラリー識別表示を確認している。古いプロジェクトのゲームコードは利用していない。

元ファイルの場所: このChatGPTプロジェクトの `mellow-hole/dist/vendor/`。この参照元は変更していない。既存キャッシュにあるesbuildを一度だけ使って `vendor/three.min.js` にまとめた。その後の通常ビルドにはesbuildやnpm依存のインストールは不要。

## 負荷を抑える考え方

同じ形状の物をInstancedMeshで描画し、動かす物だけ別の表示へ切り替える。粒子と残る跡は固定上限を持つ。竜巻の変形と水面はシェーダーで動かし、得点・成長・時間は独立した状態管理に置く。

参考: [Three.js公式ドキュメント](https://threejs.org/docs/)、[Robloxの粒子の描画負荷に関する公式資料](https://create.roblox.com/docs/effects/particle-emitters)。画面を覆う半透明の重なりも負荷に関係するため、粒子数だけでは軽さを判断しない。


## 2026-11-06 演出と音の公開実装比較

| 参照 | 方式・利用条件・依存 | 確認した保守の範囲と採用判断 |
| --- | --- | --- |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | Canvasで粒子を描くライブラリー。ISC。閲覧したpackage.jsonでは1.9.4。動きを減らす設定の扱いも説明している | 662コミット、テストとPRの表示を確認。最新の更新日は未確定。今回は星・擬音・集中線を同じ描画層に入れるため、小さな独自の上限付き描画を既存のフレーム処理に組み込む |
| [howler.js](https://github.com/goldfire/howler.js) | Web Audioを中心にHTML Audioへも対応する再生基盤。MIT、外部依存なし | 896コミット、testsと変更履歴を確認。最新の更新日は未確定。今回は録音ファイルの管理より生成音が中心なので、既存のWeb Audioを拡張する |
| [Phaserのカメラ効果](https://docs.phaser.io/phaser/concepts/cameras#effects) / [GitHub](https://github.com/phaserjs/phaser) | 時間を持つ揺れ・ズーム等を提供する2Dゲーム基盤。MIT | 公式資料と大規模な履歴・PRを確認。描画基盤はThree.jsのまま、イベントを起点に短く減衰する効果の考え方を利用する |

[canvas-confetti package.json](https://github.com/catdad/canvas-confetti/blob/master/package.json)も参照した。これらのコードは転用せず、追加パッケージも導入していない。
