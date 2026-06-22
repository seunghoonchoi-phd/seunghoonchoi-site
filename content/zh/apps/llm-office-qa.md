---
title: "检查 AI 生成的 PPT·Excel·Word 缺陷的开源工具 — llm-office-qa"
seoTitle: "AI 生成 PPT·Excel·Word 查错开源 linter"
date: 2026-06-16
categories: ["Tools"]
tags: ["open-source", "ai"]
subtitle: "不封住模型的上限，只揪出明显的错误"
description: "只揪出 AI 生成 PPT、Excel、Word 客观缺陷的开源 Python linter：文字溢出、#REF! 错误、残留 markdown。确定性、MIT 许可、Claude Code 钩子。"
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="llm-office-qa 图标">
  <div class="appcard__body">
    <span class="appcard__free">开源（MIT）</span>
    <h3>llm-office-qa</h3>
    <p>只揪出 AI 生成的 PowerPoint、Excel、Word 中明显错误、却有意不去碰风格的确定性 linter。</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">在 GitHub 上查看 →</a>
  </div>
</div>

LLM 在生成幻灯片或电子表格时，会犯一类特定的错误：文字溢出到幻灯片之外、`#REF!` 错误、被存成文本的数字、漏进 Word 的 markdown。**llm-office-qa** 只揪出这些——别的一概不管。

- **只管客观缺陷** —— 画布外的文字、损坏的公式、列数对不齐的表格、被拉伸变形的图像、只剩一部分的边框、残留的 markdown
- **绝不强加品味** —— 信息密度、配色、字体选择、文笔质量都是模型的活儿，不是 linter 该插手的事
- **确定性** —— 它只是读取文件并测量，不联网，也不调用模型
- **MIT 许可**，并以 [Claude Code](https://docs.claude.com/en/docs/claude-code) 钩子的形式运行 —— 在交付前把缺陷反馈给模型，让它自己修好

[在 GitHub 上查看 →](https://github.com/seunghoonchoi-phd/llm-office-qa)

它背后的思考 —— 为什么 QA 层绝不该成为更聪明的模型的枷锁 → [别给模型做脑叶切除](/zh/column/dont-lobotomize-the-model/)
