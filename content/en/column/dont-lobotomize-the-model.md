---
title: "Why AI QA tools make output worse — don't lobotomize the model"
seoTitle: "Why AI QA Tools Make Output Worse — Catch Mistakes, Not Taste"
date: 2026-06-16
categories: ["Essay"]
tags: ["ai", "tools", "LLM"]
subtitle: "A checker should catch mistakes, not enforce taste"
description: "Most QA tools for AI-generated PowerPoint, Excel, and Word enforce style and make the output worse — why a checker should catch objective mistakes, not enforce taste. The thinking behind llm-office-qa."
---

![A magnifying glass beside a laptop](/images/col-qa.jpg)

I kept hitting the same small humiliations with AI-generated files. A text box whose words ran clean off the edge of a slide. A spreadsheet where my own manual edits had been quietly reverted to a version the model made an hour earlier. Borders that survived on three cells out of five. None of it was a matter of taste. It was just wrong, and I wanted something that caught it before I sent the file out.

So I tried the AI-output checkers that already exist. Almost every one did something I never asked for: it enforced taste. Cap the fonts. Limit the words per slide. Stay inside this palette. Six bullets, no more. They weren't catching mistakes — they were imposing a house style and calling it quality.

Here's the problem. The day a better model arrives — one that can pack a dense, genuinely good slide that breaks every one of those rules on purpose — a checker like that punishes it for being better. A rule about taste is a shackle on the next model. It freezes your output at the level of the weaker model the rules were written for.

I wanted the opposite. Remove the obvious mistakes, and get out of the way of everything else. So I gave every check two tests it has to pass before it's allowed in.

First: is it objectively wrong, regardless of style? Text off the canvas is wrong. A `#REF!` error is wrong. A table whose rows don't have the same number of cells is wrong. There's no taste in any of it.

Second: would a more capable model still always avoid it? If a smarter model might break the rule on purpose to do better work, the rule doesn't belong in the tool — not as an error, not even as a warning.

Density, palette, font count, margins, prose quality — all of it fails the second test. So none of it is in there. Those aren't mistakes. They're the ceiling, and raising the ceiling was never the checker's job.

There's one idea underneath all of it. Every defect comes from the same place: the model writes a spec for something it can't actually see — the rendered slide, the real shape of a cell — fills in a guess instead of the truth, and never checks the result. The fix isn't a style rule. It's *read the truth before you write, and verify after.* A smarter model does that better, not worse. That's the whole point: the discipline grows with the model instead of fighting it.

I put it on GitHub, MIT-licensed. If you build things with LLMs, I'd like to know which of my checks you think are secretly about taste — because those are the ones that don't belong.

→ [llm-office-qa on GitHub](https://github.com/seunghoonchoi-phd/llm-office-qa)
