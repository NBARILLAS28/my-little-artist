# 🎨 My Little Artist

Programa de dibujo tipo **Paint** hecho para niños: colorido, animado, con mascota (Arti), sonidos, páginas para colorear y herramientas mágicas. Funciona sin internet y se instala en **Mac (.dmg)** y **Windows (.exe)**.

## Qué incluye

- **Pinceles:** lápiz, pincel, marcador, crayón, spray, arcoíris, brillantina, neón y borrador.
- **Formas:** línea, rectángulo, elipse, triángulo, estrella, corazón, rombo y flecha (contorno, relleno o ambos).
- **Como Paint:** bote de pintura (respeta las líneas), texto, cuentagotas, tijeras (seleccionar, mover, voltear, girar, escalar, copiar y pegar), zoom, mano para desplazar, deshacer/rehacer, tamaño de lienzo.
- **Extras para niños:** simetría mágica (espejo, 4 lados, mandala, caleidoscopio), sellos y emojis, 11 libros para colorear, 10 fondos de papel, sonidos y confeti.
- **Guardar y exportar:** exporta **PNG o JPG**, copia al portapapeles, imprime, abre imágenes existentes, galería propia y **autoguardado** (nunca se pierde un dibujo).
- Click derecho pinta con el segundo color; soporta lápiz óptico con presión.
- Español e inglés.

## Compatibilidad

| Sistema | Versión mínima |
|---|---|
| macOS | 11 Big Sur o más nuevo (Intel y Apple Silicon, instalador universal) |
| Windows | 10 o más nuevo (64 bits) |

Se fija Electron 33 (LTS estable), que cubre equipos de hasta ~4-5 años y los más recientes. **Windows 7/8 y macOS 10.15 o anterior no son compatibles con Electron 33.** Si necesitas esos equipos, se puede generar una versión "legacy" con Electron 22 (último que soporta Win 7/8/8.1) cambiando la versión en `package.json`.

## Cómo crear los instaladores

### Opción A: GitHub Actions (recomendada, no necesitas Mac)
1. Crea un repositorio en GitHub y sube esta carpeta.
2. Ve a **Actions → Build My Little Artist → Run workflow** (o haz push a `main`).
3. Al terminar, descarga los instaladores desde **Artifacts** (`.dmg` de Mac y `.exe` de Windows).
4. Para publicar una versión: crea un tag `v1.0.0` y se adjuntan a un *Release* automáticamente.

### Opción B: en tu propio equipo
Necesitas [Node.js LTS](https://nodejs.org).
- **Mac:** doble clic en `scripts/build-mac.command` (el `.dmg` queda en `release/`). Si macOS no lo deja abrir: clic derecho → Abrir.
- **Windows:** doble clic en `scripts/build-windows.bat` (el instalador queda en `release/`).
- O por terminal: `npm install` y luego `npm run dist:mac`, `npm run dist:win` o `npm run dist`.

> El `.dmg` solo se puede crear en un Mac (o en el runner macOS de GitHub). El `.exe` se crea en Windows (o en el runner de GitHub).

### Probar sin instalar
- `npm install && npm start` abre la app de escritorio.
- `npm run web` genera `dist-web/index.html`, una sola página que abre en cualquier navegador.

## Avisos de seguridad al instalar (normal en apps sin firmar)

- **Mac (Gatekeeper):** al abrir por primera vez, clic derecho sobre la app → **Abrir** → Abrir. Si dice "dañada": en Terminal `xattr -cr "/Applications/My Little Artist.app"`.
- **Windows (SmartScreen):** clic en **Más información → Ejecutar de todas formas**.

Para eliminar estos avisos se necesita firmar: cuenta de Apple Developer (USD 99/año) para firmar y notarizar en Mac, y un certificado de firma de código en Windows. El workflow ya está preparado: solo hay que agregar los secretos de firma de electron-builder.

## Estructura

```
main.js / preload.js   Proceso principal y puente seguro (guardar, abrir, imprimir, portapapeles)
src/                   Interfaz (HTML, CSS, JS sin dependencias)
build/                 Icono, logo y fondo del .dmg
scripts/               Compilación local y generador de la versión web
.github/workflows/     Compilación automática .dmg y .exe
```

## Atajos

P lápiz · B pincel · M marcador · C crayón · E borrador · G bote · T texto · L línea · R rectángulo · O elipse · I cuentagotas · S tijeras · `[` `]` tamaño · Espacio + arrastrar = mover el papel · Ctrl/Cmd+Z deshacer · Ctrl/Cmd+S guardar · Ctrl/Cmd+E exportar.
