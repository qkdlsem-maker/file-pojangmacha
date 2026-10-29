const {app,BrowserWindow,ipcMain,dialog,shell,screen,nativeImage,session,clipboard}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {Worker}=require('node:worker_threads');
const {inspect,friendly,settingsFor}=require('./core.cjs');
const {LocalStore,parseFileArgs}=require('./local-store.cjs');
const crypto=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
let win,active=null,pinned=false,compact=true,expandedBounds,importBusy=false,quitting=false,dialogBusy=false;
const inputs=new Map(),outputs=new Set();
const pastedFiles=new Set();let cleaningUp=false;
const appURL=pathToFileURL(path.join(__dirname,'../dist/index.html')).href;
let store,lastBatchFinished=false,rendererReady=false,pendingPaths=parseFileArgs(process.argv.slice(app.isPackaged?1:2));
const defaultFolder=()=>path.join(app.getPath('downloads'),'파일 포장마차');
const send=(channel,data)=>{if(win&&!win.isDestroyed())win.webContents.send(channel,data);};
const isAppURL=url=>{try{return fileURLToPath(url).toLowerCase()===fileURLToPath(appURL).toLowerCase();}catch{return false;}};
const trusted=(e)=>{if(e.sender!==win?.webContents || e.senderFrame!==win.webContents.mainFrame || !isAppURL(e.senderFrame?.url))throw new Error('허용하지 않은 요청입니다. 앱을 다시 시작해 주세요.');};
function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{try{trusted(e);return await fn(...args);}catch(error){return{error:friendly(error)};}});}
function expand(value) {
  compact=!value;const area=screen.getDisplayMatching(win.getBounds()).workArea;
  if(value){const b=expandedBounds || {width:Math.min(1180,area.width-40),height:Math.min(840,area.height-40)};
    const old=win.getBounds();win.setResizable(true);win.setMinimumSize(840,620);
    win.setBounds({x:Math.max(area.x,Math.min(old.x,area.x+area.width-b.width)),y:Math.max(area.y,Math.min(old.y,area.y+area.height-b.height)),width:b.width,height:b.height});
  }else{expandedBounds=win.getBounds();win.setMinimumSize(320,290);win.setSize(320,290);win.setResizable(false);}
  send('view',{compact});
}
async function addFiles(paths,{replace=false}={}){
  if(active||importBusy)return {error:'현재 주문을 마친 뒤 재료를 추가해 주세요.'};
  if(!Array.isArray(paths)||paths.length>120)return {error:'한 번에 파일 120개까지 넣어 주세요.'};
  const existing=replace?[]:[...inputs.values()],seen=new Set(existing.map(f=>path.resolve(f.path).toLowerCase()));let skipped=0;
  paths=paths.filter(p=>{if(typeof p!=='string'||!path.isAbsolute(p))return false;const key=path.resolve(p).toLowerCase();if(seen.has(key)){skipped++;return false;}seen.add(key);return true;});
  if(existing.length+paths.length>120)return {error:'조리대에는 파일 120개까지 올릴 수 있습니다. 먼저 비워 주세요.'};
  importBusy=true;const files=[],errors=[];let bytes=existing.reduce((n,f)=>n+f.bytes,0),count=existing.reduce((n,f)=>n+(f.kind==='pdf'?f.pages.length:1),0);
  try{for(let i=0;i<paths.length;i++){
    send('import-progress',{done:i,total:paths.length});
    try{const f=await inspect(paths[i]),pages=f.kind==='pdf'?f.pages.length:1;
      if(bytes+f.bytes>300*1024*1024)throw Error('조리대 전체 재료는 300MB까지 받습니다. 나누어 넣어 주세요.');
      if(count+pages>400)throw Error('조리대에는 사진과 PDF 쪽을 합쳐 400개까지 올릴 수 있습니다. 먼저 비워 주세요.');
      bytes+=f.bytes;count+=pages;files.push(f);
    }catch(e){errors.push({name:path.basename(paths[i]),error:friendly(e)});}
  }}finally{importBusy=false;send('import-progress',null);}
  if(files.length){if(replace)inputs.clear();for(const f of files)inputs.set(f.id,f);lastBatchFinished=false;}
  if(files.length||errors.length)expand(true);
  return {files:files.map(({path:_,...f})=>f),errors,skipped,reset:replace&&files.length>0};
}
async function receiveExternal(paths){
 if(!paths.length)return;
 if(!rendererReady){pendingPaths.push(...paths);return;}
 send('incoming-files',await addFiles(paths,{replace:lastBatchFinished}));
}
const allowedOutput=file=>typeof file==='string'&&(outputs.has(file)||store.allowed(file));
async function checkedOutput(file){if(!allowedOutput(file))throw Error('완성 기록에 있는 파일만 열 수 있습니다.');try{if(!(await fs.stat(file)).isFile())throw Error();}catch{throw Error('파일이 이동되거나 삭제됐습니다. 저장했던 폴더를 확인해 주세요. 기록을 지워도 실제 파일은 삭제되지 않습니다.');}return file;}
function wire(){
  handle('pick',async(options={})=>{if(dialogBusy||active||importBusy)return {files:[],errors:[]};dialogBusy=true;try{const r=await dialog.showOpenDialog(win,{title:'포장할 재료 선택',properties:['openFile','multiSelections'],filters:[{name:'사진과 PDF',extensions:['jpg','jpeg','png','webp','tif','tiff','pdf']},{name:'모든 파일',extensions:['*']}]});return r.canceled?{files:[],errors:[]}:await addFiles(r.filePaths,{replace:options.replace===true});}finally{dialogBusy=false;}});
  handle('add',addFiles);
  handle('paste-image',async(options={})=>{
    if(active||importBusy||dialogBusy)throw Error('열린 선택 창이나 현재 주문을 마친 뒤 붙여넣어 주세요.');
    // Read only after the user's Paste action. Never poll the clipboard.
    const items=await clipboard.read();
    let image=nativeImage.createEmpty();
    for(const item of items){
      const type=['image/png','image/jpeg','image/webp'].find(t=>item.types.includes(t));
      if(!type)continue;
      const blob=await item.getType(type);
      if(blob.size>150*1024*1024)throw Error('복사한 이미지는 150 MB 이하로 넣어 주세요.');
      image=nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      if(!image.isEmpty())break;
    }
    if(image.isEmpty())throw Error('복사한 이미지가 없습니다. 스크린샷이나 사진을 복사한 뒤 Ctrl+V를 눌러 주세요.');
    const size=image.getSize();if(size.width*size.height>80000000)throw Error('이미지는 8천만 화소 이하로 붙여넣어 주세요.');
    const file=path.join(app.getPath('temp'),'file-pojangmacha-paste-'+crypto.randomUUID()+'.png');
    await fs.writeFile(file,image.toPNG(),{flag:'wx'});pastedFiles.add(file);
    const result=await addFiles([file],{replace:options.replace===true});
    if(result.files?.length){const f=inputs.get(result.files[0].id);f.name='붙여넣은 이미지.png';result.files[0].name=f.name;}
    else{await fs.unlink(file).catch(()=>{});pastedFiles.delete(file);}return result;
  });
  handle('forget',async ids=>{if(active||importBusy)return;for(const id of ids||[]){const f=inputs.get(id);if(f&&pastedFiles.has(f.path)){await fs.unlink(f.path).catch(()=>{});pastedFiles.delete(f.path);}inputs.delete(id);}return true;});
  handle('pdf-bytes',async(id)=>{const f=inputs.get(id);if(!f||f.kind!=='pdf')throw new Error('PDF를 찾을 수 없습니다.');return new Uint8Array(await fs.readFile(f.path));});
  handle('prefs',()=>({...store.prefs,defaultFolder:defaultFolder()}));
  handle('save-prefs',p=>store.savePrefs(p));
  handle('history',()=>store.recent());
  handle('clear-history',()=>store.clearHistory());
  handle('ready',async()=>{rendererReady=true;const paths=pendingPaths.splice(0,121);if(paths.length)await receiveExternal(paths);return true;});
  handle('folder',async()=>{if(dialogBusy)return null;dialogBusy=true;try{const r=await dialog.showOpenDialog(win,{title:'완성된 파일을 받을 폴더',properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];}finally{dialogBusy=false;}});
  handle('cook',async(j)=>{
    if(active||importBusy)throw new Error('진행 중인 주문이 있습니다.');
    if(!j||!Array.isArray(j.entries)||j.entries.length<1||j.entries.length>400)throw new Error('재료를 1~400개 선택해 주세요.');
    const entries=j.entries.map(e=>{const f=inputs.get(e.id);if(!f)throw new Error('입력 파일을 다시 넣어 주세요.');return {path:f.path,kind:f.kind,page:e.page,name:f.name};});
    if(!j.folder||!path.isAbsolute(j.folder))throw new Error('저장 폴더를 선택해 주세요.');
    if(path.resolve(j.folder).toLowerCase()===defaultFolder().toLowerCase())await fs.mkdir(j.folder,{recursive:true});
    const stat=await fs.stat(j.folder);if(!stat.isDirectory())throw new Error('저장 폴더를 다시 선택해 주세요.');
    const cancel=new SharedArrayBuffer(4);
    const job={entries,mode:j.mode,settings:settingsFor(j.mode,j.settings),folder:j.folder,name:j.name};
    const worker=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{job,cancel},resourceLimits:{maxOldGenerationSizeMb:768}});
    active={worker,cancel:new Int32Array(cancel)};
    const started=Date.now(),inputBytes=[...new Set(j.entries.map(e=>e.id))].reduce((sum,id)=>sum+inputs.get(id).bytes,0);
    let finished=false;
    const release=()=>{if(active?.worker===worker)active=null;if(quitting)app.quit();};
    worker.on('message',async m=>{
      if(m.type==='done'){
        finished=true;lastBatchFinished=true;for(const f of m.files)outputs.add(f);
        m.files=await Promise.all(m.files.map(async f=>({path:f,name:path.basename(f),bytes:await fs.stat(f).then(s=>s.size,()=>0)})));
        const record={id:crypto.randomUUID(),createdAt:new Date().toISOString(),mode:j.mode,settings:job.settings,inputCount:j.entries.length,inputBytes,elapsedMs:Date.now()-started,files:m.files,folder:j.folder};
        m.summary=record;
        try{await store.record(record);}catch{m.warning='파일은 완성됐지만 최근 기록을 저장하지 못했습니다. 지금 파일을 가져가세요.';}
        release();send('job',m);return;
      }
      if(m.type==='error'){finished=true;release();}send('job',m);
    });
    worker.on('error',e=>{finished=true;release();send('job',{type:'error',error:'조리 중 오류가 발생했습니다. 재료 수를 줄여 다시 시도해 주세요. '+e.message});});
    worker.on('exit',()=>{if(!finished){release();send('job',{type:'error',error:'작업이 예기치 않게 종료되었습니다. 다시 시도해 주세요.'});}});
    return {started:true};
  });
  handle('cancel',()=>{if(active)Atomics.store(active.cancel,0,1);return true;});
  handle('open-result',async(file)=>{await checkedOutput(file);const err=await shell.openPath(file);if(err)throw new Error(err);return true;});
  handle('show-result',async file=>{await checkedOutput(file);shell.showItemInFolder(file);return true;});
  ipcMain.on('drag-result',(e,file)=>{try{trusted(e);const files=Array.isArray(file)?file:[file];if(files.length&&files.length<=400&&files.every(f=>allowedOutput(f)&&require('node:fs').existsSync(f)))win.webContents.startDrag({file:files[0],files,icon:nativeImage.createFromPath(path.join(__dirname,'../assets/drag.png'))});else send('operation-error','파일이 이동되거나 삭제됐습니다. 최근 기록에서 저장 위치를 확인해 주세요.');}catch{send('operation-error','파일을 꺼내지 못했습니다. 탐색기에서 보기를 이용해 주세요.');}});
  handle('window',action=>{if(action==='minimize')win.minimize();if(action==='close')win.close();if(action==='expand')expand(true);if(action==='compact')expand(false);if(action==='pin'){pinned=!pinned;win.setAlwaysOnTop(pinned);}return {pinned};});
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',(_e,argv)=>{if(win){win.show();win.restore();win.focus();}receiveExternal(parseFileArgs(argv.slice(1)));});
  app.whenReady().then(async()=>{
    store=new LocalStore(app.getPath('userData'));await store.load();
    session.defaultSession.setPermissionRequestHandler((_,__,cb)=>cb(false));
    session.defaultSession.webRequest.onBeforeRequest((details,cb)=>cb({cancel:!details.url.startsWith('file:')&&!details.url.startsWith('data:')&&!details.url.startsWith('blob:')&&!details.url.startsWith('devtools:')}));
    const area=screen.getPrimaryDisplay().workArea;
    win=new BrowserWindow({width:320,height:290,x:area.x+area.width-350,y:area.y+area.height-320,minWidth:320,minHeight:290,maxWidth:3000,maxHeight:2000,frame:false,resizable:false,show:false,backgroundColor:'#fbfbfc',title:'파일 포장마차',icon:path.join(__dirname,'../assets/icon.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!isAppURL(url))e.preventDefault();});
    win.on('close',e=>{if(active){e.preventDefault();quitting=true;Atomics.store(active.cancel,0,1);send('job',{type:'canceling'});}});
    wire();await win.loadURL(appURL);win.show();
  });
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',e=>{if(!cleaningUp&&pastedFiles.size){e.preventDefault();cleaningUp=true;Promise.all([...pastedFiles].map(file=>fs.unlink(file).catch(()=>{}))).finally(()=>app.quit());}});
}
