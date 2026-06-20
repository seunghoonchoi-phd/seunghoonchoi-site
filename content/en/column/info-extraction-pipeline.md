---
title: "Turning Conversations into Knowledge — My 3-Stage AI Extraction Prompt System"
seoTitle: "A 3-Stage AI Extraction Prompt System — Turn Chats into Knowledge"
date: 2026-06-20
categories: ["Guide"]
tags: ["ai", "llm", "prompt-engineering", "knowledge-management", "notion"]
subtitle: "Not a tool that extracts more, but one that discards ruthlessly"
description: "A 3-stage AI extraction prompt system that keeps only what's worth saving from your AI conversations. The real point isn't extraction — it's the discard criteria. Includes copy-paste prompts you can drop straight into Notion."
---
![A wall of labeled card-catalog drawers — selection is the system](/images/col-info-extraction.jpg)

The more I talk to AI, the less knowledge I actually keep. It sounds backwards, but the reason is simple: AI generates more than I can verify and organize. Good lines pour out, yet a month later there's almost nothing I can find again.

That's why most attempts at "using AI to organize my notes" fail. Everyone focuses on *extracting more*. Extract more, and your notes turn into a landfill. Nine out of ten memos never get read again.

I went the other way. I didn't build a tool that extracts more — I built one that discards ruthlessly. The real core of this system isn't its extraction ability. It's the *discard criteria*.

## Discarding comes before extracting

The top rule in my extraction discipline always starts with "throw it out."

- If it's ambiguous, throw it out
- No over-extraction, no conversation summaries, no generalities
- Throw out anything you could easily recover with a search (this is the most powerful filter)
- Throw out anything that becomes a common generality once you strip the proper nouns
- If there's nothing worth saving, output only "nothing to save"
- **A miss is better than an over-extraction**

Only six things survive, and only when they clearly qualify: an actual action you have to take, information a first-timer wouldn't know, the structure and operating logic of a system, a phrase you can reuse verbatim, a fact that serves as evidence, and a realization big enough to change how you judge things.

## Why three stages instead of one

Ask an LLM to "organize the important parts of this conversation" in one shot, and it obligingly organizes everything. That's the problem. When extraction, interpretation, and organizing all happen at once, the discarding never kicks in.

So I split it into stages and force the model to discard again at each one. Stage 1 pulls candidates only — it doesn't organize. Stage 2 interprets the candidates and assigns meaning, but anything that involves inference has to be flagged as an "estimate." Stage 3 organizes everything into hierarchical bullets you can paste straight into Notion, discarding one last time. Whatever survives has to be understandable on its own, with no surrounding context.

The key mechanism is forcing the model to flag whether something is an estimate. It stops the AI from blending structures it invented with structures the conversation actually supports.

## Copy-paste prompts

### Stage 1 — Candidate extraction

```text
From the conversation/text below, extract only the "candidates" worth saving.
This is a first-pass candidate extraction, not a final write-up. Don't refine categories or polish sentences.
The point is to aggressively discard low-value items and keep only candidates worth interpreting in Stage 2.

[Top priorities]
- If it's ambiguous, throw it out / no over-extraction / no conversation summaries / no generalities
- Throw out anything easily recoverable with a search
- Don't invent anything that isn't there
- If nothing is worth saving, output only "nothing to save"
- Keep the count low, and merge anything that means the same thing

[Keep] only when it clearly fits one of these
1) An actual action to take  2) Important information a first-timer wouldn't know
3) A system's structure / flow / branching / operating logic  4) A phrase reusable verbatim
5) A fact usable as evidence  6) A realization that changes how you judge things

[Discard] impressions / agreement / connective explanation / plain answer summaries / common knowledge /
fragments that reveal no structure / anything that becomes a generality once proper nouns are removed

[Output] don't categorize — just list the candidates. Give each one a single temporary label:
[Action] [HiddenInfo] [Structure] [Phrase] [Evidence] [Insight]
- 1–3 sentences each / bullets only / preserve phrase candidates exactly as written
```

### Stage 2 — Assigning meaning

```text
The above is the Stage 1 candidate extraction. Now interpret each candidate and assign its "meaning."
This is not yet the stage where you file things neatly. Interpret what it is, why it matters, and what structure it reveals.

[Principles]
- Even among the Stage 1 candidates, discard again here if the value is low
- Infer structure and operating logic only within what the conversation directly supports
- Whenever inference is involved, flag it as an "estimate"
- If it's at the level of a generality, throw it out

Classify each candidate as exactly one of these final types:
Action item / Nature & principle of the subject / Core information / Phrase / Evidence / Insight / Other

[Output format] Candidate title
  - Final type: …
  - Core meaning: …
  - Why it matters: …
  - Structure / operating logic: … (if applicable)
  - Estimate status: directly supported / partly an estimate
```

### Stage 3 — Final write-up for Notion

```text
The above is the Stage 2 meaning assignment. Now produce the final write-up to move straight into Notion.
Discard low-value items one last time.

[Principles] If it's ambiguous, throw it out / no over-extraction / no generalities /
don't force items in just to fill a category / if there's nothing, output "nothing to save"

[Categories] Action item / Nature & principle of the subject / Core information / Phrase / Insight / Other
- Keep only items worth saving, and give each exactly one category
- Drop empty categories, and group items by category in the output

[Output] every item as hierarchical bullets
- Top bullet is the title only; put the explanation in sub-bullets
- Surviving items must read clearly on their own, in plain language
- For [Nature & principle of the subject], start with "Nature: X is an organ/system/structure that …"
- For [Phrase], give the title + meaning + original text (add pinyin for Chinese)
```

For an important conversation, I recommend running all three stages separately. Do it in one shot and the discarding loses its bite.

## To close

The value of this system isn't a flashy output. It's the discipline of letting a machine decide *what not to keep*. AI will keep generating more and more, and as it does, what grows scarce isn't generation — it's selection and discarding. I version-control those discard criteria like code.
