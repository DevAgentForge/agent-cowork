import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const port = Number.parseInt(env.PORT, 10);
	const serverPort = Number.isFinite(port) ? port : 10087;

	return {
		plugins: [react(), tailwindcss(), tsconfigPaths()],
		base: './',
		build: {
			outDir: 'dist-react',
		},
		server: {
			port: serverPort, // MUST BE LOWERCASE
			strictPort: true,
		},
	};
});
