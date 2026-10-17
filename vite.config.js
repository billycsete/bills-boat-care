import { defineConfig } from 'vite';

// Replaces %BUILD_YEAR% in index.html so the copyright year stays current
const buildYear = () => ({
	name: 'build-year',
	transformIndexHtml: (html) => html.replaceAll('%BUILD_YEAR%', new Date().getFullYear()),
});

export default defineConfig({
	root: 'src',
	base: './',
	plugins: [buildYear()],
	build: {
		outDir: '../built',
		emptyOutDir: true,
	},
});
