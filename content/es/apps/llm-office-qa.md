---
title: "Código abierto para revisar defectos en PPT, Excel y Word hechos por IA: llm-office-qa"
seoTitle: "Linter de código abierto para revisar defectos en PPT, Excel y Word generados por IA"
date: 2026-06-16
categories: ["Herramientas"]
tags: ["código abierto", "ia"]
subtitle: "No frena a los modelos más inteligentes; solo detecta los errores evidentes"
description: "Un linter de Python de código abierto que detecta solo defectos objetivos en archivos PPT, Excel y Word hechos por IA: texto que se desborda, errores #REF!, markdown sin borrar y más. Determinista, MIT, hook de Claude Code."
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Ícono de llm-office-qa">
  <div class="appcard__body">
    <span class="appcard__free">Código abierto (MIT)</span>
    <h3>llm-office-qa</h3>
    <p>Un linter determinista que detecta solo los errores evidentes en archivos de PowerPoint, Excel y Word hechos por IA y deja el estilo a propósito sin tocar.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">Ver en GitHub →</a>
  </div>
</div>

Cuando le pides a un modelo de lenguaje que prepare diapositivas o una hoja de cálculo, siempre salen los mismos errores. Texto que se sale de la diapositiva, errores `#REF!`, celdas que son números pero están guardadas como texto, markdown que se cuela tal cual en un documento de Word. **llm-office-qa** detecta justo eso. No toca nada más.

- **Solo defectos objetivos**: texto que se sale del marco, fórmulas rotas, tablas con un número de columnas que no cuadra, imágenes con la proporción deformada, bordes que quedaron a medias, markdown que no se borró
- **Deja el estilo en manos del modelo**: la densidad, el color, la fuente, las frases; eso lo decide el modelo, no es tarea del linter
- **Determinista**: lee el archivo y solo mide. No usa la red ni llama a ningún modelo
- **Licencia MIT** y funciona como hook de [Claude Code](https://docs.claude.com/en/docs/claude-code): antes de entregar el archivo, le devuelve los defectos al modelo para que él mismo los corrija

[Ver en GitHub →](https://github.com/seunghoonchoi-phd/llm-office-qa)

Por qué lo hice así, y por qué una capa de control de calidad no debe convertirse en una traba para los modelos más inteligentes → [No le hagas una lobotomía al modelo](/es/column/dont-lobotomize-the-model/)
