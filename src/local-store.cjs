const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {settingsFor}=require('./core.cjs');
const modes=new Set(['photo','merge','extract','resize']);
const resultExts=new Set(['.pdf','.png','.jpg','.jpeg']);
const plain=(v,max)=>typeof v==='string'?v.slice(0,max):'';
function normalizePrefs(value={}){
 if(!Array.isArray(value.orders)||value.orders.length>30)throw Error('저장한 주문은 30개까지 만들 수 있습니다.');
 return {version:2,fast:!!value.fast,lastFolder:typeof value.lastFolder==='string'&&path.isAbsolute(value.lastFolder)?value.lastFolder:'',orders:value.orders.map(o=>{
  if(!modes.has(o.mode))throw Error('주문 종류를 확인해 주세요.');
  return {id:plain(o.id,60)||crypto.randomUUID(),name:plain(o.name,40).trim()||'늘 먹던 거',mode:o.mode,settings:settingsFor(o.mode,o.settings),folder:typeof o.folder==='string'&&path.isAbsolute(o.folder)?o.folder:''};
 })};
}
function validRecord(r){
 return r&&typeof r.id==='string'&&modes.has(r.mode)&&Array.isArray(r.files)&&r.files.length>0&&r.files.length<=400&&r.files.every(f=>typeof f.path==='string'&&path.isAbsolute(f.path)&&resultExts.has(path.extname(f.path).toLowerCase())&&Number.isFinite(f.bytes)&&f.bytes>=0);
}
function parseFileArgs(args){return args.filter(v=>typeof v==='string'&&path.isAbsolute(v)).slice(0,121);}
class LocalStore{
 constructor(directory){this.directory=directory;this.pending=Promise.resolve();this.prefs={version:2,fast:false,lastFolder:'',orders:[]};this.history=[];}
 async load(){
  try{const p=JSON.parse(await fs.readFile(path.join(this.directory,'orders.json'),'utf8'));if([1,2].includes(p.version))this.prefs=normalizePrefs(p);}catch{}
  try{const h=JSON.parse(await fs.readFile(path.join(this.directory,'history.json'),'utf8'));if(h.version===1&&Array.isArray(h.records))this.history=h.records.filter(validRecord).slice(0,20);}catch{}
 }
 write(name,value){
  // Serialize snapshots so a fast second click cannot replace a newer state.
  const text=JSON.stringify(value,null,2);
  const next=this.pending.catch(()=>{}).then(async()=>{await fs.mkdir(this.directory,{recursive:true});const temp=path.join(this.directory,name+'.'+crypto.randomUUID()+'.tmp');try{await fs.writeFile(temp,text,{flag:'wx'});await fs.rename(temp,path.join(this.directory,name));}finally{await fs.unlink(temp).catch(()=>{});}});
  this.pending=next;return next;
 }
 async savePrefs(p){const next=normalizePrefs(p);await this.write('orders.json',next);this.prefs=next;return next;}
 async record(r){if(!validRecord(r))throw Error('완성 기록을 저장할 수 없습니다.');this.history=[r,...this.history].slice(0,20);await this.write('history.json',{version:1,records:this.history});return r;}
 async clearHistory(){this.history=[];await this.write('history.json',{version:1,records:[]});return true;}
 allowed(file){return this.history.some(r=>r.files.some(f=>f.path===file));}
 async recent(){return Promise.all(this.history.map(async r=>({...r,available:await fs.access(r.files[0].path).then(()=>true,()=>false)})));}
}
module.exports={LocalStore,normalizePrefs,validRecord,parseFileArgs};
