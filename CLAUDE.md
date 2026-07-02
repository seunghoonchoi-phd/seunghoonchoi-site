# Claude Instructions for This Repository

@AGENTS.md

Pay special attention to the RTL Layout Guard in `AGENTS.md`. Arabic pages are right-to-left, while math/formula notation is left-to-right; run `node tools/check-rtl-layout.cjs` after CSS, layout, Hugo language-direction, or Arabic wide-block changes.

Also pay special attention to the Multilingual Content Parity section in `AGENTS.md`: Korean is the source of truth, Japanese must not lag behind, and public content/image changes must be checked across every configured language before push.
