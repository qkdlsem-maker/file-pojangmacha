const {contextBridge,ipcRenderer,webUtils}=require('electron');
const invoke=(channel,...args)=>ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('stall',{
  pick:options=>invoke('pick',options),addFiles:(files,options)=>{
    try{
      if(!Array.isArray(files)||!files.length)return {error:'파일을 받지 못했습니다. 탐색기의 실제 파일을 다시 끌어 놓거나 파일 고르기를 이용해 주세요.'};
      const paths=files.map(f=>webUtils.getPathForFile(f));
      if(paths.some(p=>!p))return {error:'이 항목은 내 컴퓨터에 저장된 파일이 아닙니다. 먼저 저장한 뒤 넣어 주세요.'};
      return invoke('add',paths,options);
    }catch{return {error:'파일 정보를 읽지 못했습니다. 탐색기에서 파일을 다시 선택해 주세요.'};}
  },
  forget:ids=>invoke('forget',ids),pdfBytes:id=>invoke('pdf-bytes',id),prefs:()=>invoke('prefs'),savePrefs:p=>invoke('save-prefs',p),folder:()=>invoke('folder'),
  history:()=>invoke('history'),clearHistory:()=>invoke('clear-history'),ready:()=>invoke('ready'),
  pasteImage:options=>invoke('paste-image',options),
  cook:j=>invoke('cook',j),cancel:()=>invoke('cancel'),openResult:f=>invoke('open-result',f),showResult:f=>invoke('show-result',f),dragResult:f=>ipcRenderer.send('drag-result',f),window:a=>invoke('window',a),
  on:(name,cb)=>{if(!['view','job','import-progress','incoming-files','operation-error'].includes(name))return;ipcRenderer.on(name,(_,data)=>cb(data));}
});
