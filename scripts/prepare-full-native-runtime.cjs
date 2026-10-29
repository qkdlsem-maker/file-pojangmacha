const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),out=path.join(root,'work/full-native-rebuild');
const source=fs.realpathSync(path.join(root,'work/native-rebuild/node_modules/sharp'));
const packageRoot=path.join(out,'runtime/node_modules/sharp');
const rebuilt=path.join(out,'extracted/vips-dev-8.18');
const published=JSON.parse(fs.readFileSync(path.join(root,'licenses/sharp-win32-x64-0.35.5/versions.json')));
const actual=JSON.parse(fs.readFileSync(path.join(rebuilt,'versions.json')));
for(const [key,version]of Object.entries(published))if(actual[key]!==version)throw Error('Version mismatch '+key+': '+actual[key]+' != '+version);
const aliases={archive:'libarchive',exif:'libexif',ffi:'libffi',heif:'libheif',imagequant:'libimagequant',png:'libpng',rsvg:'librsvg',vips:'vips-web',webp:'libwebp',xml2:'libxml2'};
const log=fs.readFileSync(path.join(out,'build.log'),'utf8');
const packages=Object.keys(published).map(key=>({library:key,version:actual[key],package:aliases[key]||key}));
for(const p of packages){p.compiled=new RegExp('\\[done\\]\\s+'+p.package+'\\s+x86_64-w64-mingw32.static').test(log);if(!p.compiled)throw Error('No successful source build recorded for '+p.package);}
fs.mkdirSync(packageRoot,{recursive:true});
for(const name of ['package.json','LICENSE','dist','lib'])fs.cpSync(path.join(source,name),path.join(packageRoot,name),{recursive:true});
const requireSource=createRequire(path.join(source,'package.json'));
for(const dep of ['@img/colour','detect-libc','semver']){
  const resolved=requireSource.resolve(dep+'/package.json');
  const dest=path.join(out,'runtime/node_modules',dep);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(!fs.existsSync(dest))fs.symlinkSync(path.dirname(resolved),dest,'junction');
}
const release=path.join(packageRoot,'src/build/Release');fs.mkdirSync(release,{recursive:true});
for(const name of ['sharp-win32-x64-0.35.5.node','libvips-cpp-8.18.7.dll'])fs.copyFileSync(path.join(source,'src/build/Release',name),path.join(release,name));
fs.copyFileSync(path.join(rebuilt,'bin/libvips-42.dll'),path.join(release,'libvips-42.dll'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const binaries=fs.readdirSync(release).map(name=>({name,bytes:fs.statSync(path.join(release,name)).size,sha256:sha(path.join(release,name))}));
const engine=binaries.find(b=>b.name==='libvips-42.dll');
if(engine.sha256==='06dab07cc386748513337a31672b1d5269fbc770a14ff403080575665bf0813f')throw Error('Rebuilt engine is identical to the shipped prebuilt; investigate provenance');
fs.writeFileSync(path.join(out,'native-build-manifest.json'),JSON.stringify({utc:new Date().toISOString(),scope:'28 image engine and codec libraries; previously source-built MSVC addon and C++ bridge; prebuilt digest-pinned host compiler tools',bitForBitReproduction:false,baseImage:fs.readFileSync(path.join(out,'base-image-digest.txt'),'utf8').trim(),packages,binaries},null,2));
console.log(JSON.stringify({compiledLibraries:packages.length,binaries}));
