# Odoo PO Translations

[![CI](https://github.com/cristiand395/odoo-po-translations/actions/workflows/ci.yml/badge.svg)](https://github.com/cristiand395/odoo-po-translations/actions/workflows/ci.yml)

> Resaltado de sintaxis y validación para archivos de traducción **`.po` / `.pot`**
> de *gettext*, afinado para el desarrollo en **Odoo**.

VS Code abre los `.po` como texto plano: todo de un color y sin ninguna
validación. Esta extensión les da **color** (incluido el HTML y las variables
dentro de las cadenas) y **detecta los errores** de traducción que en Odoo no
fallan hasta que la aplicación se ejecuta.

---

## ✨ Qué hace

### 🎨 Colores con sentido
Diferencia comentarios, claves (`msgid`/`msgstr`), flags y el texto traducido. Y
dentro de cada cadena resalta por separado lo que de verdad importa revisar:

- **Variables / placeholders**: `%s`, `%(name)s`, `{}`, `{count}`
- **Etiquetas HTML**: `<a>`, `<br/>`, `<span>` y sus atributos
- **Entidades** (`&nbsp;`) y **secuencias de escape** (`\n`)

### 🔎 Detección de errores
Marca con subrayado los fallos típicos de traducción:

| | Detecta | Por qué importa en Odoo |
|---|---|---|
| ⛔ | **Placeholders que no coinciden** entre `msgid` y `msgstr` (faltan o sobran) | Odoo **falla en ejecución** al formatear la cadena |
| ⚠️ | **HTML inconsistente** (la traducción pierde o añade etiquetas) | Rompe el render del texto |
| ⚠️ | **Sin traducir** (`msgstr` vacío) | Quedan textos en inglés en la interfaz |
| ⚠️ | **Fuzzy** (traducción por revisar) | Suelen ser traducciones dudosas |
| ⚠️ | **`msgid` duplicado** | Entradas redundantes o conflictivas |

> En archivos **`.pot`** (plantillas) no se marca "sin traducir": por definición
> sus `msgstr` están vacíos.

### 🛠️ Correcciones rápidas (`Ctrl + .`)
- Quitar la marca **fuzzy**
- **Copiar** el texto original a la traducción vacía
- **Añadir** los placeholders o las etiquetas HTML que faltan

### 📊 Progreso siempre visible
- Un **CodeLens** en la cabecera de cada archivo con el **% traducido**.
- Dos indicadores en la **barra de estado**: el del archivo actual (en vivo) y el
  total del **proyecto** (este último se calcula **solo cuando lo pides**).
- Las entradas **fuzzy** se resaltan con un fondo tenue.

> Los diagnósticos en vivo se aplican **solo al archivo abierto**. El análisis de
> todo el proyecto es **manual** (botón de la vista lateral, clic en el indicador
> o el comando *Escanear todo el workspace*), para no ralentizar proyectos Odoo
> grandes con miles de traducciones.

### 🗂️ Vista lateral "Problemas de traducción"
Un panel en la barra de actividad que lista **todos los `.po`/`.pot` del proyecto
con problemas** y, bajo cada archivo, sus entradas. Clic → saltas a la línea. Una
*checklist* navegable para traducir el módulo entero.

### 🔗 Ir al código
`Ctrl/Cmd + clic` sobre una referencia `#: addons/sale/models/sale.py:142` abre
ese archivo en esa línea.

---

## ⚙️ Configuración

| Opción | Por defecto | Descripción |
|---|---|---|
| `odooPo.checkPlaceholders` | `true` | Verifica que los placeholders coincidan. |
| `odooPo.checkHtml` | `true` | Verifica que las etiquetas HTML coincidan. |
| `odooPo.warnOnEmptyMsgstr` | `true` | Marca las traducciones vacías. |
| `odooPo.warnOnFuzzy` | `true` | Marca las entradas `fuzzy`. |
| `odooPo.highlightFuzzy` | `true` | Pinta el fondo de las entradas `fuzzy`. |
| `odooPo.scanWorkspaceOnSave` | `false` | Reescanear todo el proyecto al guardar (costoso en proyectos grandes). |

---

## 🎨 Personalizar los colores

Cada elemento usa un *scope* TextMate propio acabado en `.po`, así que puedes
fijar tus colores en `settings.json` sin afectar a tu HTML/JS normal:

```jsonc
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "entity.name.tag.po",             "settings": { "foreground": "#FF7EDB" } },
    { "scope": "entity.other.attribute-name.po", "settings": { "foreground": "#FEDE5D" } },
    { "scope": "variable.parameter.placeholder.named.po", "settings": { "foreground": "#36F9F6" } }
  ]
}
```

> **Tip:** combina con [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
> para ver el mensaje de error en línea. Si su color choca con el de las cadenas,
> ajústalo con `"workbench.colorCustomizations": { "errorLens.warningForeground": "#FEDE5D" }`.

---

## 📦 Compatibilidad

Funciona con cualquier `.po`/`.pot` de *gettext*; las reglas (placeholders
nombrados `%(campo)s`, formato `{}`, plurales) están pensadas para los términos
exportados por Odoo (`i18n/<módulo>.pot`, `i18n/es.po`, …).

## 🐞 Problemas y sugerencias

Reporta *bugs* o ideas en el repositorio del proyecto. ¡Las contribuciones son
bienvenidas!
