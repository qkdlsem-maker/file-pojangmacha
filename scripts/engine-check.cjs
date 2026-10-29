// Uses only the runtime and modules inside the installed application.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {Worker} = require('node:worker_threads');
const archive = path.join(process.env.FP_INSTALL, 'resources', 'app.asar');
const packaged = createRequire(path.join(archive, 'package.json'));
const sharp = packaged('sharp');
const {PDFDocument} = packaged('pdf-lib');
const {runJob, inspect} = packaged('./src/core.cjs');
const dir = path.resolve(process.env.FP_RESULTS);
const checks = [];
const check = async (name, fn) => {
  try { await fn(); checks.push({name, passed:true}); }
  catch (e) { checks.push({name, passed:false, error:e.stack}); }
};
const hash = async f => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
(async () => {
  await fs.mkdir(dir, {recursive:true});
  const input = path.join(dir, 'inputs'), output = path.join(dir, 'outputs');
  await fs.mkdir(input, {recursive:true}); await fs.mkdir(output, {recursive:true});
  const red = path.join(input, '한글 공백 '+ '긴이름'.repeat(20) +'.jpg');
  const alpha = path.join(input, '투명 세로.png');
  const rotated = path.join(input, '회전 EXIF.jpg');
  await sharp({create:{width:800,height:400,channels:3,background:'red'}}).jpeg().toFile(red);
  await sharp({create:{width:200,height:400,channels:4,background:{r:0,g:0,b:255,alpha:0.4}}}).png().toFile(alpha);
  await sharp({create:{width:800,height:400,channels:3,background:'green'}}).withMetadata({orientation:6}).jpeg().toFile(rotated);
  const originals = await Promise.all([red,alpha,rotated].map(hash));
  const image = p => ({kind:'image',path:p});
  const page = (p,n) => ({kind:'pdf',path:p,page:n});
  const job = (mode,entries,settings={},name='검증 결과') => ({mode,entries,settings,name,folder:output});
  await check('Korean long names, EXIF orientation and alpha preview', async () => {
    assert.equal((await inspect(red)).width,800);
    const r = await inspect(rotated); assert.deepEqual([r.width,r.height],[400,800]);
    assert.ok((await inspect(alpha)).thumb.startsWith('data:image/png'));
  });
  let twenty;
  await check('Packaged worker produces 20 pages and real progress', async () => {
    const events=[];
    twenty = await new Promise((resolve,reject) => {
      const worker = new Worker(path.join(archive,'src/worker.cjs'), {workerData:{
        cancel:new SharedArrayBuffer(4), job:job('photo',Array.from({length:20},(_,i)=>image(i%2?rotated:red)),{orientation:'auto'},'사진 스무 장')
      }});
      const timeout=setTimeout(()=>{worker.terminate();reject(Error('Worker timeout'));},120000);
      worker.on('message', m=>{events.push(m);if(m.type==='done'){clearTimeout(timeout);resolve(m.files[0]);}if(m.type==='error'){clearTimeout(timeout);reject(Error(m.error));}});
      worker.on('error',e=>{clearTimeout(timeout);reject(e);});
      worker.on('exit',code=>{if(code!==0){clearTimeout(timeout);reject(Error('Worker exit '+code));}});
    });
    const pdf=await PDFDocument.load(await fs.readFile(twenty)); assert.equal(pdf.getPageCount(),20);
    assert.ok(pdf.getPage(0).getWidth()>pdf.getPage(0).getHeight());
    assert.ok(pdf.getPage(1).getWidth()<pdf.getPage(1).getHeight());
    assert.deepEqual(events.filter(e=>e.phase==='pages').map(e=>e.done),Array.from({length:20},(_,i)=>i+1));
  });
  await check('PDF selected order and split',async()=>{
    assert.ok(twenty); const [merged]=await runJob(job('merge',[page(twenty,1),page(twenty,0)],{},'순서 확인'));
    const p=await PDFDocument.load(await fs.readFile(merged));assert.equal(p.getPageCount(),2);
    assert.ok(p.getPage(0).getHeight()>p.getPage(0).getWidth());
    const files=await runJob(job('extract',[page(twenty,3),page(twenty,7)],{split:true},'선택한 쪽'));
    assert.equal(files.length,2);for(const f of files)assert.equal((await PDFDocument.load(await fs.readFile(f))).getPageCount(),1);
  });
  await check('Resize keeps alpha and aspect ratio',async()=>{
    const [f]=await runJob(job('resize',[image(alpha)],{edge:100,format:'png'}));
    const m=await sharp(f).metadata();assert.deepEqual([m.width,m.height,m.hasAlpha],[50,100,true]);
  });
  await check('Installed JPEG PNG WebP TIFF codecs decode valid outputs',async()=>{
    for(const format of ['jpeg','png','webp','tiff']){
      const f=path.join(input,'코덱.'+format);await sharp(red).toFormat(format).toFile(f);
      const m=await sharp(f).metadata();assert.equal(m.width,800);assert.equal((await sharp(f).raw().toBuffer()).length,800*400*3);
    }
  });
  await check('Existing output is preserved',async()=>{
    const j=job('photo',[image(red)],{},'이름 충돌');const [a]=await runJob(j),before=await hash(a);const[b]=await runJob(j);
    assert.notEqual(a,b);assert.equal(await hash(a),before);
  });
  await check('Cancellation leaves no partial files and retry works',async()=>{
    let canceled=false;await assert.rejects(runJob(job('extract',[page(twenty,0),page(twenty,1)],{split:true},'취소 검사'),()=>{canceled=true;},()=>canceled),e=>e.code==='CANCELED');
    assert.equal((await fs.readdir(output)).filter(f=>f.includes('취소 검사')||f.endsWith('.partial')).length,0);
    assert.equal((await runJob(job('photo',[image(red)],{},'재시도'))).length,1);
  });
  await check('Corrupt input and invalid destination fail clearly',async()=>{
    const broken=path.join(input,'손상.pdf');await fs.writeFile(broken,'not PDF');await assert.rejects(inspect(broken),/손상/);
    await assert.rejects(runJob({...job('photo',[image(red)]),folder:path.join(output,'missing')}));
  });
  await check('All original inputs are unchanged',async()=>{assert.deepEqual(await Promise.all([red,alpha,rotated].map(hash)),originals);});
  const report={utc:new Date().toISOString(),method:'installed Electron runtime and packaged app modules; GUI drag and viewer tests are separate',archive,versions:process.versions,nativeVersions:sharp.versions,checks,allPassed:checks.every(c=>c.passed),rssMB:Math.round(process.memoryUsage().rss/1048576)};
  await fs.writeFile(path.join(dir,'engine-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({allPassed:report.allPassed,checks:checks.length,results:dir}));process.exitCode=report.allPassed?0:1;
  // Optional test-only pause lets the host inspect actual loaded DLL paths.
  const hold=Number(process.env.FP_HOLD_AFTER_TEST_MS||0);
  if(hold>0&&hold<=30000)await new Promise(resolve=>setTimeout(resolve,hold));
})().catch(async e=>{await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'engine-fatal.txt'),e.stack);console.error(e);process.exitCode=1;});
