.DEFAULT_GOAL := setup

NODE_MODULES = node_modules

$(NODE_MODULES):
	npm install
	npm ls --depth=0

.PHONY: check
check: lint test

.PHONY: clean
clean:
	rm -rfv $(NODE_MODULES)/
	rm -fv package-lock.json
	rm -fv *-min.js
	rm -fv *-legacy.js

.PHONY: help
help:
	@echo -e 'shapeup - list of make targets:\n'
	@echo 'make - prepare the development environment'
	@echo 'make test - run tests'
	@echo 'make lint - run linter'
	@echo 'make check - run both linter and tests'
	@echo 'make prepare - generate legacy and minified files'
	@echo 'make clean - get rid of legacy files, minified files and node dir'
	@echo 'make release - publish a release on npm'

.PHONY: lint
lint: setup
	npm run lint

.PHONY: prepare
prepare: setup
	npm run legacy
	npm run minify
	npm run minifyLegacy

.PHONY: release
release: check prepare
	npm publish

.PHONY: setup
setup: $(NODE_MODULES)

.PHONY: test
test: setup
	npm t
