// Load the source-rebuilt engine before tests, including spawned workers.
const Module=require('node:module'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const original=Module._resolveFilename;
const root=path.join(__dirname,'../work/full-native-rebuild');
const sharp=path.join(root,'runtime/node_modules/sharp');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'native-build-manifest.json')));
for(const binary of manifest.binaries){
  const file=path.join(sharp,'src/build/Release',binary.name);
  const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(actual!==binary.sha256)throw Error('Native rebuild hash mismatch: '+binary.name);
}
require(path.join(sharp,'src/build/Release/sharp-win32-x64-0.35.5.node'));
Module._resolveFilename=function(request,...args){return original.call(this,request==='sharp'?sharp:request,...args);};
