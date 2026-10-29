// Preload for the isolated source-rebuild regression run, including workers.
const Module=require('node:module'),path=require('node:path'),fs=require('node:fs');
const original=Module._resolveFilename;
const sharp=path.join(__dirname,'../work/native-rebuild/node_modules/sharp');
const binary=path.join(sharp,'src/build/Release/sharp-win32-x64-0.35.5.node');
if(!fs.existsSync(binary))throw new Error('Run the documented isolated native build first');
require(binary); // A broken local build must fail instead of falling back to a prebuilt binary.
Module._resolveFilename=function(request,...args){return original.call(this,request==='sharp'?sharp:request,...args);};
