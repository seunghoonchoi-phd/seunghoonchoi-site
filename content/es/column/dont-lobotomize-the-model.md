---
title: "Las herramientas de revisión con IA arruinan los buenos resultados. No mutiles al modelo"
seoTitle: "Por qué las herramientas de revisión de PPT y Excel con IA arruinan el resultado"
date: 2026-06-16
categories: ["IA"]
tags: ["ia", "herramientas", "LLM"]
subtitle: "Solo detecta los errores. No toca el gusto."
description: "Las herramientas que revisan PowerPoint, Excel y Word generados por IA imponen un estilo y arruinan el resultado. llm-office-qa, de código abierto, solo detecta errores objetivos."
---

![Una lupa junto a un portátil](/images/col-qa.jpg)

El texto se salía del borde de la diapositiva. Estaba a punto de enviarla.

Había otro problema. Una hora antes, el modelo había hecho una versión vieja, y mis cambios en Excel habían vuelto a esa versión sin que yo lo notara. La tabla tenía borde en solo tres de cinco celdas. No es cuestión de gusto. Está mal, sin más. Necesitaba algo que detectara esto antes de enviar el archivo.

Así que instalé las herramientas de revisión con IA que ya existen.

## No detectan los errores y solo imponen un formato

La mayoría hacía cosas que yo no había pedido. Cuántas fuentes como máximo. Cuántas letras por diapositiva. Qué colores se pueden usar. Cuántas viñetas como máximo, seis.

No detectaban errores. Imponían su propio formato y a eso lo llamaban "calidad".

## Cuanto más inteligente es el modelo, más lo recorta el revisor

El problema está aquí. Algún día saldrá un modelo mejor. Un modelo que rompa todas esas reglas a propósito y aun así arme una diapositiva densa y muy buena.

Entonces ese revisor castiga al modelo justamente por haberlo hecho mejor.

Las reglas sobre el gusto se convierten en una cadena para el siguiente modelo. Atan el resultado al nivel de aquel momento, al nivel de aquel modelo débil con el que se hicieron las reglas.

## Esta herramienta solo detecta los errores claros

Solo elimina los errores claros. Con lo demás, se aparta.

Por eso a cada control le puse dos pruebas que tiene que pasar.

**Primera. ¿Está mal de forma objetiva, sin importar el gusto?** El texto que se sale del lienzo está mal. El error `#REF!` está mal. Una tabla con distinto número de celdas en cada fila está mal. Aquí no entra el gusto.

**Segunda. ¿Es algo que incluso un modelo más capaz evitaría siempre?** Si un modelo más inteligente podría romper esa regla a propósito para hacerlo mejor, esa regla no entra en esta herramienta. Ni como error, ni como advertencia.

La densidad, el color, el número de fuentes, los márgenes, la calidad de las frases. Todo eso falla la segunda prueba. Por eso no incluí nada de esto.

Eso no es un error. Es el techo. Subir el techo nunca fue tarea de un revisor.

## El modelo da órdenes sobre algo que no ve y tampoco lo comprueba

Debajo de todo esto hay una sola idea.

Todos los defectos vienen del mismo lugar. El modelo da órdenes sobre cosas que no puede ver. La diapositiva ya renderizada, la forma real de la celda. Llena ese vacío con suposiciones en vez de con la verdad, y no comprueba el resultado.

La solución no son las reglas de estilo. *Lee la verdad antes de escribir, y verifica después de escribir.*

Cuanto más inteligente es el modelo, mejor cumple esto. Ese es el punto. La disciplina no pelea contra el modelo, sino que crece junto con él.

## Lo publiqué gratis en GitHub

Lo subí a GitHub con licencia MIT.

Si construyes algo con un LLM, me gustaría que me dijeras cuáles de mis controles son en realidad cuestión de gusto. Justamente esos son los que no deberían estar aquí.

→ [llm-office-qa en GitHub](https://github.com/seunghoonchoi-phd/llm-office-qa)
