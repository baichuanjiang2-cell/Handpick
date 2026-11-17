// Win32 GetClipboardSequenceNumber：一次系统调用读一个整数，
// 系统剪贴板任何变化（写入/清空）都会让序号递增。
// 轮询序号代替轮询整包剪贴板，把待机开销从「打开剪贴板+遍历格式+尝试解码」
// 降到微秒级心跳；序号变了才走完整采集。
let seqFn: (() => number) | null | undefined;

function loadSeqFn(): (() => number) | null {
    if (seqFn !== undefined) return seqFn;
    seqFn = null;
    if (process.platform !== "win32") return seqFn;
    try {
        // 原生 FFI 按需加载，与截屏库（screenShot.ts）同一模式
        const koffi = require("koffi") as typeof import("koffi");
        const lib = koffi.load("user32.dll");
        const proto = lib.func("GetClipboardSequenceNumber", "uint32", []);
        seqFn = () => proto();
    } catch (e) {
        console.error("剪贴板序号查询不可用，回退到轮询采集", e);
    }
    return seqFn;
}

/** 当前系统剪贴板序号；平台不支持或加载失败时返回 null */
export function clipboardSequence(): number | null {
    return loadSeqFn()?.() ?? null;
}
