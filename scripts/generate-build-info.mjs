import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBuildInfo,renderBuildInfo} from './build-info.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const version=JSON.parse(await readFile(resolve(root,'app-version.json'),'utf8'));
const output=resolve(root,process.argv[2]||'build-info.json');
const info=createBuildInfo(version);
await writeFile(output,renderBuildInfo(info),'utf8');
console.log(`Metadatos de build listos: ${info.version}+${info.build} ${info.channel} ${info.commit.slice(0,7)}.`);
