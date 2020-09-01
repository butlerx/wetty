#! /usr/bin/env bash
###
### build.sh - Build WeTTy assets for packaging and dev
###
### Usage:
###   build.sh [--flag]
###
### Options:
###   --clean     Clean repo and delete all built files
###   --watch     Run dev env and rebuild on change
###   -h,--help   Show this help dialogue

set -eo pipefail
export NODE_ENV=development

show_usage() {
  : 'Print out help info'
  # awk -F '### ' '/^### ?/ { print $2 }' "$0"
  sed -n 's/^### \?//p' "$0"
}

clean() {
  : 'Clean repo and delete all built files'
  rm -rf build
}

build-css() {
  : 'build sass assets in to css files'
  sass src/assets/scss:build/assets/css \
    --load-path=node_modules \
    -s compressed \
    --no-source-map "$@"
}

build-js() {
  : 'Compile all typescript to javescript'
  tsc -p tsconfig.json "$@"
}

build-assets() {
  : 'Move assets not handled by sass and typescript to build dir'
  cp src/assets/*.ico build/assets
}

watch() {
  : 'Run dev env and rebuild on change'
  build-assets
  build-js
  concurrently \
    --kill-others \
    --success first \
    "build-js --watch" \
    "build-css --watch" "nodemon ."
}

build() {
  : 'Build all assets'
  build-assets
  build-css
  build-js
}

if [[ $# -eq 0 ]]; then
  build
  exit
fi
while test $# -gt 0; do
  case $1 in
  --watch)
    watch
    exit
    ;;
  --clean)
    clean
    exit
    ;;
  --help | -h)
    show_usage
    exit 1
    ;;
  esac
  shift
done
