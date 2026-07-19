---
title: "Office File Inspector: QA for AI-Made PowerPoint, Excel, and Word"
seoTitle: "Office File Inspector: Open-Source QA for AI-Generated PPT, Excel, and Word"
date: 2026-06-16
categories: ["Tools"]
tags: ["open-source", "ai", "Office File Inspector"]
subtitle: "Catch obvious defects without lowering the ceiling"
description: "Office File Inspector is an open-source checker for obvious defects in AI-made PowerPoint, Excel, and Word files, such as off-slide text, #REF! errors, and leftover Markdown."
image: /images/llm-office-qa-card.svg
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Office File Inspector icon">
  <div class="appcard__body">
    <span class="appcard__free">Open source (MIT)</span>
    <h3>Office File Inspector</h3>
    <p>A checker that verifies obvious defects in AI-made PowerPoint, Excel, and Word files while deliberately not changing style choices.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">View on GitHub →</a>
  </div>
</div>

When you ask an LLM to make slides, spreadsheets, or documents, the same mistakes keep appearing: text that runs off a slide, `#REF!` errors in Excel, cells that look numeric but are stored as text, or Markdown left inside a Word document.

Office File Inspector catches only those obvious defects. It does not turn font count, bullet count, color, or information density into rules, because those choices depend on the goal and context of the artifact. A QA tool should raise the floor of the output. It should not lower the ceiling.

The main entry point is `check_office_file.py`. You can check PowerPoint, Excel, and Word files with the same command.

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

If you want file-specific checks, use `tools/check_powerpoint.py`, `tools/check_excel.py`, or `tools/check_word.py`. If you want an agent to check Office files immediately after creating them, connect `integrations/auto_check_office_files.py` as a hook.

The GitHub repository URL stays as `llm-office-qa` so old links keep working. The public name, README, and command structure are now organized around Office File Inspector.

[View on GitHub →](https://github.com/seunghoonchoi-phd/llm-office-qa)

Why I made it this way, and why a QA layer should not lower the quality ceiling during review → [Do not lower the quality ceiling during review](/column/dont-lobotomize-the-model/)
