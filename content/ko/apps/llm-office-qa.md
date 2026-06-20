---
title: "llm-office-qa — AI 산출물 QA 오픈소스"
seoTitle: "AI가 만든 PPT·엑셀·워드 결함 자동 검사 오픈소스 — llm-office-qa"
date: 2026-06-16
categories: ["도구"]
tags: ["오픈소스", "ai"]
subtitle: "더 똑똑한 모델의 발목은 잡지 않고, 명백한 실수만 잡는다"
description: "AI가 만든 PowerPoint·Excel·Word의 객관적 결함만 잡는 오픈소스 파이썬 린터. 더 유능한 모델의 스타일 상방은 절대 건드리지 않는다. MIT 라이선스."
image: /images/llm-office-qa-card.svg
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="llm-office-qa 아이콘">
  <div class="appcard__body">
    <span class="appcard__free">무료 · 오픈소스(MIT)</span>
    <h3>llm-office-qa</h3>
    <p>AI가 만든 PowerPoint·Excel·Word의 명백한 실수만 잡고, 스타일은 일부러 건드리지 않는 결정론적 린터.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHub에서 보기 →</a>
  </div>
</div>

LLM에 슬라이드나 스프레드시트를 맡기면 늘 비슷한 실수가 나옵니다. 슬라이드 밖으로 삐져나온 텍스트, `#REF!` 오류, 숫자인데 텍스트로 저장된 칸, Word에 그대로 새어 들어간 마크다운. **llm-office-qa**는 딱 그런 것만 잡습니다. 나머지는 건드리지 않습니다.

- **객관적 결함만** — 캔버스 밖으로 나간 텍스트, 깨진 수식, 칸 수가 안 맞는 표, 비율이 틀어진 이미지, 일부만 남은 테두리, 지워지지 않은 마크다운
- **스타일은 알아서 하게 둠** — 밀도든 색이든 폰트든 문장이든, 그건 모델이 정할 몫이지 린터가 손댈 일이 아닙니다
- **결정론적** — 파일을 읽어 측정만 합니다. 네트워크도, 모델 호출도 없습니다
- **MIT 라이선스**, 그리고 [Claude Code](https://docs.claude.com/en/docs/claude-code) 훅으로 돌아갑니다 — 납품 전에 결함을 모델에게 되먹여 직접 고치게 합니다

[GitHub에서 보기 →](https://github.com/seunghoonchoi-phd/llm-office-qa)

왜 이렇게 만들었는지 — QA 레이어가 왜 더 똑똑한 모델의 족쇄가 되면 안 되는지 → [모델을 거세하지 마라](/ko/column/dont-lobotomize-the-model/)
