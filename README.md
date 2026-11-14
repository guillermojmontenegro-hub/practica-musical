# Practica · Lenguaje musical

Aplicación de práctica musical en React 19, con Vite y VexFlow 4.2.5 para grabado musical SVG. Incluye los doce ejercicios, audio sintetizado, metrónomo, práctica guiada e historial.

## Desarrollo

```sh
npm ci
npm run dev
```

## Compilación

```sh
npm run build
```

Genera la aplicación React en `dist/`, con JavaScript y CSS en `dist/assets/`. Para probar la compilación localmente, ejecutá `npm run preview`. Para publicarla, serví el contenido de `dist/` desde un servidor web. Las fuentes de la interfaz usan Google Fonts con alternativas locales. Los símbolos musicales están incluidos en VexFlow y no dependen de esas fuentes.

## Estructura

- `src/App.jsx`: componentes de la interfaz (sonido, práctica guiada y ejercicios; `src/Dashboard.jsx` contiene las estadísticas).
- `src/main.jsx`: entrada y montaje de React.
- `src/notation.mjs`: componente React `Staff`, grabado VexFlow y presentación de referencias. Las partituras son datos independientes del DOM; se copian al generarlas para conservar la referencia durante la edición.
- `src/exercises/`: generación y evaluación de ejercicios.
- Los controladores de audio, práctica, almacenamiento y ejercicios conservan su lógica y sus claves de persistencia. Se inicializan una vez tras montar la interfaz. Algunos controles conservan sus manejadores DOM originales.

El editor conserva el mouse y las flechas, Intro para escribir y Retroceso para deshacer. Las partituras largas tienen desplazamiento horizontal para mantener legibles las figuras en pantallas chicas.

## Verificación

```sh
npm test
npm run test:browser
```

La prueba de navegador usa Chrome en `/usr/bin/google-chrome` (se puede cambiar con `CHROME_PATH`) y levanta Vite automáticamente. Recorre los doce ejercicios, verifica los pentagramas, completa una transcripción y comprueba la comparación con la referencia. Las capturas se guardan en `/tmp/conservatorio-desktop.png` y `/tmp/conservatorio-mobile.png`.

## Estadísticas y tema

La pestaña **Estadísticas** incluye evolución diaria, aciertos y puntaje, resultados por ejercicio, ranking de fallos, últimos intentos y tiempo de práctica guiada. Permite filtrar por período y ejercicio y volver a practicar desde los resultados. Los totales previos se conservan; los nuevos detalles incluyen fecha, errores de respuesta y categorías de transcripción. El historial detallado se guarda en localStorage, hasta 5.000 intentos. Los ejercicios de solfeo registran la autoevaluación del estudiante.

El botón de la cabecera alterna modo claro y oscuro. La primera visita respeta el tema del sistema y las elecciones siguientes se conservan en este navegador. El tema también cubre los pentagramas SVG.

## Uso en celular

La interfaz se adapta desde 320 px y a la orientación horizontal. El centro muestra únicamente el ejercicio actual. El selector de ejercicios, los ajustes de sonido y tempo, la práctica guiada y el acceso a estadísticas están en una barra lateral contraíble en PC. En celular, el botón de menú abre un panel lateral superpuesto que se cierra al elegir un ejercicio o una sección; también se cierra con Escape o tocando afuera. El editor usa una barra compacta de símbolos: tocá un espacio para escribir, seleccioná una nota para cambiar su figura o arrastrala para cambiar la altura. Las flechas de altura, la ligadura y la eliminación aparecen solo cuando hay una selección. El mismo flujo funciona en melodías, ritmos y armaduras. Las partituras largas y el gráfico diario se desplazan horizontalmente dentro de su panel.

`npm run test:browser` incluye pruebas con emulación táctil a 320, 390, 430 y 844 px: navegación por los doce ejercicios, edición de notas, audio y metrónomo, práctica guiada, estadísticas y modo oscuro. Las capturas de esas pruebas se guardan en `/tmp/conservatorio-touch-*.png` y `/tmp/conservatorio-stats-touch-*.png`.

Para probarla en un teléfono de la misma red, ejecutá `npm run dev` y abrí la dirección **Network** que muestra Vite.

Las pruebas de navegación lateral verifican que contraer el menú conserve el ejercicio y los ajustes, que el panel móvil gestione el foco del teclado y que el contenido central permanezca libre de las tarjetas de configuración.

El valor de aciertos se muestra dentro de la tarjeta del ejercicio actual; el solfeo cantado muestra el puntaje ajustado por escuchas.

## Figuras, ligaduras y coherencia rítmica

La paleta, los símbolos y el audio comparten las definiciones de duración, incluidas las semicorcheas. Las transcripciones melódicas pueden incluir síncopas, dosillos, tresillos, cuatrillos, quintillos y ligaduras entre compases. La evaluación compara las alturas y los ataques sonoros; una ligadura prolonga el sonido sin volver a atacarlo. La edición permite cambiar notas existentes, eliminar notas o grupos y deshacer, con un borrador de acciones que se conserva al recargar.

En polirritmia se dibujan **dos pentagramas**, con los ataques de ambas voces alineados por su posición temporal. En 6/8 se identifican dos pulsos, cada uno con tres corcheas; los cuatro golpes del acompañamiento son dos golpes por pulso. El acompañamiento tiene un timbre diferenciado. La cuenta inicial marca los pulsos del compás. Tres corcheas regulares dentro de un pulso de 6/8 no se rotulan como tresillo irregular.

Las pruebas de correlación recorren 1.600 ejercicios generados y contrastan las figuras editables, la notación, los ataques, los silencios entre ataques, las duraciones y el acompañamiento. Otra prueba verifica la programación de esos eventos en Web Audio a un tempo concreto.

Los ejercicios mantienen una presentación mínima: consigna, contexto musical, partitura, controles con símbolos y resultado. Se omiten las ayudas repetidas y los textos de atajos; los controles conservan tooltips y nombres accesibles.

## Respuestas y edición

Los intervalos se responden mediante tres selectores: número, calidad y dirección. La lectura de armaduras utiliza nota y alteración para las tonalidades mayor y menor, con un filtro para practicar mayores, menores o ambas. Las armaduras se muestran sin indicación de compás.

Todos los desplegables visibles usan `CustomSelect`, un componente React con teclado, foco y opciones propias que mantiene los contratos de los formularios. En los ritmos a dos voces, ambos pentagramas comienzan vacíos y deben completarse antes de comprobar. El borrador y el deshacer incluyen la voz editada.

La barra muestra negra, corchea, semicorchea y fusa, de mayor a menor duración. El puntillo y los grupos n son modificadores de la figura elegida o de la selección; las ligaduras se aplican a una nota cargada y su siguiente de igual altura.

## Publicación

- Aplicación: https://practica-musical-nine.vercel.app
- Repositorio: https://github.com/guillermojmontenegro-hub/practica-musical
- Panel de Vercel: https://vercel.com/guillermojmontenegro-2520s-projects/practica-musical

Los cambios que se suben a `main` se publican mediante la integración de GitHub con Vercel.

La configuración `vercel.json` compila la aplicación con Vite y publica `dist/`. La aplicación funciona como sitio estático y no necesita variables de entorno de servidor. El repositorio incluye el código fuente y las pruebas; las credenciales, dependencias y archivos generados quedan excluidos.
