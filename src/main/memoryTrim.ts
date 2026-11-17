// 待机工作集裁剪：没有任何可见窗口时，把主进程与各 Chromium 子进程的物理页
// 移交系统待备列表（SetProcessWorkingSetSize(-1,-1)）。这与 Chrome 最小化时
// 的做法一致：页面不会丢，恢复时按需软调页回（毫秒级），系统内存紧张时系统可
// 立即回收这些待备页。
import { app } from "electron";

// 注意：PROCESS_SET_QUOTA 是 0x0100，不是 0x0400（那是 PROCESS_QUERY_INFORMATION）；
// 权限位给错会拿到 ERROR_ACCESS_DENIED(5)。
const PROCESS_SET_QUOTA = 0x0100;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const ACCESS = PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION;

type TrimFns = {
    /** 裁剪任意进程；pid 为 0 表示当前进程（走 -1 伪句柄） */
    trimPid: (pid: number) => boolean;
};

let fns: TrimFns | null | undefined;

function loadTrimFns(): TrimFns | null {
    if (fns !== undefined) return fns;
    fns = null;
    if (process.platform !== "win32") return fns;
    try {
        // 与 clipboardSeq.ts 同一模式：koffi 按需加载，失败自动降级为不裁剪。
        // 用 kernel32 的 SetProcessWorkingSetSize 原名导出：psapi.dll 里那个
        // 是转发导出，koffi 不解析转发，会报 Cannot find function。
        // 句柄一律用 intptr 整数传递：-1 是 GetCurrentProcess 的伪句柄，
        // 实测有效；void * 的指针对象中转反而调不动。
        const koffi = require("koffi") as typeof import("koffi");
        const kernel32 = koffi.load("kernel32.dll");
        const openProcess = kernel32.func("OpenProcess", "intptr", [
            "uint32",
            "int32",
            "uint32",
        ]);
        const closeHandle = kernel32.func("CloseHandle", "int32", ["intptr"]);
        const setWorkingSetSize = kernel32.func(
            "SetProcessWorkingSetSize",
            "int32",
            ["intptr", "intptr", "intptr"],
        );
        const trimHandle = (h: number): boolean =>
            setWorkingSetSize(h, -1, -1) !== 0;
        fns = {
            trimPid: (pid) => {
                if (pid <= 0) return trimHandle(-1); // 当前进程伪句柄
                const h = openProcess(ACCESS, 0, pid);
                if (!h) return false;
                try {
                    return trimHandle(h);
                } finally {
                    closeHandle(h);
                }
            },
        };
        // 自检：裁剪自己必须成功，否则整个机制是坏的，宁可停用
        if (!fns.trimPid(0)) {
            console.error("工作集裁剪自检失败，停用");
            fns = null;
        }
    } catch (e) {
        console.error("工作集裁剪不可用", e);
        fns = null;
    }
    return fns;
}

/** 裁剪本应用全部进程的工作集；非 Windows 或 FFI 不可用时静默跳过 */
export function trimWorkingSets() {
    const f = loadTrimFns();
    if (!f) return;
    const pids = [0]; // 0 = 当前（主）进程
    for (const m of app.getAppMetrics()) {
        if (m.pid > 0) pids.push(m.pid);
    }
    for (const pid of pids) {
        try {
            f.trimPid(pid);
        } catch {}
    }
}
