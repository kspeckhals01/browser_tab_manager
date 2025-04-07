import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'manifest.json',
                    dest: '.' // Copies it directly to /build
                },
                {
                    src: 'public/icons',
                    dest: '.'
                }
            ]
        })
    ],
    build: {
        outDir: 'build',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'index.html'),         // React popup
                background: resolve(__dirname, 'src/background.ts') // Service worker
            },
            output: {
                entryFileNames: chunk => {
                    return chunk.name === 'background'
                        ? 'background.js'
                        : 'assets/[name].js'
                }
            }
        }
    },
    server: {
        port: 55505
    }
})
