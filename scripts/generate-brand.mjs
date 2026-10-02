import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const mark = await readFile(new URL('../assets/brand/icon.svg', import.meta.url), 'utf8');
const publicDir = new URL('../public/', import.meta.url);
await mkdir(publicDir, { recursive: true });
await writeFile(new URL('icon.svg', publicDir), mark);
await writeFile(new URL('favicon.svg', publicDir), mark);
const png = size => new Resvg(mark, { fitTo: { mode: 'width', value: size } }).render().asPng();
for (const [name, size] of [['favicon.png',96],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]) await writeFile(new URL(name,publicDir),png(size));
const sizes = [16,32,48], images=sizes.map(png), header=Buffer.alloc(6+16*sizes.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((image,index)=>{const start=6+16*index;header[start]=sizes[index];header[start+1]=sizes[index];header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);header.writeUInt32LE(image.length,start+8);header.writeUInt32LE(offset,start+12);offset+=image.length;});
await writeFile(new URL('favicon.ico',publicDir),Buffer.concat([header,...images]));
const card = await readFile(new URL('../assets/brand/social-card.svg',import.meta.url),'utf8');
await writeFile(new URL('social-card.png',publicDir),new Resvg(card,{font:{loadSystemFonts:true,fontFiles:['/System/Library/Fonts/Supplemental/Arial Unicode.ttf','/System/Library/Fonts/HelveticaNeue.ttc','/System/Library/Fonts/STHeiti Medium.ttc']}}).render().asPng());
console.log('Generated vector icon, browser icons, home-screen icons, and 1200×630 share card.');
