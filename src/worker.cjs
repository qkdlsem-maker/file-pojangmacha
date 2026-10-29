const {parentPort,workerData}=require('node:worker_threads');
const {runJob,friendly}=require('./core.cjs');
const canceled=new Int32Array(workerData.cancel);
runJob(workerData.job,p=>parentPort.postMessage({type:'progress',...p}),()=>Atomics.load(canceled,0)===1)
 .then(files=>parentPort.postMessage({type:'done',files}))
 .catch(error=>parentPort.postMessage({type:'error',error:friendly(error),canceled:error.code==='CANCELED'}));
