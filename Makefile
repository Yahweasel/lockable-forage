all: dist/locakbleforage.js dist/locakbleforage.min.js

dist/locakbleforage.js dist/locakbleforage.min.js: src/*.ts node_modules/.bin/rollup
	npm run build

node_modules/.bin/rollup:
	npm install

clean:
	rm -rf dist
