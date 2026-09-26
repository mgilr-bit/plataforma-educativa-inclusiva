# Informe de conformidad con WCAG 2.1

**Plataforma Educativa Inclusiva** · Universidad Mariano Gálvez, Sede San Juan Sacatepéquez
Fecha de la revisión: 15 de septiembre de 2026 · Versión evaluada: `0.25.0`

## Alcance

Se evaluaron las siete pantallas de la aplicación web: inicio de sesión, panel del estudiante, panel del docente, detalle de curso, detalle de material con reproductor y transcripción, chat con el asistente educativo, y gestión de usuarios.

El nivel objetivo es **AA**. El tema de alto contraste supera AAA en los pares de color, como se detalla más abajo.

## Método

Se combinaron tres formas de verificación, porque ninguna basta por sí sola:

| Método | Qué cubre | Qué no |
|---|---|---|
| **Cálculo** de la fórmula de contraste de WCAG 2.1 | Los pares de color, con su valor exacto | Nada más |
| **axe-core** sobre cada pantalla, dentro de la suite de pruebas | Violaciones objetivas del marcado | Contraste real, comportamiento, sentido del contenido |
| **Pruebas automatizadas** de criterios concretos | Teclado, títulos, escalado, anuncios | Lo que exige juicio humano |

Las tres se ejecutan con `npm test`, de modo que un incumplimiento futuro hace fallar la construcción en lugar de pasar inadvertido.

## Resultados por criterio

### Perceptible

| Criterio | Nivel | Estado | Evidencia |
|---|---|---|---|
| 1.1.1 Contenido no textual | A | Cumple | Los iconos son decorativos y llevan `aria-hidden`; acompañan a un texto que dice lo mismo. No hay imágenes portadoras de información. |
| 1.2.2 Subtítulos (pregrabado) | A | Cumple | Los segmentos se entregan como pista **WebVTT nativa**, de modo que el navegador los dibuja respetando los ajustes de subtítulos del sistema operativo del usuario. |
| 1.2.3 Alternativa para medios | A | Cumple | La **transcripción completa** se muestra siempre junto al material, legible con independencia del reproductor. |
| 1.3.1 Información y relaciones | A | Cumple | Verificado por axe en las siete pantallas: etiquetas asociadas, encabezados jerárquicos, tablas con encabezados de fila y columna. |
| 1.4.1 Uso del color | A | Cumple | Todo estado se marca con al menos dos señales. El fragmento activo de la transcripción usa fondo, barra lateral y negrita; la página activa, color y subrayado grueso; los errores, borde y texto. |
| 1.4.3 Contraste (mínimo) | AA | **Supera** | Medido, no estimado. Ver tabla de contrastes. |
| 1.4.4 Cambio de tamaño del texto | AA | Cumple | Tres escalas hasta el 150 %, que se suman al zoom del navegador. Todos los tamaños derivan de una variable, comprobado por prueba. |
| 1.4.10 Reflujo | AA | Cumple | Rejilla adaptable sin puntos de ruptura escritos a mano; las tablas se desplazan en su propio contenedor en lugar de desbordar la página. |
| 1.4.11 Contraste no textual | AA | Cumple | Bordes y controles a 4.12:1, sobre el mínimo de 3:1. |

### Operable

| Criterio | Nivel | Estado | Evidencia |
|---|---|---|---|
| 2.1.1 Teclado | A | Cumple | Recorrido completo comprobado por prueba automatizada. |
| 2.1.2 Sin trampas de foco | A | Cumple | Comprobado por prueba: el foco entra y sale de los formularios. |
| 2.4.1 Evitar bloques | A | Cumple | Enlace «Saltar al contenido» como primer elemento enfocable. |
| 2.4.2 Página titulada | A | Cumple | Cada pantalla fija su propio título. **Este criterio se incumplía** hasta esta revisión. |
| 2.4.3 Orden del foco | A | Cumple | El recorrido sigue el orden de lectura; al cambiar de pantalla el foco pasa al contenido principal. |
| 2.4.4 Propósito del enlace | A | Cumple | Los enlaces llevan el nombre del destino, no un «ver más». |
| 2.4.6 Encabezados y etiquetas | AA | Cumple | Un `h1` por pantalla, jerarquía sin saltos, y ningún par de controles comparte etiqueta. |
| 2.4.7 Foco visible | AA | Cumple | Contorno de 3 px con `:focus-visible`, a 5.94:1 sobre el fondo. |
| 2.5.5 Tamaño del objetivo | AAA | Cumple | Área mínima de 44×44 px en todos los controles. |

