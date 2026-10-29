#!/usr/bin/env bash
# Rebuild the complete upstream Windows web variant in an isolated WSL container.
# No output from this script replaces an installed or published application.
set -euo pipefail
ROOT=/opt/file-pojangmacha-rebuild-20261028
PROJECT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
OUT="$PROJECT/work/full-native-rebuild"
mkdir -p "$ROOT/recipe" "$OUT"
PODMAN=(podman --root "$ROOT/containers" --runroot /run/file-pojangmacha-containers)
BASE=ghcr.io/libvips/build-win64-mxe@sha256:f81f3174a898129a33b6c73e88e2e2c1261d65304239297764a774d8909ade46
"${PODMAN[@]}" image exists "$BASE" || "${PODMAN[@]}" pull "$BASE"
"${PODMAN[@]}" image inspect "$BASE" > "$OUT/base-image.json"
DIGEST=$("${PODMAN[@]}" image inspect --format '{{index .RepoDigests 0}}' "$BASE")
printf '%s\n' "$DIGEST" > "$OUT/base-image-digest.txt"
cp -a "$PROJECT/work/provenance/recipe/build-win64-mxe-8.18.7/." "$ROOT/recipe/"
mkdir -p "$ROOT/recipe/build/mxe-pinned"
cp -a "$PROJECT/work/provenance/mxe/mxe-llvm-mingw-20260924/." "$ROOT/recipe/build/mxe-pinned/"
# The compiler image is digest-pinned, but its current MXE recipes are newer.
# Retain only the host tools; replace all recipes with the archived release set.
python3 - "$ROOT/recipe/container/Dockerfile" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
text = p.read_text()
text = text.replace('COPY . /data', '''COPY . /data
RUN mv /usr/local/mxe/usr /usr/local/file-pojangmacha-host-tools && \\
    rm -rf /usr/local/mxe && \\
    mv /data/mxe-pinned /usr/local/mxe && \\
    mv /usr/local/file-pojangmacha-host-tools /usr/local/mxe/usr && \\
    cd /usr/local/mxe && git init && git add . && \\
    git -c user.name=FilePojangmacha -c user.email=build@invalid.local commit -qm 'Pinned MXE source archive llvm-mingw-20260924'
''')
p.write_text(text)
PY
# Limit host contention without changing codec selection or compiler flags.
printf '\nJOBS := 12\n' >> "$ROOT/recipe/build/settings/release.mk"
"${PODMAN[@]}" run --rm --network none --entrypoint /bin/bash "$DIGEST" -lc \
  'cd /usr/local/mxe; git rev-parse HEAD; git branch --show-current; find usr -iname "*vips*" -o -iname "libjpeg*" -o -iname "libpng*"; clang --version 2>/dev/null || true' \
  > "$OUT/base-toolchain-inspection.txt"
cp "$ROOT/recipe/container/Dockerfile" "$OUT/Dockerfile.used"
sha256sum "$PROJECT/work/provenance/mxe-llvm-mingw-20260924.zip" > "$OUT/mxe-source-sha256.txt"
printf '%s\n' "$(date -u +%FT%TZ)" > "$OUT/started.txt"
"${PODMAN[@]}" build --network host --format docker \
  --tag localhost/file-pojangmacha-native:8.18.7-20261028 \
  --file "$ROOT/recipe/container/Dockerfile" \
  --build-arg "BASE_IMAGE=$DIGEST" \
  --build-arg SOURCE_DATE_EPOCH=1793145600 \
  --build-arg PKGS=vips-web \
  --build-arg MXE_TARGETS=x86_64-w64-mingw32.static \
  --build-arg DEBUG=false \
  --build-arg 'PLUGIN_DIRS=plugins/llvm-mingw /data /data/plugins/mozjpeg /data/plugins/zlib-ng /data/plugins/web-deps /data/plugins/proxy-libintl' \
  --build-arg GIT_COMMIT= "$ROOT/recipe/build" \
  > "$OUT/build.log" 2>&1
bash "$PROJECT/scripts/package-full-native-rebuild.sh"
