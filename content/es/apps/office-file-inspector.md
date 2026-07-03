---
title: "Office File Inspector: detector de fallos en PPT, Excel y Word creados con IA"
seoTitle: "Office File Inspector: QA open source para PPT, Excel y Word generados por IA"
date: 2026-06-16
categories: ["Herramientas"]
tags: ["open-source", "ai", "Office File Inspector"]
subtitle: "Detecta errores claros sin bajar el techo del resultado"
description: "Office File Inspector es un comprobador open source que detecta defectos evidentes en PowerPoint, Excel y Word creados con IA: texto fuera de la diapositiva, errores #REF! y Markdown residual."
image: /images/llm-office-qa-card.svg
hidden: true
build: {list: never, render: always}
aliases: ["/apps/llm-office-qa/"]
---
<div class="appcard">
  <img class="appcard__icon" src="/images/llm-office-qa-card.svg" alt="Icono de Office File Inspector">
  <div class="appcard__body">
    <span class="appcard__free">Open source (MIT)</span>
    <h3>Office File Inspector</h3>
    <p>Un comprobador que detecta defectos evidentes en PowerPoint, Excel y Word creados con IA, sin cambiar las decisiones de estilo.</p>
    <a class="cta" href="https://github.com/seunghoonchoi-phd/llm-office-qa" target="_blank" rel="noopener">Ver en GitHub -></a>
  </div>
</div>

Cuando encargas a un LLM una presentación, una hoja de cálculo o un documento, aparecen errores parecidos una y otra vez: texto que se sale de la diapositiva, errores `#REF!` en Excel, celdas que parecen números pero están guardadas como texto, o Markdown que queda dentro de un documento de Word.

Office File Inspector detecta solo esos defectos evidentes. No convierte en reglas el número de fuentes, la cantidad de viñetas, los colores ni la densidad de información, porque esas decisiones dependen del objetivo y del contexto. Una herramienta de revisión debe subir el piso del resultado. No debe bajar el techo.

El primer archivo que se usa es `check_office_file.py`. PowerPoint, Excel y Word se pueden revisar con el mismo comando.

```bash
python check_office_file.py report.pptx
python check_office_file.py model.xlsx
python check_office_file.py proposal.docx
```

Si quieres revisar directamente por tipo de archivo, usa `tools/check_powerpoint.py`, `tools/check_excel.py` o `tools/check_word.py`. Si quieres que un agente revise los archivos de Office justo después de crearlos, conecta `integrations/auto_check_office_files.py` como hook.

La URL del repositorio de GitHub se mantiene como `llm-office-qa` para no romper enlaces antiguos. Pero el nombre público, el README y la estructura de ejecución ya están organizados alrededor de Office File Inspector.

[Ver en GitHub ->](https://github.com/seunghoonchoi-phd/llm-office-qa)

Por qué lo construí así y por qué una capa de QA no debe bloquear la posibilidad de un mejor resultado -> [No lobotomices el modelo](/es/column/dont-lobotomize-the-model/)
