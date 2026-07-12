---
title: "AI Model Vibe Check: See for Yourself How Much Better a New Model Really Is"
seoTitle: "AI Model Vibe Check: Compare a New AI Model with the Previous One Across 24 Prompts in 8 Areas"
date: 2026-07-12
categories: ["Tools"]
tags: ["AI", "model comparison", "prompts", "radar chart", "app"]
subtitle: "Score a new model on 24 standard prompts across 8 areas and overlay two models on a radar chart. Your scores are stored only in this browser."
description: "AI Model Vibe Check is a free web app that provides 24 standard test prompts in 8 areas so you can see for yourself how a new AI model differs from the previous one. Scores for each model are stored only in this browser."
image: /images/ai-vibe-check-card.svg
reviewStatus: "done"
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/ai-vibe-check/icon.svg" alt="AI Model Vibe Check app icon">
  <div class="appcard__body">
    <span class="appcard__free">Free web app</span>
    <h3>AI Model Vibe Check</h3>
    <p>Paste 24 standard prompts across 8 areas into a new AI model, score each answer 0/1/2, and the app overlays two models on a radar chart to show which areas improved and by how much. Your scores are stored only in this browser.</p>
    <a class="cta" href="/ai-vibe-check/" target="_blank" rel="noopener">Open the app →</a>
  </div>
</div>

Every time a new AI model comes out, the announcement is full of benchmark scores, but those numbers rarely tell you what actually got better for the work you do. And if you improvise new questions each time, the conditions differ from when you tested the previous model, so no real comparison is possible. So I built a standard set of prompts you can ask any model in exactly the same way and compare the results side by side. Note that the app's interface is in Korean.

## Twenty-four prompts across eight areas

The set contains three prompts in each of eight areas — reasoning and logic, math and calculation, coding, Korean and language, honesty and hallucination, instruction following, long-text handling, and creativity and writing — for 24 prompts in total. Each prompt comes with an explanation of why it separates models, scoring criteria for 0, 1, and 2 points, and a checklist of what to look for while grading. The honesty area, for example, includes a question built on a plausible false premise, so you can see whether the model fabricates facts or corrects the premise first.

## Copy the prompt, paste it, and score the answer

Using it is simple. Copy a prompt, paste it into the chat window of the model you want to test, compare the model's answer against the scoring criteria shown with the prompt, and record 0, 1, or 2 points. There is no sign-up and no API key, and the app never calls any model itself. Any model from any company can be tested the same way as long as it has a chat window.

## Compare two models on a radar chart

Your scores are saved as a session per model. Pick any two sessions and the app overlays their scores across the eight areas on a radar chart, so you can see at a glance which areas the new model improved in and by how much. If math and coding are near perfect but the honesty score is unchanged, for example, that means you still need to fact-check that model's answers.

## The quick course takes five minutes

If you don't have time for all 24 prompts, there is a quick course of eight — one representative prompt per area. Its prompts are kept short so that testing and scoring finish within five minutes. Beyond the built-in prompts, you can add your own frequent tasks as custom prompts, and both prompts and scores can be exported to or imported from a JSON file, so you can continue on another computer or share the same prompt set with someone else.

## Your scores are stored only in this browser

This app is a static web app that runs without a server. Everything you enter, including model sessions, scores, and custom prompts, is stored only in this browser and never sent to a server. Clearing your browser data also deletes your scores, so download anything you want to keep as a JSON file.
