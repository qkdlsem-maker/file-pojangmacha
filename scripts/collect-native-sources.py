"""Download versioned upstream sources and verify the original recipe's SHA256."""
from pathlib import Path
import concurrent.futures, hashlib, json, re, urllib.request

root = Path(__file__).resolve().parent.parent
base = root/'work/provenance'
recipe = base/'recipe/build-win64-mxe-8.18.7'
mxe = base/'mxe/mxe-llvm-mingw-20260924'
out = base/'sources'
out.mkdir(exist_ok=True)
override = (recipe/'build/overrides.mk').read_text()
entries = [
 ('vips','8.18.7',recipe/'build/vips.mk','https://github.com/libvips/libvips/releases/download/v8.18.7/vips-8.18.7.tar.xz'),
 ('libheif','1.23.5',recipe/'build/libheif.mk','https://github.com/strukturag/libheif/releases/download/v1.23.5/libheif-1.23.5.tar.gz'),
 ('glib','2.90.0',mxe/'src/glib.mk','https://download.gnome.org/sources/glib/2.90/glib-2.90.0.tar.xz'),
 ('pango','1.58.2',mxe/'src/pango.mk','https://download.gnome.org/sources/pango/1.58/pango-1.58.2.tar.xz'),
 ('proxy-libintl','0.5',recipe/'build/plugins/proxy-libintl/proxy-libintl.mk','https://github.com/frida/proxy-libintl/archive/0.5.tar.gz'),
 ('librsvg','2.63.2',None,'https://download.gnome.org/sources/librsvg/2.63/librsvg-2.63.2.tar.xz'),
 ('fribidi','1.0.17',None,'https://github.com/fribidi/fribidi/releases/download/v1.0.17/fribidi-1.0.17.tar.xz'),
 ('libexif','0.6.26',None,'https://github.com/libexif/libexif/releases/download/v0.6.26/libexif-0.6.26.tar.xz'),
 ('cairo','1.18.6',None,'https://cairographics.org/releases/cairo-1.18.6.tar.xz'),
]
def fetch(entry):
    name, version, mk, url = entry
    text = mk.read_text() if mk else override
    prefix = r'\$\(PKG\)' if mk else re.escape(name)
    expected = re.search(r'^'+prefix+r'_CHECKSUM\s*:=\s*([0-9a-f]{64})',text,re.M).group(1)
    suffix = '.tar.xz' if url.endswith('.xz') else '.tar.gz'
    target = out/(name+'-'+version+suffix)
    result = dict(name=name,version=version,url=url,file=target.name,expectedSha256=expected)
    try:
        if not target.exists():
            request = urllib.request.Request(url,headers={'User-Agent':'FilePojangmacha-source-preparation/0.1.1'})
            with urllib.request.urlopen(request,timeout=45) as response:
                data=response.read()
            actual=hashlib.sha256(data).hexdigest()
            if actual!=expected: raise ValueError('Upstream checksum mismatch: '+actual)
            target.write_bytes(data)
        actual=hashlib.sha256(target.read_bytes()).hexdigest()
        if actual!=expected: raise ValueError('Stored archive checksum mismatch')
        result.update(status='verified',sha256=actual,bytes=target.stat().st_size)
    except Exception as exc:
        result.update(status='unavailable',error=str(exc))
    print(name, result['status'], flush=True)
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(fetch,entries))
(base/'source-manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'verified':sum(x['status']=='verified' for x in results),'total':len(results)},indent=2))
