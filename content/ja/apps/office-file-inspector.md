---
title: "Office File Inspector: AIが作ったPPT・Excel・Wordの欠陥チェッカー"
seoTitle: "Office File Inspector: AI生成PPT・Excel・Wordの欠陥を調べるオープンソース"
date: 2026-06-16
categories: ["ツール"]
tags: ["オープンソース", "AI", "Office File Inspector"]
subtitle: "明らかなミスだけを拾い、成果物の上限は下げない"
description: "Office File Inspectorは、AIが作ったPowerPoint・Excel・Wordから、スライド外にはみ出た文字、#REF!エラー、残ったMarkdownなどの明らかな欠陥だけを拾うオープンソースの検査ツールです。"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Office File Inspectorのアイコン">
  <div class="appcard__body">
    <span class="appcard__free">オープンソース（MIT）</span>
    <h3>Office File Inspector</h3>
    <p>AIが作ったPowerPoint・Excel・Wordの明らかな欠陥だけを確認し、スタイルの選択はあえて変えない検査ツール。</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHubで見る →</a>
  </div>
</div>

LLMにスライド、スプレッドシート、文書ファイルを作らせると、似たミスが何度も出ます。スライドの外にはみ出した文字、Excelの`#REF!`エラー、数値に見えるのに文字列として保存されたセル、Word文書にそのまま残ったMarkdownなどです。

Office File Inspectorは、そうした明らかな欠陥だけを拾います。フォントの数、箇条書きの数、色、情報密度のように、目的や文脈で正解が変わるものは検査基準にしません。検査ツールは成果物の下限を上げる装置であるべきです。上限を下げる装置になってはいけません。

最初に使うファイルは`check_office_file.py`です。PowerPoint、Excel、Wordをこのコマンドひとつで検査できます。

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

ファイル形式ごとに直接検査したい場合は、`tools/check_powerpoint.py`、`tools/check_excel.py`、`tools/check_word.py`を使えます。エージェントがOfficeファイルを作った直後に自動で検査させたい場合は、`integrations/auto_check_office_files.py`をフックとして接続します。

既存リンクを保つために、GitHubリポジトリのURLは`llm-office-qa`のまま残しています。ただし公開名、README、実行ファイルの構成はOffice File Inspectorを基準に整理しました。

[GitHubで見る →](https://github.com/seunghoonchoi-phd/llm-office-qa)

なぜこう作ったのか、検査ツールがレビュー中に品質の上限を下げてはいけない理由 → [レビュー中に品質の上限を下げない](/ja/column/dont-lobotomize-the-model/)
