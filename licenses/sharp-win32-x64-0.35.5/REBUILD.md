# Native library source, rebuild and replacement

The distributed native package is unmodified @img/sharp-win32-x64 0.35.5 from npm (integrity pinned in pnpm-lock.yaml). It uses libvips 8.18.7 / sharp-libvips 1.3.4. License texts, original notices, exact version manifest and upstream Windows build script are included alongside this file.

## Full image-engine rebuild verified on 2026-10-28

The remaining libvips C engine and all 27 dependencies in the distributed web-variant version manifest were compiled from source for x86_64-w64-mingw32.static. All 28 generated version entries match the distributed package. The earlier MSVC source-built sharp addon and C++ bridge were combined with this new C engine in an isolated test runtime and application copy. No published 0.1.1 binary was replaced.

The build used the archived v8.18.7 recipe and llvm-mingw-20260924 MXE recipe snapshot. The upstream host-tool container was pinned to ghcr.io/libvips/build-win64-mxe@sha256:f81f3174a898129a33b6c73e88e2e2c1261d65304239297764a774d8909ade46. Its newer recipes were replaced with the archived recipes before compilation. Host compiler tools are prebuilt (Clang 23.1.4, Rust 1.101.0-nightly 2026-10-20). This is a source rebuild of the image engine and codecs, not a rebuild of Electron/Chromium or a bit-for-bit reproduction claim.

New libvips-42.dll SHA256: ae86731e5550cb5c37d1d78968b94ba64a8bf912cd9780818db53c05596d74be. Windows process module inspection confirmed that the isolated application loaded this DLL and the rebuilt addon/C++ bridge. The regression results are: core 13/13, codec checks 10/10, packaged worker 9/9, real Electron renderer/main/worker integration 14/14, independent Pillow/Poppler readers 7/7. UI integration stubs OS file dialogs and does not replace the separately recorded native drag/drop test. These rebuild tests ran on the development PC, not a second physical PC.

Run scripts/full-native-rebuild.sh in WSL Ubuntu with Podman installed, using the documented source archives under work/provenance. It writes only to a dedicated /opt/file-pojangmacha-rebuild-20261028 container store and work/full-native-rebuild. The final stage can be repeated with scripts/package-full-native-rebuild.sh. Extract the resulting vips-dev-x64-web-8.18.7-static.zip into work/full-native-rebuild/extracted, then run scripts/prepare-full-native-runtime.cjs. Run Node tests with --require ./scripts/use-full-rebuilt-sharp.cjs. The runtime loader verifies every native binary hash and fails before any prebuilt fallback can be used.

## Earlier addon and C++ bridge rebuild

An isolated Windows build used MSVC 14.44.35207, Node 24.19.0, node-gyp 12.4.0, node-addon-api 8.9.2 and the bundled Python runtime. It compiled sharp-win32-x64-0.35.5.node and libvips-cpp-8.18.7.dll from source. Both differ from the distributed prebuilt binaries. The underlying libvips-42.dll was the upstream binary and is byte-identical to the distributed one. All 13 conversion regression tests passed with the rebuilt addon and C++ binding explicitly loaded. A failed load cannot silently fall back in this test.

That first step did not rebuild the C engine or every codec. The full follow-up above installed Podman inside the existing WSL Ubuntu environment and completed the remaining build in a separate container store.

## Reproduce the verified scope

In a separate folder, use the package.json and pnpm-lock.yaml in the accompanying archive's rebuild/ directory. Run `pnpm install --ignore-workspace`. With Visual Studio C++ Build Tools, a Windows SDK and Python installed, resolve the physical path to node_modules/sharp/src (important for pnpm on Windows), then run:

```
node node_modules/node-gyp/bin/node-gyp.js rebuild --directory=THE_PHYSICAL_SHARP_SRC_PATH
```

The physical path is returned by `node -e "console.log(require('node:fs').realpathSync('node_modules/sharp/src'))"`. Source packages and headers used for this build are also provided as npm tarballs with their verified SHA512 integrity and SHA256 manifest. Original license notices remain inside each package. No package cache or another project's files need to be changed.

From the application source, with that folder at work/native-rebuild, run:

```
node --require ./scripts/use-rebuilt-sharp.cjs --test test/*.test.cjs
```

The resulting DLLs and addon are under node_modules/sharp/src/build/Release. Close the application before replacing compatible native files under resources/app.asar.unpacked/node_modules/@img/sharp-win32-x64/lib/. Keep a backup, replace the matching C++ DLL and addon together, and rerun conversion checks. Full source allows rebuilding the complete application with pnpm dist. No license restriction or application integrity check prevents debugging modifications or substituting compatible builds. Arbitrary third-party replacements have not been tested.

## Full C engine / dependency sources

The separate native-source-reference ZIP contains verified source archives for all eight LGPL libraries listed by the package plus cairo, the exact Windows build recipes and patches, and the MXE branch snapshot. GLib's archive includes its gvdb subproject. Some recipes still obtain further permissive dependencies and Rust crates online; this is not an offline toolchain bundle.

- sharp: https://github.com/lovell/sharp/tree/v0.35.5
- sharp-libvips: https://github.com/lovell/sharp-libvips/tree/v1.3.4
- Windows recipe: https://github.com/libvips/build-win64-mxe/tree/v8.18.7
- libvips: https://github.com/libvips/libvips/tree/v8.18.7

The upstream full build uses `./build.sh -t x86_64-w64-mingw32.static vips-web`. Review its bundled README, container definitions and patches for required tools. The upstream sharp Windows packaging script is included here. The application uses the web variant; it does not add the GPL codecs in the all or HEVC variants.

App source and native source materials are provided beside the installer at https://file-pojangmacha.choihyerim.chatgpt.site/ . The application source is MIT licensed; native components retain their original licenses. The project does not restrict library modification or reverse engineering to debug such modifications.
