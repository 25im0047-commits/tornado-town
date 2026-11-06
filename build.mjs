import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
const read = p => readFile(new URL(p, import.meta.url), 'utf8');
const [template, css, vendor, core, main, notices, juice, audio] = await Promise.all([
  read('src/index.html'), read('src/style.css'), read('vendor/three.min.js'), read('src/core.mjs'), read('src/main.js'), read('THIRD_PARTY_NOTICES.txt'), read('src/juice.js'), read('src/audio.js'),
]);
const names = [...core.matchAll(/^export (?:const|function|class) (\w+)/gm)].map(m => m[1]);
const coreCode = `const CORE = (() => {${core.replace(/^export /gm, '')}; return {${names.join(',')}};})();`;
const code = `(()=>{${vendor}\n${coreCode}\n${juice}\n${audio}\n${main}\n})();`.replace(/<\/script/gi, '<\\/script');
new vm.Script(code, { filename: 'game-bundle.js' });
const html = template.replace('/* INLINE_STYLE */', () => css).replace('/* INLINE_GAME */', () => code).replace('</head>', () => `<!--\n${notices}\n-->\n</head>`);
await mkdir(new URL('dist', import.meta.url), { recursive: true });
await writeFile(new URL('dist/index.html', import.meta.url), html);
await writeFile(new URL('TORNADO-TOWN.html', import.meta.url), html);
console.log(`Built standalone game: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
