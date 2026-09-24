# QA Multitool

Panel de utilidades que se ejecuta como *bookmarklet* dentro de la página que estés visitando.

Herramientas incluidas:

| Herramienta | Qué hace |
|---|---|
| Abrir varias URLs | Abre un listado completo en pestañas separadas |
| Status HTTP | Verifica 200 / 301 / 404 y exporta a Excel o CSV |
| Extraer enlaces | Obtiene todos los enlaces de la página actual |
| Chequeo SEO | Title, meta description, H1-H6, imágenes sin alt, enlaces |

## Instalación

1. Publica este repositorio con **GitHub Pages** (rama `main`, carpeta `/root`).
2. Abre `instalar.html` desde la URL de Pages.
3. Escribe ahí la URL base y arrastra el botón generado a la barra de marcadores.

## Estructura

```
core.js        panel, menú y utilidades compartidas
manifest.js    lista de herramientas que se cargan
tools/         una herramienta por archivo
instalar.html  generador del marcador
```

Para agregar una herramienta: crea `tools/mi-tool.js` y añade su ruta a `manifest.js`.

```js
QAMT.tool({
  id: 'mi-tool', name: 'Mi herramienta', icon: '🧩', group: 'General',
  desc: 'Descripción corta'
}, function (ctx) {
  var U = ctx.util, root = ctx.root;
  root.innerHTML = '<label class="fld">Entrada</label><textarea id="ta"></textarea>'
    + '<div class="row"><button class="btn primary" id="go">Ejecutar</button></div>';
  root.querySelector('#go').onclick = function () { /* lógica */ };
});
```

Utilidades disponibles en `ctx.util`: `parseUrls`, `toExcel`, `toCsv`, `download`,
`remember`, `store`, `copy`, `esc`, `stamp`.

## Notas

- El panel se inyecta en Shadow DOM, por lo que el CSS del sitio no lo afecta.
- Todo el procesamiento ocurre en el navegador; no se envían datos a ningún servidor.
- Los códigos HTTP exactos solo se obtienen para URLs del mismo dominio de la página
  donde se ejecuta el marcador (restricción de CORS del navegador).

## Licencia

Uso personal. Código genérico, sin datos ni configuración de ninguna organización.
