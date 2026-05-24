import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const assets = [
  ['nodes/Peedief/peedief.svg', 'dist/credentials/peedief.svg'],
  ['nodes/Peedief/Peedief.node.json', 'dist/nodes/Peedief/Peedief.node.json'],
  ['nodes/Peedief/peedief.svg', 'dist/nodes/Peedief/peedief.svg'],
];

for (const [source, target] of assets) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(process.cwd(), source), join(process.cwd(), target));
}
