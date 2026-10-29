const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'..');
(async()=>{
 await fs.mkdir(path.join(root,'assets'),{recursive:true});
 const icon=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect x="8" y="8" width="240" height="240" rx="55" fill="#53644e"/><path d="M37 58H219V101H37Z" fill="#b83e31"/><path d="M37 93H219V115H37Z" fill="#f5d5a1"/><path d="M37 93H63V115H37ZM89 93H115V115H89ZM141 93H167V115H141ZM193 93H219V115H193Z" fill="#b83e31"/><path d="M77 132H181L176 220H82Z" fill="#edc58b" stroke="#352e23" stroke-width="7"/><path d="M105 137V128C105 99 151 99 151 128V137" fill="none" stroke="#352e23" stroke-width="7"/><path d="M104 163H151M104 179H140M104 195H151" stroke="#ad3c2c" stroke-width="8" stroke-linecap="round"/></svg>`);
 await fs.writeFile(path.join(root,'assets/icon.svg'),icon);
 const png=await sharp(icon).png().toBuffer();await fs.writeFile(path.join(root,'assets/icon.png'),png);
 await sharp(icon).resize(64).png().toFile(path.join(root,'assets/drag.png'));
 const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=0;header[7]=0;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await fs.writeFile(path.join(root,'assets/icon.ico'),Buffer.concat([header,png]));
 const demo=path.join(root,'work','demo-inputs');await fs.mkdir(demo,{recursive:true});
 const colors=[['#f1b584','#7e8b55','#465f48'],['#aecdd1','#737c8d','#415860'],['#e8b8ac','#ac6957','#5c725c'],['#d6c590','#869b6d','#48675a'],['#b1bdce','#bb9784','#6f665e']];
 for(let i=0;i<20;i++){
  const [sky,back,front]=colors[i%5],w=i%3===0?1400:1800,h=i%3===0?1800:1200;
  // Original vector travel postcards, rasterized as actual image input files.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#faf0d7"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".08"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><rect width="900" height="600" fill="url(#s)"/><circle cx="${160+i*23}" cy="${120+i%4*20}" r="60" fill="#fff0c9"/><path d="M0 340L130 210L250 320L420 150L600 330L750 230L900 330V600H0" fill="${back}"/><path d="M0 410L150 350L330 430L540 300L780 420L900 360V600H0" fill="${front}"/><path d="M0 485Q250 400 480 490T900 480V600H0" fill="#d3c49e"/><path d="M0 530Q210 460 450 530T900 525V600H0" fill="#8ba9a0"/><rect x="550" y="345" width="100" height="90" fill="#f2ddbb"/><path d="M534 351L600 303L666 351Z" fill="#a8503d"/><rect x="590" y="386" width="22" height="49" fill="#5c6552"/><rect width="900" height="600" fill="transparent" filter="url(#grain)"/><text x="45" y="545" font-family="sans-serif" font-size="17" fill="#fff5df" letter-spacing="5">SLOW TRIP / ${String(i+1).padStart(2,'0')}</text><text x="45" y="574" font-family="sans-serif" font-size="11" fill="#fff5df" letter-spacing="2">ORIGINAL DEMO POSTCARD · FILE POJANGMACHA</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({quality:94}).toFile(path.join(demo,`${String(i+1).padStart(2,'0')} 제주 여행 엽서.jpg`));
 }
 console.log('Original app assets and 20 demonstration image files prepared.');
})();
