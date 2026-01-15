.PHONY: dev dev_react dev_electron build run run_dev run_prod dist_mac dist_win dist_linux clean

# Development
dev:
	bun run dev

dev_react:
	bun run dev:react

dev_electron:
	bun run dev:electron

# Build
build:
	bun run build

# Run compiled app (production mode)
run: build
	bun run transpile:electron
	NODE_ENV=production ./node_modules/.bin/electron .

# Run in development mode with hot reload
run_dev: dev_react dev_electron

# Run production without rebuilding
run_prod:
	NODE_ENV=production ./node_modules/.bin/electron .

# Distribution
dist_mac:
	bun run dist:mac

dist_win:
	bun run dist:win

dist_linux:
	bun run dist:linux

# Clean
clean:
	rm -rf dist-electron dist-react
