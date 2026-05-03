# MADCRY · Brand Book

Manual de identidad de marca de Madcry Studio en formato PDF.

## Contenido

```
brand-book/
├── src/                              # HTML fuente + estilos compartidos
│   ├── styles.css
│   ├── brand-book.html               # documento maestro (13 paginas)
│   ├── business-card-print.html      # tarjeta para imprenta con sangrado
│   └── img/                          # logo + obras de Madcry
├── dist/                             # PDFs generados
│   ├── Madcry-Brand-Book.pdf         # MASTER · 13 paginas A4
│   ├── Madcry-Business-Card-Print.pdf  # 91x61mm con sangrado 3mm
│   └── sections/                     # Cada seccion como PDF independiente
│       ├── 00-cover.pdf
│       ├── 01-toc.pdf
│       ├── 02-manifiesto.pdf
│       ├── 03-logo.pdf
│       ├── 04-donts.pdf
│       ├── 05-color.pdf
│       ├── 06-tipografia.pdf
│       ├── 07-tono-de-voz.pdf
│       ├── 08-estilo-visual.pdf
│       ├── 09-aplicaciones.pdf
│       ├── 10-tarjeta-visita.pdf
│       ├── 11-packaging-redes.pdf
│       └── 12-back-cover.pdf
├── generate.mjs                      # script de generacion del brand book
└── generate-card.mjs                 # script de generacion de la tarjeta
```

## Como regenerar los PDFs

```bash
# Brand book completo (master + secciones)
node brand-book/generate.mjs

# Tarjeta de visita para imprenta
node brand-book/generate-card.mjs
```

Requiere `puppeteer` (ya instalado como devDependency).

## Editar el contenido

Modifica `src/brand-book.html` y `src/styles.css`, luego regenera. Las imagenes
viven en `src/img/` (copia de `public/images/`).

## Imprimir la tarjeta de visita

El archivo `Madcry-Business-Card-Print.pdf` esta listo para imprenta:
- Tamano final: **85 × 55 mm**
- Sangrado: **3 mm** por cada lado (papel impreso 91 × 61 mm)
- Marcas de corte incluidas en las esquinas
- 2 caras (anverso + reverso)
- Fondo a sangre

Acabados recomendados:
- Anverso: papel mate negro 350g, tinta blanca, barniz spot UV en el simbolo
- Reverso: blanco impresion offset
- Esquinas vivas (no redondeadas)
