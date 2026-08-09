#!/usr/bin/env bash
# Builds the N-API addon from the vendored mcpLauncher C++ sources.
# Incremental: only recompiles sources that are newer than their object file.
set -euo pipefail

cd "$(dirname "$0")"

NODE_INC="${NODE_INC:-/usr/include/node}"
OUT="build/launcher.node"
OBJ="build/obj"

mkdir -p "$OBJ"

# Remove stale object files from previous source orderings.
nobj=$(find src -name '*.cpp' -o -name '*.cc' | wc -l)
expected=$((nobj + 2))
for spoil in "$OBJ"/*.o; do
  [[ -e "$spoil" ]] || continue
  n=$(basename "$spoil" .o)
  if [[ "$n" =~ ^[0-9]+$ ]] && ((10#$n > expected)); then
    rm -f "$spoil"
  fi
done

LIBS="-lcurl -lssl -lcrypto -lz -lprotobuf -lzip -pthread -ldl"
COMMON_FLAGS=(-std=c++17 -O2 -fPIC -DNDEBUG -Iinclude -Iinclude/gen -I"$NODE_INC")

# Compile each source separately, but only when stale.
needs_relink=0
count=0
for src in addon.cpp play_api.cpp $(find src -name '*.cpp' -o -name '*.cc' | sort); do
  count=$((count + 1))
  obj="$OBJ/$(printf '%02d' "$count").o"
  if [[ ! -f "$obj" || "$src" -nt "$obj" ]]; then
    printf '[%02d] Compiling %s ...\n' "$count" "$src"
    g++ "${COMMON_FLAGS[@]}" -c "$src" -o "$obj"
    needs_relink=1
  fi
done

if [[ "$needs_relink" -eq 1 ]] || [[ ! -f "$OUT" ]]; then
  echo "Linking launcher.node ..."
  g++ "${COMMON_FLAGS[@]}" -shared "$OBJ"/*.o $LIBS -o "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
  echo "Built $OUT"
else
  echo "Up to date; nothing to build."
fi