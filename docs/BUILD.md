# Build and provenance

Windows x64, Node 24 and pnpm 11 were used. App version: **0.4.11**. Release tag: **v0.4.11-beta.1**. The application UI remains Korean.

```text
pnpm install --frozen-lockfile
node node_modules/electron/install.js
pnpm test
pnpm build
pnpm start
pnpm dist
```

Icons and original SVG assets are included. `node scripts/prepare.cjs` regenerates them and creates 20 original demo JPEGs in `work/demo-inputs`. The build outputs an NSIS installer under `release/`. `scripts/engine-check.cjs` checks the actual packaged runtime when launched with `ELECTRON_RUN_AS_NODE=1`, `FP_INSTALL` pointing to the installed application folder, and `FP_RESULTS` pointing to a fresh test-output directory. It uses synthetic inputs only.

## Native image libraries

The distributed beta includes the three reviewed source-rebuilt native files whose SHA-256 values are in `licenses/sharp-win32-x64-0.35.5/full-rebuild-manifest.json`. These represent the sharp addon, C++ bridge and libvips C engine with 28 image/codec libraries. They were rebuilt on 2026-10-28 and reused unchanged in 0.4.11. The 0.4.11 application and installer were built anew.

The release assets include:

- `FilePojangmacha-0.1.1-native-source-reference.zip`: exact-version native sources, notices and build recipes; the filename records when this source bundle was first published.
- `FilePojangmacha-native-rebuild-20261028.zip`: rebuild materials, native binaries and evidence.

To package the reviewed binaries, extract the rebuild bundle, set `FP_REBUILT_NATIVE_DIR` to its `binaries` directory and run `pnpm dist`. The after-pack hook verifies all three hashes before copying and verifies them again in the package. Without that environment variable, a normal checkout uses the lockfile's upstream prebuilt native packages. Do not label that build as the reviewed source-rebuilt distribution.

See `licenses/sharp-win32-x64-0.35.5/REBUILD.md` and the source archives for detailed reproduction and replacement instructions. The scripts use dedicated work directories; they do not modify another product. Native-library replacement/debugging is not restricted by the app license. Original dependency licenses apply.

Electron/Chromium and compiler host tools are prebuilt. The project does not claim a fully source-built toolchain or bit-for-bit reproducible installer. The installer is unsigned. A source ZIP is not an installer and does not contain `node_modules` or private profiles/raw desktop recordings.
