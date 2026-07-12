---
title: "StarCraft Input and Decision Training: Practice Thinking During Fast Input"
seoTitle: "StarCraft Input and Decision Trainer: Measure Decisions During Fast Input"
date: 2026-07-12
categories: ["Tools"]
tags: ["StarCraft", "gaming", "decision-making", "training", "app"]
subtitle: "The app compares speed and accuracy during input alone with performance when input and decisions are combined."
description: "StarCraft Input and Decision Training is a free installable web app that measures how well decision accuracy holds during fast number-key and mouse input, then trains both tasks together."
image: /images/starcraft-think-trainer-card.svg
reviewStatus: "done"
---
<div class="appcard" contenteditable="false"><img class="appcard__icon" src="/images/starcraft-think-trainer-card.svg" alt="StarCraft input and decision training app icon"><div class="appcard__body"><span class="appcard__free">Free installable web app (PWA)</span><h3>StarCraft Input and Decision Training</h3><p>The app measures input speed and decision accuracy separately, then compares them with performance when both tasks are combined.</p><a class="cta" href="https://seunghoonchoi-phd.github.io/starcraft-think-trainer/" target="_blank" rel="noopener">Open the app →</a></div></div>

When a player speeds up number-key and mouse input in StarCraft, choosing the next action can become harder. Hand speed alone does not explain this problem. The player selects an input sequence while also judging the game state. When those choices overlap, selecting the next action can take longer. This app does not score input speed alone. It also measures the decision performance that remains during input.

## The app measures input and decisions separately, then together

The 10-minute session first measures an input baseline and a decision baseline. The player then performs both tasks together. Later phases change the priority task and the decision rule, and a red STOP target checks whether the player can withhold an input. The final phase changes the input sequence and the questions to measure whether the player can apply the rules under unseen conditions.

The app counts a completed action only when the player presses the correct number key and then clicks the target. Repeated keys and incorrect inputs do not count as completed actions. The player must maintain accurate input and accurate decisions together. A high APM number alone cannot raise the score.

## The app reports three results separately

- Input speed retention compares combined-task speed with the input baseline.
- Decision performance retention compares accuracy and response time with the decision baseline.
- Unseen-condition decision accuracy is the percentage of new decision questions answered correctly.

The app shortens the target interval only after input and decision accuracy both meet their thresholds. If the player leaves the training view, the app pauses the training clock. The browser stores training records only on the current device.

## The app applies research findings but does not guarantee better game performance

The app draws on research about response delays during combined tasks and the effects of repeated practice. It also adjusts difficulty to the player and measures performance again with problems that differ from the practice set.

Researchers have not tested whether this app raises a StarCraft ladder rank. Players should separately inspect their replays for changes in production downtime, time spent supply blocked, and missed major decisions. This app does not diagnose or treat health conditions, intelligence, or ADHD symptoms. This project is not affiliated with Blizzard Entertainment and does not use Blizzard artwork, audio, or code.

[Open the app →](https://seunghoonchoi-phd.github.io/starcraft-think-trainer/)

[Review the research sources and limitations in the app →](https://seunghoonchoi-phd.github.io/starcraft-think-trainer/#evidence)

[View the source code →](https://github.com/seunghoonchoi-phd/starcraft-think-trainer)
