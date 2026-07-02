---
title: "Why Hours of AI Chat Leave You With Nothing. A 3-Stage Notion Prompt"
seoTitle: "AI Chat to Notion: 3-Stage Info Extraction Prompts"
date: 2026-06-20
categories: ["AI"]
tags: ["ai", "llm", "prompt-engineering", "information-extraction", "knowledge-management"]
subtitle: "Not a tool that grabs more, but one that throws away hard"
description: "A 3-stage info extraction prompt that pulls only what's worth keeping from your ChatGPT and AI chats into Notion. The real point isn't pulling more, it's the rule for what to throw out. Copy-paste prompts included."
hidden: true
build: {list: never, render: always}
---

![A drawer of card files where only the labeled ones stay. Picking is the system](/images/col-info-extraction.jpg)

The more I talk to AI, the less knowledge I actually keep. Strange, but true.

The reason is simple. AI produces more than I can check and file. The good lines keep coming. Yet a month later, there is almost nothing I can find again.

That is why "use AI to organize my notes" almost always fails. Everyone chases the same thing: pull more. The more you pull, the faster your notes fill up with junk. Nine out of ten memos never get opened again.

I went the other way. I didn't build a tool that grabs more. I built one that throws away hard. The real heart of this system isn't its power to extract. It's the rule for what to throw out.

## If a search would find it, throw it out

My extraction rules start with "throw it out," from the first line to the last.

- If it's unclear, throw it out
- Don't over-pull, don't summarize the chat, don't write generalities
- Throw out anything a quick search would turn up (this is the strongest filter)
- Throw out anything that becomes a plain, common line once you remove the proper nouns
- If there's nothing worth saving, output only "nothing to save"
- A miss is better than an over-pull

Only six things stay, and only when they clearly fit: an action you actually have to take, info a first-timer wouldn't know, the structure that shows how a system runs, a phrase you can reuse word for word, a fact that serves as proof, and a realization big enough to change how you judge things.

## Ask for it all at once and the AI keeps everything

Try telling an LLM "organize the important parts of this chat" in one shot. The model kindly organizes all of it. That's the problem. When you ask it to pull, interpret, and file all at once, the throwing-away never happens.

So I split it into stages. Each stage makes it throw away again.

Stage 1 pulls candidates only. It doesn't file anything. Stage 2 attaches meaning to the candidates, but when a guess is involved, it has to mark it "estimate." Stage 3 files everything into hierarchical bullets you can paste straight into Notion, and throws away one last time. Whatever survives has to make sense on its own, with no surrounding context.

The key device is the "estimate flag." It forces apart the structure the AI made up from the structure the chat actually backs up, so the two never blend.

![Why Hours of AI Chat Leave You With Nothing. A 3-Stage Notion Prompt](/images/inline/column-info-extraction-pipeline.jpg)

<p class="inline-image-caption">Why Hours of AI Chat Leave You With Nothing. A 3-Stage Notion Prompt</p>

## Copy-paste prompts, grab them as is

### Stage 1: pull candidates, don't file

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

[Output] don't categorize, just list the candidates. Give each one a single temporary label:
[Action] [HiddenInfo] [Structure] [Phrase] [Evidence] [Insight]
- 1 to 3 sentences each / bullets only / preserve phrase candidates exactly as written
```

### Stage 2: attach meaning, flag anything made up as an estimate

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

### Stage 3: build the Notion shape and throw away again

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

Run an important conversation through all three stages. Do it in one shot and the throwing-away barely works.

## What's valuable is the rule for throwing away

The worth of this system isn't a flashy output. It's the rule that gives a machine the job of deciding "what not to keep."

AI is going to make more and more from here on. The more it makes, the more precious it becomes to pick and to throw away, not to generate. So I version-control that throw-away rule like code.
