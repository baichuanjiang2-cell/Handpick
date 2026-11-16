// @ts-check
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const yauzl = require("yauzl");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * @param {string} url
 */
async function downloadBuffer(url) {
    console.log(url);
    const b = await (await fetch(url)).arrayBuffer();
    return Buffer.from(b);
}
/**
 * @param {string} url
 * @param {string} targetDir
 */
async function download(url, targetDir) {
    const b = await downloadBuffer(url);
    ensureDir(targetDir);
    const fileName = url.split("/").at(-1);
    if (fileName) fs.writeFileSync(path.join(targetDir, fileName), b);
}
/**
 * @param {string} url
 * @param {string} targetDir
 */
async function downloadUnzip(url, targetDir) {
    const b = await downloadBuffer(url);
    ensureDir(targetDir);
    const fileName = url.split("/").at(-1);
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(b, { lazyEntries: true }, (err, zipfile) => {
            if (err) throw err;
            zipfile.readEntry();
            console.log(`开始解压 ${fileName} 到 ${targetDir}`);
            zipfile.on("entry", (entry) => {
                // 防 zip-slip：resolve 后必须仍落在目标目录内
                const filePath = path.resolve(targetDir, entry.fileName);
                const dir = path.resolve(targetDir);
                if (filePath !== dir && !filePath.startsWith(dir + path.sep)) {
                    console.warn(`跳过越界压缩包条目: ${entry.fileName}`);
                    zipfile.readEntry();
                    return;
                }
                if (/\/$/.test(entry.fileName)) {
                    ensureDir(filePath);
                    zipfile.readEntry();
                } else {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) throw err;
                        ensureDir(path.dirname(filePath));
                        const writeStream = fs.createWriteStream(filePath);
                        readStream.pipe(writeStream);
                        writeStream.on("finish", () => {
                            zipfile.readEntry();
                        });
                    });
                }
            });
            zipfile.on("end", () => {
                zipfile.close();
                resolve(true);
            });
        });
    });
}

/**
 * @param {string} dir
 */
function checkPath(dir) {
    return (
        fs.existsSync(dir) &&
        (fs.statSync(dir).isFile() ||
            (fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0))
    );
}

const arch =
    (process.env.npm_config_arch || process.env.M_ARCH || process.arch) ===
    "arm64"
        ? "arm64"
        : "x64";

const platform = process.platform;
const platformMap = { linux: "linux", win32: "win", darwin: "mac" };
/**
 * @type {"linux"|"win"|"mac"}
 */
const platform2 = platformMap[platform];

// const githubUrl = "https://gh-proxy.com/https://github.com" || true;
const githubUrl = "https://github.com";

const beforePack = async () => {
    if (!checkPath("./assets/onnx/ppocr/ppocr6_small_rec.onnx")) {
        ensureDir("./assets/onnx/ppocr");
        await downloadUnzip(
            `${githubUrl}/xushengfeng/eSearch-OCR/releases/download/4.0.0/ppocr_v6_small.zip`,
            "./assets/onnx/ppocr/",
        );
    }
    if (!checkPath("./assets/onnx/ppocr/doc_cls.onnx")) {
        await download(
            `${githubUrl}/xushengfeng/eSearch-OCR/releases/download/8.1.0/doc_cls.onnx`,
            "./assets/onnx/ppocr/",
        );
    }
    if (!checkPath("./assets/onnx/seg")) {
        ensureDir("./assets/onnx/seg");
        await download(
            `${githubUrl}/xushengfeng/eSearch-seg/releases/download/1.0.0/seg.onnx`,
            "./assets/onnx/seg/",
        );
    }
    if (process.platform === "win32" && !checkPath("./lib/copy.exe")) {
        fs.writeFileSync(
            "./lib/copy.exe",
            await downloadBuffer(
                `${githubUrl}/xushengfeng/ctrlc/releases/download/0.1.0/copy.exe`,
            ),
        );
    }
};

/**
 * @type import("electron-builder").Configuration
 */
