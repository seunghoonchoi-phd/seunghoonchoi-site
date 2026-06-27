#!/usr/bin/env node
const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const css = read("assets/css/main.css");
const hugo = read("hugo.toml");
const baseof = read("layouts/_default/baseof.html");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function compact(text) {
  return text.replace(/\s+/g, " ");
}

const cssOneLine = compact(css);
const hugoOneLine = compact(hugo);

expect(
  /\[languages\.ar\][\s\S]*?\bdirection\s*=\s*"rtl"/.test(hugo),
  "Arabic language config must use direction = \"rtl\"."
);
expect(
  !/\blanguagedirection\s*=/.test(hugoOneLine),
  "Do not use deprecated languagedirection; use direction."
);
expect(
  baseof.includes(".Site.Language.Direction"),
  "Base template must read .Site.Language.Direction for the html dir attribute."
);
expect(
  !baseof.includes(".Site.Language.LanguageDirection"),
  "Do not use deprecated .Site.Language.LanguageDirection."
);

expect(
  /html\[dir="rtl"\]\s+\.lede table,html\[dir="rtl"\]\s+\.post__body table,\s*html\[dir="rtl"\]\s+\.lede pre,html\[dir="rtl"\]\s+\.post__body pre\{[^}]*margin-right:50%;[^}]*margin-left:0;[^}]*transform:translateX\(50%\);/.test(cssOneLine),
  "Wide article tables/pre blocks need mirrored RTL centering."
);
expect(
  /\.lede \.formula-block,\.post__body \.formula-block\{[^}]*direction:ltr;[^}]*text-align:center;/.test(cssOneLine),
  "Formula blocks must remain LTR and centered inside RTL pages."
);
expect(
  /html\[dir="rtl"\]\s+\.lede \.formula-block,html\[dir="rtl"\]\s+\.post__body \.formula-block\{[^}]*margin-right:50%;[^}]*margin-left:0;[^}]*transform:translateX\(50%\);/.test(cssOneLine),
  "Formula blocks need mirrored RTL centering."
);
expect(
  !/html\[dir="rtl"\][^{]*\{[^}]*translateX\(-50%\)/.test(cssOneLine),
  "RTL-specific rules must not use translateX(-50%) for centering."
);
expect(
  !/\.skip\{[^}]*left:-9999px/.test(cssOneLine),
  "Skip links must not be hidden with left:-9999px; it creates RTL horizontal overflow."
);
expect(
  /\.skip\{[^}]*clip-path:inset\(50%\)/.test(cssOneLine),
  "Skip links should use clipping, not off-canvas positioning."
);

if (failures.length) {
  console.error("RTL layout harness failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RTL layout harness passed.");
