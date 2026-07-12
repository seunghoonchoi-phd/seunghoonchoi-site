# Homepage Work Rules

Follow the global user instructions first. These rules apply to this website repository.

## Incomplete Drafts

- When the user asks to put a homepage article, draft, or rough idea into `미완료`, create it under `content/<lang>/incomplete/`.
- Treat `미완료` as the owner's private draft shelf. Write the draft seriously and completely, but do not ask for a pre-publication review before committing.
- Use front matter with `hidden: true` and `reviewStatus: "none"` unless the user explicitly says otherwise.
- Fill the draft-list fields so the admin queue stays scannable when many drafts pile up: `title`, `date`, `draftSource` or `categories`, `subtitle`, `tags`, and `image` when a relevant existing image is available.
- After creating or updating a `미완료` draft, run the relevant Hugo build check, commit the scoped change, and push to `origin/main`.
- Do not move a `미완료` draft into a public section such as `column`, `career`, `apps`, `research`, `books`, or `literature` unless the user explicitly asks.

## App Design System (Clarity) — required for every app

- Every web app / PWA under `static/<app>/` MUST use the "Clarity" design system (Toss-style: neutral gray canvas, one blue primary, Pretendard). This is the owner's standing rule — apply it to any NEW app from the first commit, and never ship an app in another palette. The five current apps (`gwiwha`, `language-recall`, `reading-trainer`, `ai-vibe-check`, `us-tax`) already follow it; `static/language-recall/styles.css` is the reference implementation to copy tokens from.
- Canonical light-mode tokens (copy verbatim into each app's `:root`; token NAMES vary slightly per app for historical reasons — `--copper`/`--accent` both mean the blue — but the VALUES below are fixed):
  - Surfaces: canvas `#fafafa`, card `#ffffff`, subtle surface `#f4f5f7`, border `#e5e8eb`.
  - Text: ink `#191f28`, ink-soft `#4e5968`, muted `#6b7684`.
  - Primary (blue): base `#3182f6`, hover/pressed `#2272eb` (a.k.a. accent-ink `#1b64da`), tint bg `rgba(49,130,246,.08)`, tint line `rgba(49,130,246,.35)`, soft fill `#e8f3ff`. Primary buttons are solid blue with white text.
  - Semantic: good `#067647`, warn `#b25b00`, bad `#d22030` (soft bg variants `#e6f7f0` / `#fff3e0` / `#fdeaec`).
  - Type: `--sans`/`--serif` both = `"Pretendard Variable", Pretendard, -apple-system, system-ui, "Segoe UI", "Noto Sans KR", sans-serif`, loaded from `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`. No serif, no italics. Weights 400/600/700 only.
  - Shape: radius 8 / 12 / 16px, pill `9999px`. Shadows soft: `0 1px 2px rgba(0,0,0,.04)` and `0 8px 24px rgba(0,0,0,.12)`. No background textures/gradients on the canvas.
- Dark mode (apps that support it, e.g. `reading-trainer`): canvas `#0f1115`, surface `#191c22`, ink `#f2f4f6`; lift the blue to accent `#4593fc` / accent-ink `#9cc3fd`.
- `<meta name="theme-color">` = `#fafafa` (or the dark canvas when dark). Do NOT reintroduce the retired Molecular navy `#0D1B4C` / copper `#B87333` or the Waypoint coral — those were rolled back. See memory `molecular-precision-brand-canon`.

## App UI Edit Overrides

- Each PWA app under `static/<app>/` may contain a `ui-edits.json`, written by the owner from the in-app admin editor (`static/admin/app-edit.js`, the "✎ UI 편집" button; auth and commits reuse the sc-admin-api Worker). The file holds runtime UI overrides: `rootScale` (percent page zoom), `text` (exact-match `{find, replace}` text swaps — the owner edits the Korean UI as the source), and `style` (`{selector, fontScale, hide}`).
- Every visitor gets these overrides applied at runtime, so the live app already shows the owner's manual edits before any source change lands.
- When the owner asks Claude to bake the edits in (typically "한국어 기준으로 다른 언어 반영해줘"), do it in one commit:
  1. Read `static/<app>/ui-edits.json`.
  2. Apply each `text` change at the Korean source of that string (static HTML, JS string table, or the app's i18n dictionary), then update the app's other UI languages from the new Korean wording — translate the meaning, keep each language natural, and do not leave any UI language behind.
  3. Bake `style` and `rootScale` changes into the app's own CSS.
  4. Reset the overrides file to `{ "version": 1, "app": "<app>", "rootScale": 100, "text": [], "style": [] }` so the runtime overlay goes quiet.
  5. Run the usual checks plus a Hugo build before push.
- `us-tax` is a built Vite artifact: apply text/CSS changes in its source project and rebuild, or edit the built `assets/index-*.css`/`.js` following the established cache-bust rename pattern.

## Article Publish Harness

- For article-only changes under `content/<lang>/...`, use `tools/publish-article.ps1` instead of a manual full-site check.
- Default preflight command:
  `powershell -ExecutionPolicy Bypass -File tools\publish-article.ps1 -ContentPath content\ko\column\example.md`
- Default publish command:
  `powershell -ExecutionPolicy Bypass -File tools\publish-article.ps1 -ContentPath content\ko\column\example.md -Push -CommitMessage "Publish article: <short title>"`
- The harness checks front matter, public `draft: true`, Korean em/en dashes, leftover TODO/FIXME markers, conditional RTL risk, Hugo local server rendering, a Chrome screenshot, scoped commit/push, and live page propagation.
- Use `-SkipScreenshot` only for a text-only smoke check. Use `-FullBuild` when the change touches layout, CSS, Hugo config, static assets, images that affect layout, Arabic pages, or anything outside a single article body/front matter.
- For Claude/Codex coordination, Claude should focus on read-only content and risk review: argument shape, Korean tone, source claims, expected URL/title, and whether `-FullBuild` is needed. Codex should run the deterministic pipeline: edit files, execute the harness, inspect screenshots, commit, push, and verify live output.

## Column TOC Flow

- Before publishing or revising a column, extract the H2 list and read it as a standalone table of contents. It must show one clear spine, not a pile of related topics.
- Choose the spine that fits the article: cause chain, contrast, chronological/dependency order, or checklist. Do not force a single pattern across all columns.
- Use numbered labels such as `1단계`, `Step 1`, or `Paso 1` only when the sections are real steps that must be performed in order. For ordinary opinion columns, make the heading wording carry the sequence instead: `X하면 Y`, `검토가 밀리면...`, `그래서...`, `공개 전에는...`.
- If the TOC reads as parallel buckets such as 법적 리스크 / 평판 리스크 / 보안 리스크, add or rename headings so the reader can see why the next section follows from the previous one.
- Apply the same H2 structure across every configured language, especially `content/ja`; the translated headings may sound natural in each language, but the argument spine must match the Korean source.

## Image Caption Rule

- Treat an article image caption as one extra sentence added to the article, not as a copied body sentence or a mini title.
- The paragraph near the image should already explain the direct point. The caption should add a related angle: what the image makes easier to notice, what risk or consequence the scene implies, or what the reader should carry into the next paragraph.
- For Korean captions, every sentence must make the subject, object, and action clear. Do not use a physical metaphor when the point is not the metaphor itself. For example, write `햇빛을 약간 감소시킨다는 말은 사소해 보이지만, 실제로는 행성 전체의 기후 시스템에 영향을 준다`, not `말은 작지만 손대는 대상은...`.
- Avoid compressed metaphor phrases in captions such as `손대다`, `일이 흘러가다`, `모델 주변의 손발`, `큰길/골목`, `좋은 판/나쁜 판`, `문턱이 낮아지다`, `시간이 막히다`, or `AI를 붙이다`. Name the actual system, process, delay, review step, or adoption action instead.
- Do not reuse the exact sentence immediately before or after the image. Do not duplicate the article title, section heading, or image alt text as the caption.
- Keep the caption short. Gray, italic quote styling is handled by CSS, so do not put literal quote marks at the start or end of the caption text.
- Apply caption changes across every configured language, with Japanese included. Before pushing content or image caption changes, run `node tools/check-caption-quality.js` along with the usual language sync and image checks.

## Korean Public Text Literal Style

- Apply the same subject-object-action rule to all public Korean explanatory content, not only image captions. In non-literary pages and columns, each sentence should make clear who or what acts, what it acts on, and what changes.
- Do not use physical metaphors when the metaphor is not the point of the paragraph. Replace phrases such as `AI를 붙이다`, `손발이 묶이다`, `손대다`, `독을 빼다`, `지구의 순환계`, `그 장기`, `그 지점`, or `시간을 사다/벌다` with the actual tool, permission, system, delay, CO2 reduction, review action, or decision point.
- Do not split ordinary Korean prose into one-sentence paragraphs by default. Group related sentences into a readable paragraph unless the short line is a deliberate punch line, transition, quote, or list-like rhythm. As a quick guard, three or more short prose paragraphs in a row should trigger a rewrite before publication.
- Literature pages may use metaphor deliberately. Career guides, app pages, book pages, research pages, and columns should prefer literal wording unless the whole section is explicitly built around a chosen analogy.
- Before pushing public Korean content changes, run `node tools/check-korean-literal-style.js`. If it fails, fix the Korean source first and then update every configured language from that corrected Korean source.

## Multilingual Content Parity

- Korean content under `content/ko` is the source of truth for public content. When a public page, article, column, career guide, research item, book page, app page, or literature page changes, update every configured language tree in the same turn unless the user explicitly says local-only, Korean-only, or draft-only.
- Always include Japanese in parity checks. A change is not ready to push if `content/ja` is missing the Korean-source file, image reference, structural block, or current front matter used by the other languages.
- Before committing public content changes, run `node tools/check-language-sync.js`. If the change adds or changes article body images, also run `node tools/check-article-image-uniqueness.js`.
- Translations of the same canonical content item should share the same body image path. Different canonical content items should not reuse `/images/col-*` or `/images/inline/*` body images unless the user explicitly asks for a shared site-wide illustration.

## RTL Layout Guard

- Arabic pages are RTL, but math/formula notation is LTR. Keep `.formula-block` content `direction:ltr` and visually centered.
- Do not center article-wide blocks with physical `margin-left:50%` plus `translateX(-50%)` unless an `html[dir="rtl"]` mirror rule is present. In RTL, mirror that centering with `margin-right:50%`, `margin-left:0`, and `translateX(50%)`.
- Do not hide skip links or screen-reader helpers with `left:-9999px`; in RTL pages that creates huge horizontal overflow. Use clipping (`clip-path:inset(50%)`) instead.
- After changing CSS, layout templates, Hugo language direction config, or Arabic content that contains wide blocks, run `node tools/check-rtl-layout.cjs` and `hugo --minify`.
- For visual changes touching Arabic pages, render and inspect `/ar/column/questions-lifeline/` or the affected Arabic page before publishing.
