// Genera dist-web/index.html: una sola página con todo incrustado (vista previa web).
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
const out = path.join(__dirname, '..', 'dist-web');
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(src, 'assets', 'logo.png')).toString('base64');
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/i, '');
html = html.replace(/<link rel="icon"[^>]*>/i, `<link rel="icon" href="${logo}">`);
html = html.replace(/<link rel="stylesheet" href="styles.css">/i, () =>
  '<style>' + fs.readFileSync(path.join(src, 'styles.css'), 'utf8').split('assets/logo.png').join(logo) + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) =>
  '<script>' + fs.readFileSync(path.join(src, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
html = html.split('assets/logo.png').join(logo);
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('OK dist-web/index.html', (html.length / 1024).toFixed(0) + ' KB');
