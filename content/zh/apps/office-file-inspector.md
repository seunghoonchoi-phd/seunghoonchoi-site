---
title: "Office File Inspector：检查 AI 生成的 PPT、Excel、Word 缺陷"
seoTitle: "Office File Inspector：AI 生成 PPT、Excel、Word 缺陷检查开源工具"
date: 2026-06-16
categories: ["工具"]
tags: ["开源", "AI", "Office File Inspector"]
subtitle: "抓住明显错误，但不降低成果的上限"
description: "Office File Inspector 是一个开源检查器，用来发现 AI 生成的 PowerPoint、Excel、Word 文件中的明显缺陷，例如文字跑出幻灯片、#REF! 错误、残留 Markdown。"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Office File Inspector 图标">
  <div class="appcard__body">
    <span class="appcard__free">开源（MIT）</span>
    <h3>Office File Inspector</h3>
    <p>只检查 AI 生成的 PowerPoint、Excel、Word 中的明显缺陷，刻意不干预风格选择。</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">在 GitHub 查看 →</a>
  </div>
</div>

把幻灯片、电子表格、文档交给 LLM 做时，总会出现相似的错误。文字跑到幻灯片外，Excel 里留下 `#REF!` 错误，看起来是数字的单元格却被保存成文本，Word 文档里还残留 Markdown。

Office File Inspector 只抓这些明显缺陷。字体数量、项目符号数量、配色、信息密度这类选择会随着目的和语境改变，所以不会被写成检查规则。检查工具应该提高成果的下限，而不是压低成果的上限。

最先使用的文件是 `check_office_file.py`。PowerPoint、Excel、Word 都可以用同一个命令检查。

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

如果想按文件类型直接检查，可以使用 `tools/check_powerpoint.py`、`tools/check_excel.py`、`tools/check_word.py`。如果想让 agent 在生成 Office 文件后立刻自动检查，可以把 `integrations/auto_check_office_files.py` 接成 hook。

为了保持旧链接可用，GitHub 仓库地址仍然保留为 `llm-office-qa`。但公开名称、README 和执行文件结构已经按 Office File Inspector 重新整理。

[在 GitHub 查看 →](https://github.com/seunghoonchoi-phd/llm-office-qa)

为什么这样设计，以及为什么 QA 层不该在审核时降低结果的质量上限 → [审核时不要降低质量上限](/zh/column/dont-lobotomize-the-model/)
