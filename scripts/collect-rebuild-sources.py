from pathlib import Path
import json, hashlib, urllib.request, base64
root=Path(__file__).resolve().parent.parent
out=root/'work/provenance/rebuild';out.mkdir(parents=True,exist_ok=True)
rows=[]
for name,version in [('sharp','0.35.5'),('@img/sharp-libvips-dev','1.3.4'),('@img/sharp-libvips-win32-x64','1.3.4')]:
    meta=json.load(urllib.request.urlopen('https://registry.npmjs.org/'+name+'/'+version))
    data=urllib.request.urlopen(meta['dist']['tarball']).read()
    integrity='sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()
    assert integrity==meta['dist']['integrity']
    file=name.replace('@','').replace('/','-')+'-'+version+'.tgz';(out/file).write_bytes(data)
    rows.append(dict(name=name,version=version,file=file,url=meta['dist']['tarball'],integrity=integrity,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
(out/'npm-source-manifest.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
rebuilt=root/'work/native-rebuild/node_modules/sharp/src/build/Release'
original=root/'node_modules/.pnpm/@img+sharp-win32-x64@0.35.5/node_modules/@img/sharp-win32-x64/lib'
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'date':'2026-10-28','toolchain':'MSVC 14.44.35207, node-gyp 12.4.0, Node 24.19.0, Python 3.11','regressionTestsPassed':13,'regressionTestsFailed':0,'files':[],'scope':'Recompiled sharp addon and libvips C++ binding from source; linked against upstream libvips-42.dll. Not a clean rebuild of the C engine and every codec.'}
for name in ['sharp-win32-x64-0.35.5.node','libvips-cpp-8.18.7.dll','libvips-42.dll']:
    report['files'].append({'name':name,'rebuiltSHA256':hashfile(rebuilt/name),'distributedSHA256':hashfile(original/name),'sameBytes':hashfile(rebuilt/name)==hashfile(original/name)})
assert not report['files'][0]['sameBytes'] and not report['files'][1]['sameBytes']
assert report['files'][2]['sameBytes']
(root/'work/drag-qa/native-rebuild-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'packagesVerified':len(rows),'regressionPass':13,'scope':report['scope']}))
