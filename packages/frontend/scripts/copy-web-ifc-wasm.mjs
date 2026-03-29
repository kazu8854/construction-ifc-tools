/**
 * web-ifc の WASM を public に置き、SetWasmPath とファイル名（web-ifc.wasm）を一致させる。
 * unpkg 経由だと JS/WASM の版ズレやネットワーク依存で Module 初期化が壊れることがある。
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const destDir = join(here, '../public/web-ifc');
const pkgRoot = dirname(require.resolve('web-ifc'));

mkdirSync(destDir, { recursive: true });
for (const name of ['web-ifc.wasm', 'web-ifc-mt.wasm']) {
  copyFileSync(join(pkgRoot, name), join(destDir, name));
}
console.log('copied web-ifc wasm → public/web-ifc/');
