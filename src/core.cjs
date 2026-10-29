const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
sharp.cache({ memory: 64, files: 0, items: 30 });
sharp.concurrency(2);
const imageExts = new Set(['.jpg','.jpeg','.png','.webp','.tif','.tiff']);
const MAX_FILE = 150 * 1024 * 1024;
function friendly(error) {
  if (error.code === 'CANCELED') return '주문을 취소했습니다. 원본은 그대로입니다.';
  if (/encrypted/i.test(error.message)) return '암호로 보호된 PDF입니다. PDF 뷰어에서 암호를 해제한 사본을 저장한 뒤 넣어 주세요.';
  if (['EACCES','EPERM'].includes(error.code)) return '파일에 접근하거나 저장할 권한이 없습니다. 파일 사용 여부를 확인하고 쓰기 가능한 폴더를 선택해 주세요.';
  if (error.code === 'ENOSPC') return '저장 공간이 부족합니다. 디스크 공간을 확보한 뒤 다시 주문해 주세요.';
  if (error.code === 'ENOENT') return '파일 또는 폴더를 찾을 수 없습니다. 이동·삭제 여부를 확인하고 다시 선택해 주세요.';
  if (['ENOTSUP','EXDEV','EOPNOTSUPP'].includes(error.code)) return '이 저장 장치에서는 안전한 저장을 지원하지 않습니다. Windows 로컬 디스크의 폴더를 선택해 주세요.';
  return error.message || '파일을 처리하지 못했습니다. 다른 사본으로 다시 시도해 주세요.';
}
async function loadPdf(file) {
  try { return await PDFDocument.load(await fs.readFile(file), { updateMetadata: false }); }
  catch (e) { if (/encrypted/i.test(e.message)) throw e; throw new Error('PDF를 읽을 수 없습니다. 손상되었거나 올바른 PDF가 아닙니다. 다른 뷰어에서 다시 저장한 사본을 사용해 주세요.'); }
}
async function inspect(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile()) throw new Error('폴더는 재료로 넣을 수 없습니다. 안의 파일을 선택해 주세요.');
  if (stat.size > MAX_FILE) throw new Error('파일 하나는 150MB까지 받습니다. 더 작은 사본을 사용해 주세요.');
  const ext = path.extname(file).toLowerCase();
  const base = { id: crypto.randomUUID(), path: file, name: path.basename(file), bytes: stat.size };
  if (ext === '.pdf') {
    const pdf = await loadPdf(file);
    if (!pdf.getPageCount() || pdf.getPageCount() > 400) throw new Error('PDF는 1~400페이지까지 받습니다. 작은 파일로 나누어 주세요.');
    return { ...base, kind: 'pdf', pages: pdf.getPages().map(p=>({width:p.getWidth(),height:p.getHeight()})) };
  }
  if (!imageExts.has(ext)) throw new Error('이 재료는 아직 안 받습니다. JPG, PNG, WebP, TIFF 또는 PDF를 넣어 주세요.');
  try {
    const metadata = await sharp(file, { limitInputPixels: 80000000 }).metadata();
    if ((metadata.pages || 1) > 1) throw new Error('여러 프레임 이미지입니다. 한 장짜리 이미지로 변환해 주세요.');
    const rotate = [5,6,7,8].includes(metadata.orientation);
    const thumb = await sharp(file, { limitInputPixels: 80000000 }).autoOrient().resize(420,420,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
    return { ...base, kind: 'image', width: rotate ? metadata.height : metadata.width, height: rotate ? metadata.width : metadata.height, thumb: 'data:image/png;base64,' + thumb.toString('base64') };
  } catch(e) { if (/프레임/.test(e.message)) throw e; throw new Error('이미지를 읽을 수 없습니다. 손상 여부와 형식을 확인해 주세요. 이미지는 8천만 화소 이하로 넣어 주세요.'); }
}
function settingsFor(mode, raw = {}) {
  const n = (v, fallback, min, max) => { const x=Number(v ?? fallback); if (!Number.isFinite(x) || x < min || x > max) throw new Error('설정값이 허용 범위를 벗어났습니다.'); return Math.round(x); };
  return { paper: ['A4','A5','Letter'].includes(raw.paper) ? raw.paper : 'A4', orientation: ['portrait','landscape','auto'].includes(raw.orientation) ? raw.orientation : 'auto', margin: n(raw.margin,10,0,30), resizeMode: raw.resizeMode === 'box' ? 'box' : 'edge', edge:n(raw.edge,1600,16,10000), width:n(raw.width,1600,16,10000), height:n(raw.height,1600,16,10000), upscale:raw.upscale === true, format:raw.format === 'jpg' ? 'jpg':'png', split:raw.split === true };
}
function safeName(input, fallback='포장한 파일') {
  let s=String(input || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').replace(/[. ]+$/,'').trim().slice(0,100);
  if (!s || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(s)) s='포장한 파일';
  return s;
}
async function runJob(job, progress=()=>{}, isCanceled=()=>false) {
  const staged=[], published=[];
  const check=()=>{if(isCanceled()){const e=new Error('취소');e.code='CANCELED';throw e;}};
  const s=settingsFor(job.mode,job.settings);
  const { pageLayout, resizeDimensions } = await import('./layout.mjs');
  if (!['photo','merge','extract','resize'].includes(job.mode)) throw new Error('알 수 없는 주문입니다.');
  if (!job.entries?.length || job.entries.length>400) throw new Error('재료를 1~400개 선택해 주세요.');
  const folder=path.resolve(job.folder);
  const originals=new Set(job.entries.map(e=>path.resolve(e.path).toLowerCase()));
  const stage=async(name,data)=>{
    check(); const temp=path.join(folder,'.file-pojangmacha-'+crypto.randomUUID()+'.partial');
    const parsed=path.parse(name);
    staged.push({temp,name:safeName(parsed.name)+parsed.ext}); const handle=await fs.open(temp,'wx');
    try {await handle.writeFile(data);await handle.sync();} finally {await handle.close();}
    check();
  };
  const total=job.entries.length;
  try {
    check();
    if (job.mode === 'resize') {
      for (let i=0;i<total;i++) {
        check(); const e=job.entries[i]; if(e.kind!=='image') throw new Error('이미지 크기 변경에는 사진만 넣어 주세요.');
        const meta=await sharp(e.path).metadata(); const swap=[5,6,7,8].includes(meta.orientation);
        const d=resizeDimensions(swap?meta.height:meta.width,swap?meta.width:meta.height,s);
        const baseW=swap?meta.height:meta.width,baseH=swap?meta.width:meta.height;
        const byWidth=s.resizeMode==='box'?s.width/baseW<=s.height/baseH:baseW>=baseH;
        let pipeline=sharp(e.path,{limitInputPixels:80000000}).autoOrient().resize(byWidth?{width:d.width}:{height:d.height});
        pipeline=s.format==='jpg'?pipeline.flatten({background:'#ffffff'}).jpeg({quality:92}):pipeline.png();
        await stage(safeName(path.parse(e.name||e.path).name)+'_'+d.width+'x'+d.height+'.'+s.format,await pipeline.toBuffer());
        progress({done:i+1,total,phase:'resize',message:`${i+1}/${total}장 규격에 맞추는 중`});
      }
    } else {
      let output=await PDFDocument.create(); output.setCreator('파일 포장마차'); output.setProducer('파일 포장마차 · pdf-lib');
      let lastSource=null, source=null;
      for(let i=0;i<total;i++) {
        check(); const e=job.entries[i];
        if (job.mode==='photo') {
          if(e.kind!=='image') throw new Error('사진 PDF에는 사진만 넣어 주세요. PDF는 합치기 메뉴를 이용해 주세요.');
          const photo=await sharp(e.path,{limitInputPixels:80000000}).autoOrient().resize(4000,4000,{fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:94}).toBuffer();
          check(); const embed=await output.embedJpg(photo); const l=pageLayout(embed.width,embed.height,s);
          output.addPage([l.width,l.height]).drawImage(embed,{x:l.x,y:l.y,width:l.imageWidth,height:l.imageHeight});
        } else {
          if(e.kind!=='pdf') throw new Error('이 주문에는 PDF만 넣어 주세요.');
          if(lastSource!==e.path){source=await loadPdf(e.path);lastSource=e.path;}
          if(!Number.isInteger(e.page) || e.page<0 || e.page>=source.getPageCount()) throw new Error('선택한 페이지가 없습니다. 파일을 다시 넣어 주세요.');
          const [page]=await output.copyPages(source,[e.page]);output.addPage(page);
        }
        if(job.mode==='extract' && s.split) {
          await stage(safeName(job.name)+`_${String(i+1).padStart(3,'0')}.pdf`,await output.save());
          output=await PDFDocument.create();
        }
        progress({done:i+1,total,phase:'pages',message:`${i+1}/${total}쪽 포장 중`});
      }
      if(!(job.mode==='extract' && s.split)) {check();await stage(safeName(job.name)+'.pdf',await output.save());}
    }
    check();progress({done:total,total,phase:'save',message:'완성된 파일 저장 중'});
    for(const item of staged) {
      check();const {name,ext}=path.parse(item.name);
      for(let n=0;n<10000;n++) {
        const target=path.join(folder,n?`${name} (${n})${ext}`:item.name);
        if(originals.has(target.toLowerCase()))continue;
        try { await fs.link(item.temp,target);published.push(target); break; }
        catch(e) { if(e.code==='EEXIST')continue; throw e; }
      }
      if(!published.length || published.length < staged.indexOf(item)+1)throw new Error('같은 이름의 파일이 너무 많습니다. 다른 이름을 사용해 주세요.');
    }
    return published;
  } catch(e) { for(const file of published)await fs.unlink(file).catch(()=>{}); throw e; }
  finally {for(const item of staged)await fs.unlink(item.temp).catch(()=>{});}
}
module.exports={inspect,runJob,friendly,settingsFor,safeName,loadPdf};
