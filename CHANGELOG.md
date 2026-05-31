# Changelog

## 0.9.4

- Eliminadas las referencias a capturas del README (se añadirán más adelante).

## 0.9.3

- Las capturas del README quedan comentadas hasta añadir los PNG reales, para no
  mostrar imágenes rotas en el Marketplace.

## 0.9.2

- El archivo abierto se re-analiza explícitamente al guardar (además de al abrir
  y al editar). El escaneo del proyecto sigue siendo manual.

## 0.9.1

- Los diagnósticos se aplican **solo al archivo abierto**. El escaneo de todo el
  workspace ya no es automático (ni al activar ni al guardar): es manual, para no
  ralentizar proyectos Odoo grandes. Nuevo ajuste opcional
  `odooPo.scanWorkspaceOnSave` (por defecto desactivado).

## 0.9.0

- Espacio de nombres unificado a `odooPo.*` en ajustes y comandos (antes
  `po-colors.*`). Hecho en desarrollo, sin usuarios afectados.
- Corregido un byte nulo accidental en el separador de claves de duplicados.

## 0.8.2

- Nombres de marca consistentes: los indicadores de la barra de estado se llaman
  "Odoo PO (archivo)" / "Odoo PO (workspace)" y el origen de los diagnósticos en
  el panel de Problemas es "Odoo PO" (antes "po-colors").

## 0.8.1

- Los dos indicadores de la barra de estado ahora son claramente distintos
  (`PO` para el archivo, `Proyecto` para el workspace) y solo el del archivo se
  pinta de rojo, para que no parezcan duplicados.
- README reorientado a la tienda de extensiones, con capturas.

## 0.8.0

- **Renombrada a "Odoo PO Translations"** y preparada para publicación
  (icono, licencia MIT, metadatos del Marketplace).
- **Nueva vista lateral** "Problemas de traducción" en la barra de actividad:
  lista todos los `.po`/`.pot` con problemas y sus entradas, navegables.
- **Bundling con esbuild**: un único `dist/extension.js` minificado → menor
  tamaño del paquete y activación más rápida.
- **Caché de parseo** por versión de documento: diagnósticos, CodeLens y
  decoraciones comparten un solo parseo por pulsación.
- Servicio de escaneo del workspace unificado (la barra de estado y la vista
  comparten un único escaneo).
- Suite de **tests** (`node --test`) para parser, placeholders y etiquetas HTML.

## 0.7.0

- Quick-fix para añadir etiquetas HTML faltantes.
- CodeLens con el progreso de traducción por archivo.
- Resaltado de fondo de las entradas `fuzzy` (`po-colors.highlightFuzzy`).

## 0.6.0

- Lint de consistencia de etiquetas HTML entre `msgid` y `msgstr`
  (`po-colors.checkHtml`).
- Indicador de total del workspace en la barra de estado.

## 0.5.0

- En archivos `.pot` se omite el aviso de "sin traducir".

## 0.4.0

- Barra de estado con el resumen de problemas del archivo activo.

## 0.3.0

- Colores por defecto distintos para etiquetas HTML, atributos y entidades.

## 0.2.0

- Resaltado de etiquetas HTML, atributos y entidades dentro de las cadenas.

## 0.1.0

- Resaltado de sintaxis PO, diagnósticos (placeholders, vacío, fuzzy,
  duplicados), quick-fixes, ir a referencia y comando de validación.