const build = {
    appId: "com.handpick.app",
    executableName: "handpick",
    directories: {
        output: "build",
    },
    icon: "./assets/logo",
    electronDownload: {
        mirror: "https://npmmirror.com/mirrors/electron/",
    },
    npmRebuild: false,
    electronFuses: {
        runAsNode: false,
    },
    electronLanguages: fs
        .readdirSync(path.join(__dirname, "lib/translate"))
        .filter((file) => {
            return (
                file.endsWith(".json") &&
                !file.startsWith("source") &&
                !file.startsWith(".")
            );
        })
        .map((i) => i.replace(".json", ""))
        .concat("zh-HANS")
        .map((i) => i.split("-")[0]),
    fileAssociations: [
        {
            ext: "svg",
            mimeType: "image/svg+xml",
            role: "Editor",
        },
        {
            ext: "png",
            mimeType: "image/png",
            role: "Editor",
        },
        {
            ext: "jpg",
            mimeType: "image/jpeg",
            role: "Editor",
        },
    ],
    asar: false,
    // 产物文件名加 handpick 前缀，避免与上游官方发布包同名同版本互相混淆。
    // productName / appId / executableName 已随品牌更名切换为 HandPick 体系
    // （见 docs/adr/0016-rebrand-to-handpick.md），默认数据目录变为
    // %APPDATA%\HandPick，首次启动会自动从旧目录（eSearch）迁移数据。
    artifactName: `handpick-\${version}-\${platform}-${arch}.\${ext}`,
    beforePack: beforePack,
    linux: {
        category: "Utility",
        target: [
            { target: "tar.gz", arch },
            { target: "deb", arch },
            { target: "rpm", arch },
            { target: "AppImage", arch },
        ],
        files: [
            "!assets/logo/icon.icns",
            "!assets/logo/icon.ico",
            "!node_modules/onnxruntime-node/bin/napi-v6/win32",
            "!node_modules/onnxruntime-node/bin/napi-v6/darwin",
        ],
    },
    mac: {
        files: [
            "!lib/gtk-open-with",
            "!lib/kde-open-with",
            "!assets/logo/1024x1024.png",
            "!assets/logo/512x512.png",
            "!assets/logo/icon.ico",
            "!node_modules/onnxruntime-node/bin/napi-v6/win32",
            "!node_modules/onnxruntime-node/bin/napi-v6/linux",
        ],
        target: [
            {
                target: "dmg",
                arch: arch,
            },
            {
                target: "zip",
                arch: arch,
            },
        ],
    },
    dmg: {
        writeUpdateInfo: false,
    },
    win: {
        icon: "./assets/logo/icon.ico",
        target: [
            {
                target: "nsis",
                arch: arch,
            },
            {
                target: "zip",
                arch: arch,
            },
        ],
        files: [
            "!lib/gtk-open-with",
            "!lib/kde-open-with",
            "!assets/logo/icon.icns",
            "!assets/logo/1024x1024.png",
            "!assets/logo/512x512.png",
            "!node_modules/onnxruntime-node/bin/napi-v6/linux",
            "!node_modules/onnxruntime-node/bin/napi-v6/darwin",
        ],
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        differentialPackage: false,
    },
};

const archFilter = arch === "arm64" ? "x64" : "arm64";
const otherPlatform = Object.keys(platformMap).filter((i) => i !== platform);

/** @type {string[]|undefined} */
// @ts-ignore
const files = build[platform2]?.files;

// 移除 onnxruntime-node/bin/napi-v6/
files?.push(
    `!node_modules/onnxruntime-node/bin/napi-v6/${platform}/${archFilter}`,
);

// 移除 uiohook-napi/prebuilds
for (const i of otherPlatform) {
    files?.push(`!node_modules/uiohook-napi/prebuilds/${i}-arm64`);
    files?.push(`!node_modules/uiohook-napi/prebuilds/${i}-x64`);
}
files?.push(`!node_modules/uiohook-napi/prebuilds/${platform}-${archFilter}`);

if (arch !== process.arch) {
    execSync("pnpm install --force"); // 安装node-screenshots
}

// 移除 node-screenshots其他平台架构
const nodeScreenshotsList = [
    "win32-x64-msvc",
    "win32-ia32-msvc",
    "win32-arm64-msvc",
    "linux-x64-gnu",
    "linux-x64-musl",
    "linux-arm64-gnu",
    "linux-loong64-gnu",
    "darwin-x64",
    "darwin-arm64",
];
for (const i of nodeScreenshotsList) {
    for (const j of otherPlatform) {
        if (i.startsWith(j)) {
            files?.push(`!node_modules/node-screenshots-${i}`);
        }
    }
    if (i.startsWith(platform)) {
        if (!i.startsWith(`${platform}-${arch}`)) {
            files?.push(`!node_modules/node-screenshots-${i}`);
        }
    }
}

const ignoreDir = [
    ".*",
    "tsconfig*",
    "*.md",
    "*.js",
    "*.yaml",
    "**/*.map",
    "**/*.ts",
    "src",
    "docs",
    "script",
    "test",
    "node_modules/**/*.flow",
    "node_modules/**/*.md",
    "node_modules/**/*.h", // uiohook
    "node_modules/**/*.c", // uiohook
    "node_modules/**/demo*", // js-clipper
    "node_modules/js-clipper/vendor",
    "node_modules/onnxruntime-node/script",
    "node_modules/**/**esm**",
    "node_modules/**/*.es*",
    "node_modules/esearch-ocr/dist/esearch-ocr.js",
];
const ignoreModule = [
    "qr-scanner-wechat",
    "tar",
    "hotkeys-js",
    "hex-to-css-filter",
    "dkh-ui",
    "xtranslator",
    "fabric",
    "jsdom",
    "canvas",
    "remarkable",
    "autolinker",
    "chroma-js",
    "parse5",
    "source-map",
    "acorn",
    "cssstyle",
    "psl",
    "js-clipper",
    "iso-639-3-to-1",
    "fuse.js",
    "iconv-lite",
    "esprima",
    "decimal.js",
    "@xushengfeng/fasttext_wasm",
    "tar-fs",
    "node-abi",
    "tr46",
    "argparse",
    "picture_match",
];
for (const i of ignoreModule) {
    ignoreDir.push(`node_modules/${i}`);
}
for (let i of ignoreDir) {
    i = `!${i}`;
    files?.push(i);
}

module.exports = build;
