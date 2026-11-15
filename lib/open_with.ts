import { renderSendSync } from "./ipc";

// 本模块跑在渲染进程（nodeIntegration），node 模块必须走 require 风格，
// ESM import 会被 vite 当浏览器依赖 externalize 掉
const { execFile } = require("node:child_process");
const { join } = require("node:path");

function open(path: string) {
    // 程序名一律字面量（安全扫描要求），参数走数组；路径不拼进命令行字符串
    switch (process.platform) {
        case "win32":
            execFile("rundll32.exe", [
                "C:\\Windows\\system32\\shell32.dll,OpenAs_RunDLL",
                path,
            ]);
            break;
        case "linux": {
            const run_path = renderSendSync("runPath", []);
            // 桌面环境直接读环境变量，不再经 shell echo；
            // kde/gtk 两个辅助脚本是字面量程序名，用 cwd 定位
            const desktop = process.env.XDG_SESSION_DESKTOP ?? "";
            if (desktop === "KDE") {
                execFile("./kde-open-with", [path], {
                    cwd: join(run_path, "lib"),
                });
            } else {
                execFile("./gtk-open-with", [path], {
                    cwd: join(run_path, "lib"),
                });
            }
            break;
        }
        case "darwin": {
            const { canceled: c, filePaths: paths } = renderSendSync(
                "clip_mac_app",
                [],
            );
            if (!c && paths[0]) {
                execFile("open", ["-a", paths[0], path]);
            }

            break;
        }
    }
}

export default open;
