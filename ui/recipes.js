export const starterOrders=[
 {id:'starter-a4',name:'사진을 PDF 한 봉지',mode:'photo',settings:{paper:'A4',orientation:'auto',margin:10},caption:'A4 · 사진 방향 자동 · 여백 10mm'},
 {id:'starter-1600',name:'사진, 가볍게 1600',mode:'resize',settings:{resizeMode:'edge',edge:1600,format:'jpg',upscale:false},caption:'긴 변 1600px · JPG · 비율 유지'},
 {id:'starter-merge',name:'PDF 하나로 모둠',mode:'merge',settings:{},caption:'지금 놓인 쪽 순서대로 · PDF 하나'},
 {id:'starter-split',name:'한 쪽씩 소분',mode:'extract',settings:{split:true},caption:'선택한 쪽마다 · 별도 PDF'}
];
export function orderDetail(o){
 const s=o.settings||{};
 if(o.caption)return o.caption;
 if(o.mode==='photo')return `${s.paper||'A4'} · ${s.orientation==='portrait'?'세로':s.orientation==='landscape'?'가로':'방향 자동'} · 여백 ${s.margin??10}mm`;
 if(o.mode==='resize')return `${s.resizeMode==='box'?`${s.width}×${s.height}px 안에`:`긴 변 ${s.edge||1600}px`} · ${(s.format||'png').toUpperCase()}`;
 return o.mode==='extract'?(s.split?'선택한 쪽마다 별도 PDF':'선택한 쪽을 PDF 하나로'):'지금 놓인 쪽 순서대로';
}
export function formatBytes(n){if(!Number.isFinite(n))return '';if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(0)} KB`;return `${(n/1048576).toFixed(1)} MB`;}
