---
title: "Office File Inspector: AI가 만든 PPT·엑셀·워드 결함 검사기"
seoTitle: "Office File Inspector: AI 생성 PPT·엑셀·워드 결함 검사 오픈소스"
date: 2026-06-16
categories: ["도구"]
tags: ["오픈소스", "ai", "Office File Inspector"]
subtitle: "명백한 오류는 잡고, 결과물의 상한은 낮추지 않는다"
description: "Office File Inspector는 AI가 만든 PPT·엑셀·워드에서 슬라이드 이탈, #REF! 오류, 잔여 마크다운 같은 명백한 결함만 잡는 오픈소스 검사기입니다."
image: /images/llm-office-qa-card.svg
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Office File Inspector 아이콘">
  <div class="appcard__body">
    <span class="appcard__free">오픈소스(MIT)</span>
    <h3>Office File Inspector</h3>
    <p>AI가 만든 PowerPoint·Excel·Word의 명백한 결함만 확인하고, 스타일 선택은 일부러 바꾸지 않는 검사기.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">GitHub에서 보기 →</a>
  </div>
</div>

LLM에 슬라이드나 스프레드시트, 문서 파일을 맡기면 늘 비슷한 실수가 나옵니다. 슬라이드 밖으로 삐져나온 텍스트, Excel의 `#REF!` 오류, 숫자인데 텍스트로 저장된 칸, Word에 그대로 남은 마크다운 같은 것들입니다.

Office File Inspector는 그런 명백한 결함만 잡습니다. 폰트 수, 불릿 수, 색감, 정보 밀도처럼 목적과 맥락에 따라 달라지는 선택지는 검사 기준으로 만들지 않습니다. 검수 도구는 결과물의 하한을 올리는 장치여야 합니다. 상한을 낮추는 장치가 되면 안 됩니다.

가장 먼저 쓰는 파일은 `check_office_file.py`입니다. PowerPoint, Excel, Word를 모두 이 명령 하나로 검사할 수 있습니다.

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

파일 형식별로 직접 검사하고 싶다면 `tools/check_powerpoint.py`, `tools/check_excel.py`, `tools/check_word.py`를 쓰면 됩니다. 에이전트가 오피스 파일을 만든 직후 자동으로 검사하게 하려면 `integrations/auto_check_office_files.py`를 훅으로 연결하면 됩니다.

GitHub 저장소 주소는 기존 링크 유지를 위해 `llm-office-qa` 그대로 두었습니다. 하지만 공개 이름과 README, 실행 파일 구조는 Office File Inspector 기준으로 정리했습니다.

[GitHub에서 보기 →](https://github.com/seunghoonchoi-phd/llm-office-qa)

왜 이렇게 만들었는지, 검수 도구가 왜 더 좋은 결과의 가능성을 막으면 안 되는지 → [AI 결과물 검수의 함정](/ko/column/dont-lobotomize-the-model/)
