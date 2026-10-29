const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {LocalStore,parseFileArgs}=require('../src/local-store.cjs');
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fp-store-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('version 1 orders migrate without losing identity and new settings persist',async t=>{
 const dir=await fixture(t);await fs.writeFile(path.join(dir,'orders.json'),JSON.stringify({version:1,fast:true,orders:[{id:'original',name:'내 주문',mode:'photo',settings:{paper:'A5',margin:20}}]}));
 const s=new LocalStore(dir);await s.load();assert.equal(s.prefs.version,2);assert.equal(s.prefs.orders[0].id,'original');assert.equal(s.prefs.orders[0].settings.margin,20);
 await s.savePrefs({...s.prefs,lastFolder:dir,orders:s.prefs.orders.map(o=>({...o,folder:dir}))});const again=new LocalStore(dir);await again.load();assert.equal(again.prefs.lastFolder,dir);assert.equal(again.prefs.orders[0].folder,dir);
});
test('queued preference writes keep the last requested state',async t=>{const dir=await fixture(t),s=new LocalStore(dir);await Promise.all([s.savePrefs({orders:[],fast:false}),s.savePrefs({orders:[],fast:true,lastFolder:dir})]);const again=new LocalStore(dir);await again.load();assert.equal(again.prefs.fast,true);assert.equal(again.prefs.lastFolder,dir);assert.ok(!(await fs.readdir(dir)).some(x=>x.endsWith('.tmp')));});
test('history survives restart, detects missing files, and clearing preserves output',async t=>{
 const dir=await fixture(t),file=path.join(dir,'완성 한 봉지.pdf');await fs.writeFile(file,'fixture');const s=new LocalStore(dir);
 await s.record({id:'r',mode:'photo',createdAt:new Date().toISOString(),files:[{path:file,name:path.basename(file),bytes:7}]});const again=new LocalStore(dir);await again.load();assert.ok(again.allowed(file));assert.ok((await again.recent())[0].available);
 await fs.rename(file,file+'.moved');assert.equal((await again.recent())[0].available,false);await again.clearHistory();assert.equal((await fs.readFile(file+'.moved')).toString(),'fixture');assert.equal(again.allowed(file),false);
});
test('history is capped and cannot authorize arbitrary executable output',async t=>{const dir=await fixture(t),s=new LocalStore(dir);for(let i=0;i<24;i++)await s.record({id:String(i),mode:'photo',files:[{path:path.join(dir,i+'.pdf'),bytes:1}]});assert.equal(s.history.length,20);assert.equal(s.history[0].id,'23');await assert.rejects(s.record({id:'bad',mode:'photo',files:[{path:path.join(dir,'app.exe'),bytes:1}]}));});
test('command-line inputs retain Korean spaces and unsupported file for clear error handling',()=>{const files=[path.resolve('한글 공백.pdf'),path.resolve('미지원.exe')];assert.deepEqual(parseFileArgs(['--flag','relative.pdf',...files]),files);});
