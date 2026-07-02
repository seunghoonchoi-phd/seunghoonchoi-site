# Homepage Work Rules

Follow the global user instructions first. These rules apply to this website repository.

## Incomplete Drafts

- When the user asks to put a homepage article, draft, or rough idea into `미완료`, create it under `content/<lang>/incomplete/`.
- Treat `미완료` as the owner's private draft shelf. Write the draft seriously and completely, but do not ask for a pre-publication review before committing.
- Use front matter with `hidden: true` and `reviewStatus: "none"` unless the user explicitly says otherwise.
- Fill the draft-list fields so the admin queue stays scannable when many drafts pile up: `title`, `date`, `draftSource` or `categories`, `subtitle`, `tags`, and `image` when a relevant existing image is available.
- After creating or updating a `미완료` draft, run the relevant Hugo build check, commit the scoped change, and push to `origin/main`.
- Do not move a `미완료` draft into a public section such as `column`, `career`, `apps`, `research`, `books`, or `literature` unless the user explicitly asks.

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
- Do not reuse the exact sentence immediately before or after the image. Do not duplicate the article title, section heading, or image alt text as the caption.
- Keep the caption short. Gray, italic quote styling is handled by CSS, so do not put literal quote marks at the start or end of the caption text.
- Apply caption changes across every configured language, with Japanese included. Before pushing content or image caption changes, run `node tools/check-caption-quality.js` along with the usual language sync and image checks.

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
