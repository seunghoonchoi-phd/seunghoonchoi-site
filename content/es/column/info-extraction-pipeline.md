---
title: "Hablas mucho con la IA y no te queda nada en la mano. Tres prompts para ordenar en Notion"
seoTitle: "Ordenar charlas con IA en Notion: 3 prompts para extraer información"
date: 2026-06-20
categories: ["IA"]
tags: ["ia", "llm", "ingeniería de prompts", "extracción de información", "gestión del conocimiento"]
subtitle: "No una herramienta que saca mucho, sino una que descarta sin piedad"
description: "Tres prompts para extraer información de tus charlas con ChatGPT y otras IA, elegir solo lo que vale la pena y pasarlo a Notion. La clave no es extraer, sino el criterio para descartar. Incluye los prompts listos para copiar y pegar."
hidden: true
build: {list: never, render: always}
---

![Un cajón con tarjetas donde solo quedan las que tienen etiqueta. Elegir es el sistema en sí](/images/col-info-extraction.jpg)

<p class="inline-image-caption">La verdadera clave de este sistema no es la capacidad de extraer, sino el criterio para descartar.</p>

Cuanto más hablas con la IA, menos conocimiento te queda en la mano. Suena raro, pero pasa.

La razón es sencilla. La IA produce más de lo que tú puedes revisar y ordenar. Las buenas respuestas no paran de salir. Pero un mes después casi no puedes encontrar ninguna otra vez.

Por eso, "ordenar mis notas con IA" casi siempre fracasa. Todo el mundo se concentra en sacar más. Cuanto más sacas, antes se llenan las notas de cosas inútiles. Nueve de cada diez notas no las vuelves a mirar.

Yo hice lo contrario. No construí una herramienta que saca mucho, sino una que descarta sin piedad. La verdadera clave de este sistema no es la capacidad de extraer, sino el criterio para descartar.

## Si lo encuentras buscando, descártalo

Mi regla de extracción empieza con "descarta" de principio a fin.

- Si dudas, descártalo.
- No saques de más, no resumas la conversación, no anotes lo obvio.
- La información que encuentras rápido buscando en internet, descártala (este es el filtro más fuerte).
- Si al quitar los nombres propios queda algo trivial, descártalo.
- Si no hay nada que guardar, escribe solo "Nada que guardar".
- Es mejor dejar algo fuera que sacar de más.

Solo se queda lo que encaja con claridad en una de seis cosas. Una acción que de verdad tienes que hacer; información que quien lo hace por primera vez no conoce; una estructura que muestra cómo funciona un sistema; una frase que puedes reutilizar tal cual; un hecho que sirve como prueba; y una idea capaz de cambiar tu criterio para decidir.

## Si lo pides de una vez, la IA lo salva todo

Pídele a un LLM "ordéname lo importante de esta conversación" de una sola vez. El modelo, muy amable, te lo ordena todo. Ese es el problema. Cuando le pides extraer, interpretar y ordenar al mismo tiempo, el descarte deja de funcionar.

Por eso parto el trabajo en pasos. En cada paso lo hago descartar otra vez.

El primer paso solo saca candidatos. No ordena. El segundo paso le añade significado a cada candidato, pero si entra una suposición, lo marca como "supuesto". El tercer paso lo ordena en viñetas jerárquicas listas para pegar en Notion y, al final, descarta una vez más. Lo que sobrevive queda escrito de forma que se entienda solo, sin contexto antes ni después.

El mecanismo central es "marcar si es supuesto". Obliga a separar la estructura que la IA inventó de la estructura que de verdad tiene base en la conversación, para que no se mezclen.

![Hablas mucho con la IA y no te queda nada en la mano. Tres prompts para ordenar en Notion](/images/inline/column-info-extraction-pipeline.jpg)

<p class="inline-image-caption">Obliga a separar la estructura que la IA inventó de la estructura que de verdad tiene base en la conversación, para que no se mezclen.</p>

## Prompts para copiar y pegar, úsalos tal cual

### Paso 1: no ordenes, solo saca candidatos

