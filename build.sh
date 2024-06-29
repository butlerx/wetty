npm x tsc -- -p tsconfig.node.json 
npm x tsc -- -p tsconfig.browser.json
npm x esbuild -- src/client/wetty.ts --bundle --platform=browser --sourcemap --minify --outdir=build/client $@
npm x sass -- src/assets/scss:build/assets/css --load-path=node_modules -s compressed --no-source-map
cp -r src/assets/xterm_config src/assets/favicon.ico build/assets
