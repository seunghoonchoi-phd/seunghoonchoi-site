---
title: "Open-Source QA for AI-Generated PowerPoint, Excel & Word — llm-office-qa"
seoTitle: "AI PowerPoint, Excel & Word QA — Open-Source Linter"
date: 2026-06-16
categories: ["Tools"]
tags: ["open-source", "ai"]
subtitle: "Catch an LLM's objective mistakes — without capping the model"
description: "Open-source Python linter that catches objective defects in AI-generated PowerPoint, Excel & Word — off-slide text, #REF! errors, leftover markdown. Deterministic, MIT-licensed, runs as a Claude Code hook."
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="llm-office-qa icon">
  <div class="appcard__body">
    <span class="appcard__free">Open source (MIT)</span>
    <h3>llm-office-qa</h3>
    <p>Deterministic linters that catch an LLM's objective mistakes in PowerPoint, Excel, and Word — and deliberately leave style alone.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">View on GitHub →</a>
  </div>
</div>

When an LLM builds a deck or a spreadsheet, it makes a particular kind of mistake: text running off the slide, a `#REF!` error, a number stored as text, markdown leaking into a Word document. **llm-office-qa** catches those — and nothing else.

- **Objective defects only** — off-canvas text, broken formulas, ragged tables, stretched images, partial borders, leftover markdown
- **Never enforces taste** — density, palette, font choice, and prose quality are the model's job, not the linter's
- **Deterministic** — it reads the file and measures; no network, no model calls
- **MIT licensed**, and ships as a [Claude Code](https://docs.claude.com/en/docs/claude-code) hook that hands the defect back to the model to fix before delivery

[View on GitHub →](https://github.com/seunghoonchoi-phd/llm-office-qa)

The thinking behind it — why a QA layer should never shackle a smarter model → [Don't lobotomize the model](/column/dont-lobotomize-the-model/)