```text
Extrae solo los "candidatos" que vale la pena guardar de la conversación o el texto de abajo.
No es el orden final, es una primera extracción de candidatos. No afines las categorías ni adornes las frases.
La clave es descartar con fuerza lo que tiene poco valor para guardar y dejar solo los candidatos que vale la pena interpretar en el paso 2.

[Principio principal]
- Si dudas, descarta / No extraigas de más / No resumas la conversación / Nada de obviedades
- Descarta la información que se recupera fácil buscando en internet
- No inventes contenido que no esté
- Si no hay valor para guardar, escribe solo "Nada que guardar"
- Pocos elementos; combina las repeticiones que digan lo mismo

[Qué dejar] Solo cuando encaja con claridad en uno de estos
1) Una acción que de verdad hay que hacer  2) Información importante que quien lo hace por primera vez no conoce
3) Estructura, flujo, ramas o forma de operar de un sistema  4) Una frase reutilizable tal cual
5) Un hecho que sirve como prueba  6) Una idea que cambia el criterio para decidir

[Qué descartar] Impresiones / asentimientos / explicaciones intermedias / simples resúmenes de respuestas / conocimiento general /
fragmentos que no muestran estructura / contenido que se vuelve obvio al quitar los nombres propios

[Salida] No clasifiques, solo lista los candidatos. Asigna a cada candidato 1 sola etiqueta provisional:
[Acción] [InfoOculta] [Estructura] [Frase] [Prueba] [Idea]
- Cada elemento de 1 a 3 frases / solo viñetas / los candidatos de frase se conservan en su forma original
```

### Paso 2: añade significado y marca como supuesto lo inventado

```text
Lo de arriba es el resultado de la primera extracción de candidatos. Ahora interpreta cada candidato y dale un "significado".
Todavía no es el paso de colocarlo bonito. Interpreta qué es, por qué importa y qué estructura revela.

[Principios]
- Si entre los candidatos del paso 1 hay alguno de poco valor, descártalo aquí otra vez
- Las estructuras y los principios de operación, dedúcelos solo dentro de lo que tiene base directa en la conversación
- Si interviene una deducción, márcalo como "supuesto"
- Si queda a nivel de obviedad, descártalo

Clasifica cada candidato en 1 de estos tipos finales:
Acción / Esencia o principio del objeto / Información clave / Frase / Prueba / Idea / Otros

[Formato de salida] Título del candidato
  - Tipo final: …
  - Significado central: …
  - Por qué importa: …
  - Estructura / principio de operación: … (cuando aplique)
  - Si es supuesto: base directa / en parte supuesto
```

### Paso 3: dale forma de Notion y descarta otra vez

```text
Lo de arriba es el resultado del paso 2, donde se asignó significado. Ordénalo en su forma final para pasarlo directo a Notion.
Los elementos con poco valor para guardar, descártalos una última vez.

[Principios] Si dudas, descarta / No extraigas de más / Nada de obviedades /
No dejes elementos a la fuerza solo para llenar una categoría / Si no hay nada, escribe "Nada que guardar"

[Clasificación] Acción / Esencia o principio del objeto / Información clave / Frase / Idea / Otros
- Deja solo los elementos con valor para guardar y asigna a cada uno 1 sola clasificación
- Omite las clasificaciones sin elementos y agrupa juntos los de la misma clasificación

[Salida] Todos los elementos en viñetas jerárquicas
- La viñeta superior solo el título; la explicación en viñetas inferiores
- Lo que sobrevive debe entenderse leyéndolo solo, en palabras sencillas
- [Esencia o principio del objeto] empieza con "Esencia: X es un órgano/sistema/estructura que ~"
- [Frase] título + significado en español + texto original (en chino añade el pinyin)
```

Las conversaciones importantes, pásalas por los tres pasos. Si lo pides de una vez, baja la intensidad del descarte.

## Lo valioso es la regla que descarta

El valor de este sistema no está en una salida vistosa. Está en la regla que hace que sea la máquina la que decida "qué no guardar".

La IA va a producir cada vez más. Cuanto más lo haga, más valioso se vuelve no generar, sino elegir y descartar. Por eso gestiono ese criterio para descartar por versiones, como si fuera código.
