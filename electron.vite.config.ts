import { tmpdir } from "node:os";
import * as path from "node:path";
import { defineConfig } from "electron-vite";
import { analyzer } from "vite-bundle-analyzer";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig(({ mode }) => ({
    main: {
        build: {
            minify: false,
        },
    },
    renderer: {
        // 原生 .node 模块（截屏 / OCR / 抠背景 / 键鼠钩子）不能预打包：
        // 预打包会让 esbuild 撞上 .node 二进制（No loader configured）或
        // 破坏二进制；node-screenshots 的 tarball 还缺它声明的 browser 入口，
        // 会把整个依赖扫描搞挂。排除后运行时走 Node require，与打包版一致。
        optimizeDeps: {
            exclude: [
                "node-screenshots",
                "onnxruntime-node",
                "esearch-seg",
                "esearch-ocr",
                "uiohook-napi",
            ],
        },
        build: {
            rollupOptions: {
                input: {
                    editor: path.resolve(__dirname, "src/renderer/editor.html"),
                    clip: path.resolve(__dirname, "src/renderer/capture.html"),
                    setting: path.resolve(
                        __dirname,
                        "src/renderer/setting.html",
                    ),
                    ding: path.resolve(__dirname, "src/renderer/ding.html"),
                    browser_bg: path.resolve(
                        __dirname,
                        "src/renderer/browser_bg.html",
                    ),
                    translator: path.resolve(
                        __dirname,
                        "src/renderer/translator.html",
                    ),
                    translate: path.resolve(
                        __dirname,
                        "src/renderer/translate.html",
                    ),
                    photoEditor: path.resolve(
                        __dirname,
                        "src/renderer/photoEditor.html",
                    ),
                    aiVision: path.resolve(
                        __dirname,
                        "src/renderer/aiVision.html",
                    ),
                    clipboardHistory: path.resolve(
                        __dirname,
                        "src/renderer/clipboardHistory.html",
                    ),
                },
            },
            assetsInlineLimit: 0,
            minify: false,
            sourcemap: true,
        },
        plugins: [
            ViteImageOptimizer({
                cache: true,
                cacheLocation: path.join(tmpdir(), "handpick_build"),
                logStats: false,
                include: /.*\svg$/,
            }),
            mode === "analyze" ? analyzer() : undefined,
        ],
        define: {
            "process.platform": "process.platform",
        },
    },
}));
