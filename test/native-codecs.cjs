// Dedicated checks for the newly source-built engine, not an app feature list.
const sharp=require('sharp'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.FP_CODEC_OUT||path.resolve(__dirname,'../work/full-native-rebuild/codec-results');
const checks=[];
const check=async(name,fn)=>{try{const detail=await fn();checks.push({name,passed:true,detail});}catch(e){checks.push({name,passed:false,error:e.stack});}};
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const pixels=Buffer.alloc(128*96*3);for(let y=0;y<96;y++)for(let x=0;x<128;x++){const i=(y*128+x)*3;pixels[i]=x<64?240:10;pixels[i+1]=20;pixels[i+2]=x<64?10:240;}
 for(const format of ['jpeg','png','webp','tiff','avif','gif'])await check(format+' encode/decode known colour grid',async()=>{
  const file=path.join(out,'grid.'+format);await sharp(pixels,{raw:{width:128,height:96,channels:3}}).toFormat(format).toFile(file);
  const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height,info.channels],[128,96,3]);
  const left=(40*128+20)*3,right=(40*128+100)*3;
  assert.ok(data[left]>200&&data[left+2]<50);assert.ok(data[right]<50&&data[right+2]>200);
  return {bytes:(await fs.stat(file)).size,width:info.width,height:info.height};
 });
 await check('librsvg rasterizes vector geometry',async()=>{
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#e62832"/><circle cx="40" cy="30" r="10" fill="#163cff"/></svg>');
  const file=path.join(out,'vector.png');await sharp(svg).png().toFile(file);
  const{data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,80);assert.ok(data[(30*80+40)*3+2]>200);
 });
 await check('Pango/Harfbuzz/FreeType/Cairo text rendering',async()=>{
  const result=await sharp({text:{text:'File Pojangmacha 012345',font:'sans 28',rgba:true}}).png().toFile(path.join(out,'text.png'));
  assert.ok(result.width>100&&result.height>10);const stats=await sharp(path.join(out,'text.png')).stats();assert.ok(stats.channels.some(c=>c.stdev>1));return result;
 });
 await check('ICC conversion and EXIF metadata',async()=>{
  const jpeg=await sharp(pixels,{raw:{width:128,height:96,channels:3}}).withIccProfile('p3').withMetadata({orientation:6}).jpeg().toBuffer();
  const meta=await sharp(jpeg).metadata();assert.equal(meta.orientation,6);assert.ok(meta.icc.length>100);
  const result=await sharp(jpeg).autoOrient().withIccProfile('srgb').png().toFile(path.join(out,'oriented-srgb.png'));assert.deepEqual([result.width,result.height],[96,128]);
 });
 await check('PNG palette quantization and transparent pixels',async()=>{
  const f=path.join(out,'palette.png');await sharp({create:{width:60,height:90,channels:4,background:{r:20,g:40,b:200,alpha:0.25}}}).png({palette:true}).toFile(f);
  const m=await sharp(f).metadata();assert.ok(m.isPalette&&m.hasAlpha);const p=await sharp(f).raw().toBuffer();assert.ok(p[3]>50&&p[3]<80);
 });
 const report={utc:new Date().toISOString(),purpose:'native rebuild regression; formats beyond the app allowlist are not advertised app features',checks,allPassed:checks.every(c=>c.passed)};
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=report.allPassed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
