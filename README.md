# Atlas Utilities

Base de conocimiento verificable de **materiales, repuestos, normas y reglas de homologación** de los equipos de Utilities de la Cervecería Unión (Itagüí). Proyecto de práctica profesional.

Cada dato del Atlas tiene tres cosas:

1. **Cita**: documento y página de donde sale.
2. **Evidencia**: la frase copiada literalmente de esa página.
3. **Verificación**: un script comprobó que la evidencia está en la página. Si no estaba, el registro se descartó.

En la interfaz, cualquier cita se puede pulsar para ver el texto de la página con la evidencia resaltada.

## Qué incluye

| Vista | Para qué sirve |
| --- | --- |
| Sistemas | Una página por sistema (Caldera 5, Caldera 6, MYCOM N-160, aire comprimido, PTAR, terciario, desmineralizador…) con todo lo que dicen sus documentos |
| Materiales | Material y norma de cada componente |
| Repuestos | Números de parte, kits, cantidades e intervalos |
| Compatibilidad | Matriz material × químico de los propios proyectos, y **cruce automático con lo instalado** |
| Reglas | Qué piezas exigen original, qué certificados y pruebas pide cada norma, cómo se aprobaron materiales en la planta |
| Contradicciones | Dos documentos que dicen cosas distintas del mismo equipo, con ambas fuentes |
| Expediente | Asistente «¿cómo mando a hacer esta pieza?»: clasifica la pieza y arma una ficha imprimible con citas |
| Banco de pruebas | Preguntas reales con respuesta y cita; corre una prueba del buscador en el navegador |
| Documentos | Árbol de los 707 documentos y visor de texto por página |
| Verificación | Cómo se verifica cada dato y el resultado de la última verificación |

Búsqueda global con `Ctrl K` o `/`: busca en los registros verificados y en el texto completo de todas las páginas (códigos como `A193 B7`, números de parte, tags).

## Cómo correrlo

Es un sitio estático (HTML, CSS y JavaScript sin dependencias ni compilación). Necesita un servidor web porque carga los datos con `fetch`:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Dos versiones: interna y pública

| | Interna | Pública (GitHub Pages) |
| --- | --- | --- |
| Registros verificados con evidencia y cita | Sí | Sí |
| Texto completo de los 707 documentos (`data/doc`, `data/pages`, `data/index`) | Sí | No |
| Búsqueda en el texto completo y visor de páginas | Sí | No; muestra la ruta del archivo original |
| `herramientas/verificar.py` | Comprueba toda la base | Avisa que necesita la versión interna |

La versión pública se genera desde la interna, sin el texto de los documentos:

```bash
python3 herramientas/preparar_publico.py ../atlas-publico
```

## Publicar en GitHub Pages

1. Generar la versión pública (arriba) y subir **su contenido** al repositorio, incluido el archivo oculto `.nojekyll`.
2. *Settings → Pages → Deploy from a branch → main / (root)*.
3. En uno o dos minutos queda en `https://<usuario>.github.io/<repositorio>/`.

Para actualizar: volver a generar la versión pública y reemplazar los archivos del repositorio. Pages se actualiza solo con cada commit.

### ⚠ Confidencialidad: leer antes de publicar

`data/doc/`, `data/pages/` e `data/index/` contienen el **texto de documentos internos** de la planta (manuales, planos, certificados). En una cuenta gratuita, **GitHub Pages es público aunque el repositorio sea privado**: cualquiera con la URL podría leerlo.

Opciones, de más a menos segura:

- **Intranet o SharePoint de la compañía**: copiar la carpeta tal cual a un servidor interno. Es la opción recomendada.
- **GitHub Enterprise con Pages privado** (si la compañía lo tiene): acceso solo para miembros de la organización.
- **GitHub Pages público solo con los registros** (versión pública, arriba): no lleva el texto de los documentos, pero sí frases cortas de evidencia, números de parte y materiales. Pedir autorización a la empresa antes de publicar.

El Atlas no contiene contraseñas ni credenciales: las páginas de los manuales que las publican no se citan y sus valores no se copiaron.

## Verificar la base uno mismo

```bash
python3 herramientas/verificar.py
```

Recorre todos los registros publicados y comprueba, usando solo lo que hay en `data/`, que cada cita apunte a un documento y página existentes y que la evidencia aparezca en esa página. Sale con error si algo falla.

## Estructura

```
index.html            página única
css/atlas.css         estilos (tema claro y oscuro)
fonts/                Archivo, IBM Plex Sans y Plex Mono (licencia OFL)
js/app.js             enrutador, búsqueda global, tema
js/datos.js           carga de datos e índice
js/busqueda.js        búsqueda en registros y en texto completo
js/ui.js              citas, visor de fuente, tablas filtrables
js/vistas.js          todas las vistas
data/*.json           registros verificados (una tabla por archivo)
data/documentos.json  inventario de documentos
data/sistemas.json    sistemas y conteos
data/verificacion.json sello de la última verificación
data/doc/             texto por página de cada documento
data/pages/           páginas citadas (carga rápida)
data/index/           índice de términos del texto completo
herramientas/verificar.py  verificación independiente
```

## Límites

- El texto se extrajo automáticamente; 1.093 páginas provienen de escaneos (OCR) y pueden tener errores. Las citas de esas páginas se verificaron contra el texto OCR.
- Las verificaciones «aproximadas» (≈) coinciden en al menos el 90 % de las palabras; típicamente por errores de OCR.
- El Atlas no aprueba nada: el expediente sale «pendiente de aprobación».
- Los procedimientos HSE de la planta (LOTO, trabajo en caliente, espacios confinados) no estaban en los documentos entregados.
