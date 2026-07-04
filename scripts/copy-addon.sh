#!/usr/bin/env sh
# Copy the compiled napi addon (.so / .dylib / .dll) to build/wetty_server.node.
# The profile directory defaults to "release"; pass "debug" as $1 to override.
set -e
PROFILE="${1:-release}"
SRC_DIR="target/${PROFILE}"
mkdir -p build

for ext in so dylib dll; do
  case "$ext" in
    so)    name="libwetty_server.so" ;;
    dylib) name="libwetty_server.dylib" ;;
    dll)   name="wetty_server.dll" ;;
  esac
  src="${SRC_DIR}/${name}"
  if [ -f "$src" ]; then
    cp "$src" build/wetty_server.node
    echo "Copied ${src} → build/wetty_server.node"
    exit 0
  fi
done

echo "ERROR: no compiled addon found in ${SRC_DIR}/ (expected .so, .dylib, or .dll)" >&2
exit 1
