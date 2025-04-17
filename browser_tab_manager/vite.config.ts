import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'manifest.json',
                    dest: '.' // ✅ Copy manifest.json to /build
                },
                {
                    src: 'public/icons',
                    dest: '.' // ✅ Copy icons to /build/icons
                },
                {
                    src: 'login.html',
                    dest: '.' // ✅ Copy login.html to /build
                },
                // If you need upgrade.html too, uncomment:
                // {
                //   src: 'upgrade.html',
                //   dest: '.'
                // }
            ]
        })
    ],
    build: {
        outDir: 'build',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'index.html'),
                background: resolve(__dirname, 'src/background.ts'),
                loginScript: resolve(__dirname, 'src/scripts/login-init.ts')
            },
            output: {
                entryFileNames: chunk => {
                    if (chunk.name === 'background') {
                        return 'background.js';
                    }

                    if (chunk.name === 'loginScript') {
                        return 'scripts/login-init.js';
                    }

                    return 'assets/[name].js';
                }
            }
        }
    },
    server: {
        port: 55505
    }
});
