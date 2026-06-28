# Claude Handoff: Foundations Menu And Korean Copy

Date: 2026-06-28

## User Intent

승훈님이 원한 것은 `/ko/foundations/` 본문 안의 큰 지도가 아니라, 상단 내비게이션에서 `기초지식` 탭에 마우스를 올렸을 때 뜨는 dropdown 메뉴 모양을 바꾸는 것이었다.

The dropdown should look like the reference image:

- dark navy rectangular panel
- `전체 지도` centered at the top in copper
- two columns and four rows underneath
- left column: `수학`, `컴퓨터과학`, `철학`, `인지과학`
- right column: `물리`, `공학`, `경제`, `법`
- thin divider lines between rows and columns

Do not move the overview map inside the page body. The body map remains the existing SVG concept map.

## Files Touched

- `layouts/partials/header.html`
- `assets/css/main.css`
- `content/ko/foundations/_index.md`
- `content/ko/foundations/{math,computer-science,philosophy,cognitive-science,physics,engineering,economics,law}/_index.md`

## Navigation Change

The foundations dropdown now renders separately from the ordinary writing dropdown:

- `nav__menu--foundations`
- `nav__sublink--foundations-map`
- `nav__foundations-grid`
- `nav__sublink--foundation`

The first item, `전체 지도`, links to the foundations root. The remaining eight items are placed in a CSS grid with four rows and two columns. On mobile, the menu falls back to the existing inline list style so the large desktop panel does not take over the mobile nav.

Mobile nav behavior:

- `글·책` and `기초지식` are collapsed by default inside the hamburger menu.
- Each group uses the existing `.nav__toggle` button as the tap target.
- A visible V-shaped caret is drawn on the right side with CSS on `.nav__caret::before`.
- When the group opens, `.nav__group.is-open` rotates the caret upward and shows the submenu.
- Closing the hamburger or clicking a submenu link also closes any open dropdown groups.

## Korean Copy Changes

The copy was adjusted in the Korean foundations pages to sound less like a subject catalog and more like a usable guide.

Main overview page:

- Subtitle changed from a generic "AI가 똑똑해질수록..." line to a clearer user-facing claim: "답을 빨리 받는 시대에, 사람이 판단하려면 필요한 공부들".
- Description changed from a long category inventory to a plain explanation: this is a map of eight fundamentals the reader can enter from.
- The opening body no longer says "개념도는..., 네 묶음은..." in a builder-like way. It now says the reader can click a tile and enter that field directly.
- The "왜 하필 이 여덟인가" section was softened from MECE language to a simpler reason: the eight fields ask different questions and cover form, nature, mind, and society.

Group item descriptions:

- Replaced noun lists like `구조·논리·확률·통계...` with action-oriented Korean phrases.
- Examples:
  - 수학: `흐릿한 문제를 구조와 숫자로 바꾸기`
  - 컴퓨터과학: `문제를 기계가 따라 할 수 있는 절차로 바꾸기`
  - 물리: `화면 밖 현실이 허락하는 것과 막는 것 보기`
  - 공학: `한 번 되는 것을 매일 되는 것으로 만들기`

Subpage metadata:

- Subtitles and descriptions were rewritten to be more direct and less "course syllabus" like.
- The repeated pattern `AI 시대의 기본기 — ...` was changed to `AI 시대의 기본기, ...` in descriptions.
- Subtitles were changed from abstract labels to concrete actions or judgments.

Punctuation/style cleanup:

- Removed em/en dashes from Korean public copy.
- Split long dash sentences into normal Korean sentences.
- Example: `AI는 무엇을 싸게 만들고 무엇을 귀하게 만들까 — ...` became `AI는 무엇을 싸게 만들고 무엇을 귀하게 만들까. ...`

## What Not To Regress

- Do not reintroduce a large dark `전체 지도` card into the body of `/ko/foundations/`.
- Do not replace the body SVG concept map unless the user explicitly asks for the page body, not the hover dropdown.
- Keep Korean public copy free of em/en dashes.
- Keep the desktop dropdown and mobile nav styles separate.

## Verification To Run

- `node tools/check-rtl-layout.cjs`
- `hugo --minify`
- Render `/ko/foundations/` and force the `기초지식` nav group open for screenshot inspection.
- Check mobile width twice: first with the hamburger open and dropdowns collapsed, then with `기초지식` expanded. The right-side caret should be clearly visible in the collapsed state.
