---
title: "AIが作るPowerPoint・Excel・WordのオープンソースQA — llm-office-qa"
seoTitle: "AIのPowerPoint・Excel・Word QA — オープンソースのリンター"
date: 2026-06-16
categories: ["ツール"]
tags: ["オープンソース", "AI"]
subtitle: "モデルの性能を抑えずに、LLMの客観的なミスだけを拾う"
description: "AIが作ったPowerPoint・Excel・Wordの客観的な不具合を拾うオープンソースのPythonリンター。スライドからはみ出た文字、#REF!エラー、消し忘れのMarkdownなどを検出。決定論的で、MITライセンス、Claude Codeのフックとして動きます。"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="llm-office-qa icon">
  <div class="appcard__body">
    <span class="appcard__free">オープンソース (MIT)</span>
    <h3>llm-office-qa</h3>
    <p>PowerPoint・Excel・Wordに残るLLMの客観的なミスを拾う決定論的なリンター。スタイルにはあえて手を出しません。</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHubで見る →</a>
  </div>
</div>

LLMがスライドや表計算を作ると、決まった種類のミスが出ます。文字がスライドからはみ出る、`#REF!`エラーが残る、数値が文字列として保存される、MarkdownがWord文書に紛れ込む——。**llm-office-qa**は、こうしたミスだけを拾います。それ以外には触れません。

- **客観的な不具合だけ** — 画面外にはみ出た文字、壊れた数式、ガタついた表、引き伸ばされた画像、途切れた罫線、消し忘れのMarkdown
- **好みは押しつけない** — 情報の詰め込み具合、配色、フォントの選び方、文章の質はモデルの仕事であって、リンターの仕事ではありません
- **決定論的** — ファイルを読んで測るだけ。ネットワーク通信も、モデル呼び出しもありません
- **MITライセンス**。納品前に不具合をモデルに差し戻して直させる[Claude Code](https://docs.claude.com/en/docs/claude-code)のフックとして動きます

[GitHubで見る →](https://github.com/seunghoonchoi-phd/llm-office-qa)

考え方の背景——QAの層が、より賢いモデルの足かせになってはいけない理由 → [モデルをロボトミーにするな](/ja/column/dont-lobotomize-the-model/)
