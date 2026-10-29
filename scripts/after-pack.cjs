// Use the reviewed source-built libraries only when explicitly requested.
// A normal source checkout can still build with the lockfile's upstream binaries.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async context=>{
 const from=process.env.FP_REBUILT_NATIVE_DIR;if(!from)return;
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../licenses/sharp-win32-x64-0.35.5/full-rebuild-manifest.json')));
 const target=path.join(context.appOutDir,'resources/app.asar.unpacked/node_modules/@img/sharp-win32-x64/lib');
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 for(const binary of manifest.binaries){
  const source=path.join(from,binary.name),dest=path.join(target,binary.name);
  if(hash(source)!==binary.sha256)throw Error('Rebuilt native hash mismatch: '+binary.name);
  if(!fs.existsSync(dest))throw Error('Unexpected package native layout: '+dest);
  fs.copyFileSync(source,dest);
  if(hash(dest)!==binary.sha256)throw Error('Packaged native hash mismatch: '+binary.name);
 }
 fs.writeFileSync(path.join(context.appOutDir,'resources/native-rebuild.json'),JSON.stringify(manifest,null,2));
 console.log('Installed and verified three source-rebuilt native binaries (28 engine/codec libraries).');
};
