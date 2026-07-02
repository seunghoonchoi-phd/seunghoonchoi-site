---
title: "La trampa de revisar resultados de IA: no bajes el techo mientras corriges errores"
seoTitle: "Por qué las herramientas que revisan PowerPoint y Excel hechos con IA pueden bajar el techo del resultado"
date: 2026-06-16
categories: ["AI"]
tags: ["ai", "herramientas", "LLM"]
subtitle: "Hay que bloquear los errores claros sin bloquear también la posibilidad de un resultado mejor."
description: "Al revisar PowerPoint, Excel o Word creados por IA, ¿cómo distinguimos defectos reales de decisiones de estilo? Presento los principios de diseño de Office File Inspector."
reviewStatus: "done"
---
![Una lupa junto a un portátil](/images/col-qa.jpg)

El texto se salía de la diapositiva. Lo vi justo antes de enviarla.

En Excel todavía quedaba un error `#REF!`, y los bordes de la tabla aparecían en unas celdas sí y en otras no. En un documento de Word seguían visibles símbolos de Markdown que debían haber desaparecido. Eso no es una cuestión de gusto. El resultado está roto.

En los archivos de Office creados por IA aparecen a menudo errores así. Por eso hacen falta herramientas de revisión. El problema es decidir hasta dónde deben intervenir.

## Revisar es subir el piso

Una herramienta de revisión debe subir el piso del resultado. Debe detectar texto que se sale de una diapositiva, fórmulas rotas, placeholders sin resolver o restos de Markdown en el documento. Cosas que serían un problema para casi cualquier destinatario.

Cuanto antes se detecten esos errores, mejor. Son demasiado pequeños para que una persona los encuentre siempre al final, pero demasiado graves si salen tal cual. Si la IA creó el archivo, tiene sentido que otra capa automática vuelva a revisar los defectos evidentes que la IA dejó pasar.

Pero aquí es fácil cruzar la línea. Una herramienta creada para detectar errores empieza, sin darse cuenta, a imponer estilo.

## Si conviertes el estilo en error, bajas el techo

Algunas herramientas tratan el número de fuentes, la cantidad de bullets, la extensión del texto, los márgenes, los colores o la densidad de información como si existiera una única respuesta correcta. "Una diapositiva solo debe usar dos fuentes", "no debe haber más de seis bullets", y así.

Claro que esas reglas pueden ayudar a veces. Pero no son siempre correctas. Un documento técnico, un informe de inversión, una clase y una diapositiva de una sola página no tienen por qué tener la misma densidad ni la misma forma.

Cuando esas reglas se vuelven criterios absolutos, pasa algo raro. Aunque el modelo produzca un resultado mejor, recibe una penalización porque se aparta del ejemplo antiguo. Entonces la herramienta de revisión deja de subir el piso y empieza a bajar el techo.

## La pregunta para separar error de elección

Antes de agregar una comprobación, hay que hacerse dos preguntas.

Primera: aunque cambien la intención o el gusto del usuario, ¿casi siempre sería un defecto? Un `#REF!` en una fórmula, una forma fuera de la diapositiva o un placeholder sin resolver casi nunca deberían entregarse así.

Segunda: ¿un modelo más competente también querría evitar este problema? Si una regla puede romperse a propósito para lograr un resultado mejor, no conviene declararla error. La densidad de información, la combinación de colores, el número de fuentes, los márgenes o la longitud de las frases entran aquí.

La idea es simple. Si hasta un modelo mejor intentaría evitar ese fallo, hay que detectarlo. Pero si un modelo mejor podría elegirlo deliberadamente, la herramienta no debe bloquearlo.

![La trampa de revisar resultados de IA: no bajes el techo mientras corriges errores](/images/inline/column-dont-lobotomize-the-model.jpg)

## No todo se divide en blanco y negro

En la revisión real de archivos no todo se separa con limpieza. Cajas de texto que se pisan, letras que se desbordan, texto pequeño o una imagen estirada tienen mucha probabilidad de ser defectos, pero también pueden ser decisiones intencionales.

Por eso el resultado de la revisión debe dividirse. Los defectos estructurales claros se marcan como `ERROR`. Lo que requiere mirada humana se deja como `WARN`.

`WARN` no es una condena. Es una solicitud de revisión. Sin esta diferencia, la herramienta se vuelve demasiado débil o demasiado agresiva.

## La revisión automática no reemplaza el juicio final

Muchos defectos de los archivos de Office creados por IA nacen porque el modelo no ve bien el resultado final. Escribe coordenadas y valores de celdas, pero quizá no comprueba con suficiente detalle la pantalla renderizada. También puede no reflejar el estado más reciente del archivo que el usuario acaba de corregir.

Por eso la revisión automática es necesaria. Después de crear el archivo, hay que volver a leerlo y detectar defectos medibles. Errores de fórmula, salida del lienzo o restos de Markdown deben caer en una revisión mecánica antes de que una persona los busque al final.

Pero esa revisión automática no puede reemplazar el juicio final. El contexto, la intención, el público y la situación de presentación no se entienden por completo mirando un archivo aislado. Una buena herramienta de revisión debe dejar claro qué sabe con seguridad.

## Por qué hice Office File Inspector

Con ese principio ordené Office File Inspector. Es una herramienta open source que busca defectos claros en archivos de PowerPoint, Excel y Word creados por IA.

El objetivo no es hacer que todos los resultados tengan la misma forma. Es bloquear pronto los fallos evidentes y dejar espacio para que el modelo y la persona tomen mejores decisiones.

Una herramienta de revisión no debe reducir las posibilidades del modelo. Una buena revisión sube el piso. No baja el techo.

→ [Office File Inspector en GitHub](https://github.com/seunghoonchoi-phd/llm-office-qa)