### Comprensible

| Criterio | Nivel | Estado | Evidencia |
|---|---|---|---|
| 3.1.1 Idioma de la página | A | Cumple | `lang="es-GT"`, para que el lector de pantalla elija la voz y la pronunciación correctas. |
| 3.2.2 Al recibir entradas | A | Cumple | Ningún control provoca un cambio de contexto al escribir o al enfocar. |
| 3.3.1 Identificación de errores | A | Cumple | Los errores se marcan con `aria-invalid`, se enlazan con `aria-describedby` y se describen con texto, no solo con color. |
| 3.3.2 Etiquetas o instrucciones | A | Cumple | Etiquetas reales, nunca marcadores de posición: el marcador desaparece al escribir. |
| 3.3.3 Sugerencia ante error | AA | Cumple | Los mensajes dicen qué hacer: «El correo debe incluir una arroba, por ejemplo: nombre@umg.edu.gt». |

### Robusto

| Criterio | Nivel | Estado | Evidencia |
|---|---|---|---|
| 4.1.2 Nombre, función, valor | A | Cumple | Verificado por axe. Los nombres accesibles se declaran completos con `aria-label` donde componerlos por partes los dejaba con las palabras pegadas. |
| 4.1.3 Mensajes de estado | AA | Cumple | `aria-live` en los estados de carga, error y confirmación; `role="log"` en la conversación del asistente. |

## Contrastes medidos

Calculados con la fórmula de luminancia relativa de WCAG 2.1. El mínimo exigido es 4.5:1 para texto y 3:1 para bordes y controles.

| Par | Tema normal | Alto contraste |
|---|---|---|
| Texto sobre fondo | 16.91:1 | 21.00:1 |
| Texto secundario | 6.59:1 | — |
| Texto sobre superficie | 15.32:1 | — |
| Color primario sobre fondo | 8.00:1 | 15.18:1 |
| Texto sobre color primario | 8.00:1 | 15.18:1 |
| Error sobre fondo | 7.66:1 | 9.20:1 |
| Éxito sobre fondo | 7.31:1 | 13.20:1 |
| Borde sobre fondo | 4.12:1 | — |
| Indicador de foco | 5.94:1 | — |

**Todos los pares del tema de alto contraste superan 7:1**, el umbral del nivel AAA.

## Hallazgos corregidos durante el desarrollo

Se documentan porque muestran qué tipo de fallo detecta cada método, y porque varios eran invisibles en pantalla.

| Hallazgo | Cómo se detectó | Criterio |
|---|---|---|
| `role="log"` sobre una lista anulaba su semántica | axe-core | 1.3.1 |
| Los nombres accesibles salían con las palabras pegadas: «Desactivarla cuenta de…» | Medición del nombre calculado | 4.1.2 |
| Dos controles compartían la etiqueta «Rol» | Prueba automatizada | 2.4.6 |
| El tamaño de letra era tres paradas del tabulador en vez de una | Revisión de comportamiento | 2.1.1 |
| El foco no pasaba al contenido al cambiar de pantalla | Revisión de comportamiento | 2.4.3 |
| El foco no volvía al campo tras enviar una pregunta al asistente | Prueba automatizada | 2.4.3 |
| Todas las pantallas compartían el mismo título | Esta revisión | 2.4.2 |

## Limitaciones de esta revisión

Se declaran por honestidad metodológica: **este informe no equivale a una auditoría completa.**

1. **No se ha probado con un lector de pantalla real.** Es la verificación que más valdría y ninguna herramienta automática la sustituye. Queda pendiente recorrer la plataforma con VoiceOver o NVDA.
2. **No se ha probado con los usuarios destinatarios.** Los estudiantes con discapacidad auditiva son quienes pueden decir si el lenguaje del asistente y de los subtítulos se entiende. Corresponde a la tarea #36.
3. **La regla de contraste de axe está desactivada**, porque el entorno de pruebas no calcula estilos reales. Esos valores se verificaron aparte, con la fórmula, y figuran arriba.
4. **Las herramientas automáticas detectan una parte de los problemas.** Lo que depende de juicio —si el orden de lectura tiene sentido, si un texto describe bien lo que acompaña— ninguna lo ve.
5. **No se evaluaron criterios sin contenido aplicable** en la plataforma actual, como 1.2.4 (subtítulos en directo) o 1.4.2 (audio automático).

## Reproducir la verificación

```bash
cd frontend && npm test     # axe sobre cada pantalla + criterios concretos
cd backend  && npm test     # contrato de la API y control de acceso
```
