all: dist/lockableforage.js dist/lockableforage.min.js

dist/lockableforage.js dist/lockableforage.min.js: src/*.ts node_modules/.bin/rollup
	npm run build

node_modules/.bin/rollup:
	npm install

clean:
	rm -rf dist
