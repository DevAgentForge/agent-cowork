.PHONY: all install rebuild run

all: run

install:
	npm install

rebuild:
	npx electron-rebuild -f -w better-sqlite3

run: install rebuild
	@set +e; PORT=10087 npm run dev; true
