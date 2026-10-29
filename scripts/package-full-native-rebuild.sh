#!/usr/bin/env bash
set -euo pipefail
ROOT=/opt/file-pojangmacha-rebuild-20261028
PROJECT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
OUT="$PROJECT/work/full-native-rebuild"
PODMAN=(podman --root "$ROOT/containers" --runroot /run/file-pojangmacha-containers)
IMAGE=localhost/file-pojangmacha-native:8.18.7-20261028
"${PODMAN[@]}" run --pull never --rm --network none \
  -v "$ROOT/recipe/packaging:/data/packaging" \
  -e PKGS=vips-web -e MXE_TARGETS=x86_64-w64-mingw32.static \
  -e FFI_COMPAT=false -e JPEG_IMPL=mozjpeg -e HEVC=false -e DEBUG=false -e ZLIB_NG=true \
  "$IMAGE" > "$OUT/packaging.log" 2>&1
cp "$ROOT/recipe/packaging/"*.zip "$OUT/"
"${PODMAN[@]}" run --pull never --rm --network none --entrypoint /bin/bash "$IMAGE" \
  -lc 'cd /usr/local/mxe; find usr/x86_64-w64-mingw32.static/installed -type f | sort; find log -type f | sort; usr/x86_64-pc-linux-gnu/bin/clang --version; usr/x86_64-pc-linux-gnu/bin/rustc --version' \
  > "$OUT/installed-packages.txt"
"${PODMAN[@]}" run --pull never --rm --network none --entrypoint /bin/bash "$IMAGE" \
  -lc 'cd /usr/local/mxe; tar czf - log settings.mk' > "$OUT/compiler-logs.tar.gz"
"${PODMAN[@]}" image inspect "$IMAGE" > "$OUT/built-image.json"
printf '%s\n' "$(date -u +%FT%TZ)" > "$OUT/completed.txt"
