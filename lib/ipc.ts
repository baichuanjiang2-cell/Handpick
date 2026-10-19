// biome-ignore format:
const { ipcRenderer, ipcMain} = require("electron") as typeof import("electron");

import type {
    Display,
    MessageBoxSyncOptions,
    NativeTheme,
    OpenDialogOptions,
} from "electron";
import type {
    BrowserAction,
    ClipItem,
    DingResize,
    DingStart,
    GithubUrlType,
    MainWinType,
    setting,
    translateWinType,
    功能,
} from "../src/ShareTypes";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
    ? 1
    : 2
    ? true
    : false;

// biome-ignore lint/suspicious/noExplicitAny: 相信ai
type IsVoidFunction<T> = T extends (...args: any[]) => any
    ? Equals<ReturnType<T>, void>
    : false;

type VoidKeys<M> = {
    [K in keyof M]: IsVoidFunction<M[K]> extends true ? K : never;
}[keyof M];

/** 录屏选区，坐标为截屏画布像素，相对所选屏幕 */
export type RecordRect = {
    rect: [number, number, number, number];
    id: string;
    w: number;
    h: number;
    r: number;
};

type Message = {
    clip_show: () => void;
    clip_close: () => void;
    clip_ocr: (img: string, type: string) => void;
    clip_search: (img: string, type: string) => void;
    clip_qr: (img: string) => void;
    clip_hide: () => void;
    clip_save: (ext: string) => string;
    clip_ding: (
        img: string,
        type: "translate" | "ding",
        rect: { w: number; h: number; x: number; y: number },
    ) => void;
    clip_mac_app: () => { canceled: boolean; filePaths: string[] };
    clip_record: (
        rect: [number, number, number, number],
        id: string,
        w: number,
        h: number,
        r: number,
    ) => void;
    getMousePos: () => {
        ab: { x: number; y: number };
        po: { x: number; y: number };
    };
    clip_translate: (t: Omit<translateWinType, "type">) => void;
    clip_editor: (img: string) => void;
    /** 普通录屏：固定录制区域；超级录屏：不传 */
    clip_recordx: (opt?: RecordRect) => void;
    save_file_path: (type: string, isVideo?: boolean) => string;
    ok_save: (m: string, isVideo?: boolean) => void;
    clip_stop_long: () => void;
    clip_init: (
        displays: Electron.Display[],
        imgBuffer: Buffer | undefined,
        mainid: number,
        act: 功能 | undefined,
    ) => void;
    open_this_browser: (window_name: number, url: string) => void;
    edit_pic: (img: Buffer<ArrayBufferLike>) => void;
    dialogMessage: (op: MessageBoxSyncOptions) => number;
    openUrl: (url: string) => void;
    noti: (op: { body: string; title: string }) => void;
    windowClose: () => void;
    windowMax: () => void;
    windowMinimize: () => void;
    /** 最大化 / 还原切换 */
    windowMaximize: () => void;
    appVersion: () => string;
    /** 控制中心主内容区的矩形（窗口内坐标），栏目子视图按它对齐 */
    shellSlot: (rect: { x: number; y: number; w: number; h: number }) => void;
    /** 渲染→主：控制中心切了栏目，主进程管理子视图显隐 */
    shellSection: (name: ShellSection) => void;
    /** 主→渲染：请求控制中心切栏目（如 appAction 的「设置」） */
    shellGo: (name: ShellSection) => void;
    windowTop: (ignore: boolean) => void;
    windowTopest: (ignore: boolean) => void;
    windowIgnoreMouse: (top: boolean) => void;
    windowShow: () => void;
    runPath: () => string;
    systemLan: () => string;
    feedbackBug: (op?: {
        title?: string;
        main?: string;
        steps?: string;
        expected?: string;
        more?: string;
    }) => string;
    feedbackFeature: (op?: {
        title?: string;
        main?: string;
    }) => string;
    selectPath: (
        defalutPath: string,
        p: OpenDialogOptions["properties"],
    ) => string;
    tabView: (id: number, type: BrowserAction) => void;
    tabViewSize: (size: { top: number; bottom: number }) => void;
    viewEvent: (type: BrowserAction | "add_history" | "browser") => void;
    hotkey:
        | ((
              type: "快捷键",
              name: keyof setting["快捷键"],
              key: string,
          ) => boolean)
        | ((type: "快捷键2", name: 功能, key: string) => boolean);
    reloadMainFromSetting: () => void;
    getDefaultSetting: () => setting;
    reload: () => void;
    exit: () => void;
    clearStorage: () => void;
    clearCache: () => void;
    move_user_data: (target: string) => void;
    getAutoStart: () => boolean;
    setAutoStart: (value: boolean) => void;
    theme: (t: NativeTheme["themeSource"]) => void;
    dingIgnore: (ignore: boolean) => void;
    recorderReady: () => void;
    recordInit: (
        id: string,
        r: [number, number, number, number],
        screenW: number,
        screenH: number,
    ) => void;
    recordStartStop: () => void;
    recordStop: () => void;
    recordStart: () => void;
    recordTime: (time: string) => void;
    recordCamera: (camera: boolean) => void;
    recordState: (state: "stop" | "pause") => void;
    recordSavePath: (ext: string) => void;
    dingShare: (
        data:
            | { type: "close"; id: string; closeAll: boolean }
            | { type: "move_start"; more: DingStart }
            | { type: "move_end" }
            | { type: "back"; id: string }
            | { type: "resize"; more: DingResize },
    ) => void;
    addDing: (
        wid: number,
        x: number,
        y: number,
        w: number,
        h: number,
        url: string,
        type: "translate" | "ding",
    ) => void;
    superRecorderInit: (sourceId: string, fixed?: RecordRect) => void;
    superPhotoEditorInit: (img: string) => void;
    recordMemWarning: () => void;
    translatorInit: (
        id: number,
        display: Display[],
        rect: { x: number; y: number; w: number; h: number },
    ) => void;
    dingMouse: (x: number, y: number) => void;
    recordSavePathReturn: (path: string) => void; // todo remove
    editorInit: (name: number, list: MainWinType) => void;
    browserNew: (id: number, url: string) => void;
    browserTitle: (id: number, title: string) => void;
    browserIcon: (id: number, icon: string) => void;
    browserUrl: (id: number, url: string) => void;
    browserLoad: (id: number, load: boolean) => void;
    userDataPath: () => string;
    githubUrl: (path: string, _type?: GithubUrlType | "auto") => string;
    getScreens: () => Display[];
    getLogs: () => {
        from: "screenShot" | "ding" | "mainWindow" | "translator";
        message: string;
        type: "info" | "warning" | "error";
        lineCount: number;
    }[];
    /** trash 为 true 时只返回回收站（已删除）条目，否则只返回正常条目 */
    clipHistoryGet: (trash: boolean) => {
        items: ClipItem[];
        paused: boolean;
        warning: string | null;
    };
    clipHistoryThumb: (id: string) => string;
    /** 原图的 dataURL，供面板内放大查看；记录不存在或不是图片时返回 "" */
    clipHistoryFull: (id: string) => string;
    /** 落盘是否已加密；warning 非 null 表示降级为明文 */
    clipHistoryEncryption: () => {
        encrypted: boolean;
        warning: string | null;
    };
    clipHistoryCopy: (id: string) => void;
    /** 就地修改一条文本记录，返回是否真的改动了（空内容会被拒绝） */
    clipHistoryEditText: (id: string, text: string) => boolean;
    /** 就地修改一条文件记录的路径列表，返回是否真的改动了（空列表会被拒绝） */
    clipHistoryEditFiles: (id: string, files: string[]) => boolean;
    clipHistoryPin: (id: string, pinned: boolean) => void;
    clipHistoryRemove: (id: string) => void;
    clipHistoryRestore: (id: string) => void;
    clipHistoryPurge: (id: string) => void;
    clipHistoryEmptyTrash: () => void;
    clipHistoryClear: () => void;
    clipHistorySetPaused: (paused: boolean) => void;
    /** 设置页改了剪贴板历史配置后即时生效（轻量版，不刷新托盘菜单） */
    clipHistoryApplySetting: () => void;
    /** 主进程 → 页面：历史发生变化 */
    clipHistoryChange: () => void;
    /** 控制中心 / 托盘共用的动作派发：一张动作表、两处入口，避免入口丢功能。
     *  同步返回开关项的最新状态，渲染端不用再问一次，免得读到执行前的旧值 */
    appAction: (action: AppAction | "getState") => AppActionState;
};

/** 控制中心的栏目。clipboard 用壳本页 DOM，其余是挂在主内容区的子视图 */
type ShellSection = "clipboard" | "translate" | "aiVision" | "setting";

/** 工具组里开关项的当前状态 */
type AppActionState = {
    paused: boolean;
    browserOpen: boolean;
    reuseMain: boolean;
    mainMode: "auto" | "search" | "translate";
    dev: boolean;
};

/** 软件全局动作清单。托盘菜单与控制中心功能清单都只派发这组动作 */
type AppAction =
    | "autoOpen"
    | "clipSearch"
    | "selectionSearch"
    | "clipboardSearch"
    | "showCenter"
    | "pauseToggle"
    | "ocr"
    | "imageSearch"
    | "superRecord"
    | "browserOpenToggle"
    | "dingFromClipboard"
    | "mainModeAuto"
    | "mainModeSearch"
    | "mainModeTranslate"
    | "reuseMainToggle"
    | "mainPage"
    | "settings"
    | "help"
    | "devExit"
    | "checkUpdate"
    | "feedback"
    | "restart"
    | "quickShot"
    | "exit";

const name = "ipc";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const renderOnData = new Map<string, ((data: any) => void)[]>();
const mainOnData = new Map<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ((data: any, event: Electron.IpcMainEvent) => any)[]
>();

function mainSend<K extends keyof Message>(
    webContents: Electron.WebContents | undefined,
    key: K,
    data: Parameters<Message[K]>,
): void {
    if (!isKnownKey(key)) return;
    webContents?.send(name, key, data);
}

function renderOn<K extends keyof Message>(
    key: K,
    callback: (data: Parameters<Message[K]>) => void,
) {
    if (!isKnownKey(key) || typeof callback !== "function") return;
    const callbacks = renderOnData.get(key) || [];
    callbacks.push(callback);
    renderOnData.set(key, callbacks);
}

/**
 * 通道名合法性：显式 switch 枚举全部合法通道。
 * 这是 Message 钥匙的闭集，新增通道时必须同步补 case。
 */
function isKnownKey(key: unknown): key is keyof Message {
    switch (key) {
        case "addDing":
        case "appAction":
        case "appVersion":
        case "browserIcon":
        case "browserLoad":
        case "browserNew":
        case "browserTitle":
        case "browserUrl":
        case "clearCache":
        case "clearStorage":
        case "clipHistoryApplySetting":
        case "clipHistoryChange":
        case "clipHistoryClear":
        case "clipHistoryCopy":
        case "clipHistoryEditFiles":
        case "clipHistoryEditText":
        case "clipHistoryEmptyTrash":
        case "clipHistoryEncryption":
        case "clipHistoryFull":
        case "clipHistoryGet":
        case "clipHistoryPin":
        case "clipHistoryPurge":
        case "clipHistoryRemove":
        case "clipHistoryRestore":
        case "clipHistorySetPaused":
        case "clipHistoryThumb":
        case "clip_close":
        case "clip_ding":
        case "clip_editor":
        case "clip_hide":
        case "clip_init":
        case "clip_mac_app":
        case "clip_ocr":
        case "clip_qr":
        case "clip_record":
        case "clip_recordx":
        case "clip_save":
        case "clip_search":
        case "clip_show":
        case "clip_stop_long":
        case "clip_translate":
        case "dialogMessage":
        case "dingIgnore":
        case "dingMouse":
        case "dingShare":
        case "edit_pic":
        case "editorInit":
        case "exit":
        case "feedbackBug":
        case "feedbackFeature":
        case "getAutoStart":
        case "getDefaultSetting":
        case "getLogs":
        case "getMousePos":
        case "getScreens":
        case "githubUrl":
        case "hotkey":
        case "move_user_data":
        case "noti":
        case "ok_save":
        case "openUrl":
        case "open_this_browser":
        case "recordCamera":
        case "recordInit":
        case "recordMemWarning":
        case "recordSavePath":
        case "recordSavePathReturn":
        case "recordStart":
        case "recordStartStop":
        case "recordState":
        case "recordStop":
        case "recordTime":
        case "recorderReady":
        case "reload":
        case "reloadMainFromSetting":
        case "runPath":
        case "save_file_path":
        case "selectPath":
        case "setAutoStart":
        case "shellGo":
        case "shellSection":
        case "shellSlot":
        case "superPhotoEditorInit":
        case "superRecorderInit":
        case "systemLan":
        case "tabView":
        case "tabViewSize":
        case "theme":
        case "translatorInit":
        case "userDataPath":
        case "viewEvent":
        case "windowClose":
        case "windowIgnoreMouse":
        case "windowMax":
        case "windowMaximize":
        case "windowMinimize":
        case "windowShow":
        case "windowTop":
        case "windowTopest":
            return true;
        default:
            return false;
    }
}

function renderSend<K extends keyof Message>(
    key: K,
    data: Parameters<Message[K]>,
): void {
    if (!isKnownKey(key)) return;
    ipcRenderer.send(name, key, data);
}

function renderSendSync<K extends keyof Message>(
    key: K,
    data: Parameters<Message[K]>,
): ReturnType<Message[K]> {
    if (!isKnownKey(key)) return undefined as ReturnType<Message[K]>;
    return ipcRenderer.sendSync(name, key, data);
}

function mainOn<K extends keyof Message>(
    key: K,
    callback: (
        data: Parameters<Message[K]>,
        event: Electron.IpcMainEvent,
    ) => ReturnType<Message[K]> | Promise<ReturnType<Message[K]>>,
) {
    if (!isKnownKey(key) || typeof callback !== "function") return;
    const callbacks = mainOnData.get(key) || [];
    callbacks.push(callback);
    mainOnData.set(key, callbacks);
}

/**
 * 渲染进程之间的通信，主进程起到中转作用
 */
function mainOnReflect<K extends VoidKeys<Message>>(
    key: K,
    callback: (
        data: Parameters<Message[K]>,
        event: Electron.IpcMainEvent,
    ) => Electron.WebContents[],
) {
    // @ts-ignore 适用于无返回的函数
    mainOn(key, async (data, event) => {
        const webContents = await callback(data, event);
        if (webContents) {
            for (const wc of webContents) {
                wc.send(name, key, data);
            }
        }
    });
}

ipcRenderer?.on(name, (event, key, data) => {
    if (!isKnownKey(key)) return;
    const callbacks = renderOnData.get(key);
    if (callbacks) {
        for (const callback of callbacks) {
            callback(data);
        }
    } else {
        console.log(`ipcRenderer.on: ${key} not found`);
    }
});

ipcMain?.on(name, async (event, key, data) => {
    if (!isKnownKey(key)) {
        event.returnValue = null;
        return;
    }
    const callbacks = mainOnData.get(key);
    if (callbacks) {
        for (const callback of callbacks) {
            const result = await callback(data, event);
            if (result !== undefined) {
                event.returnValue = result;
            }
        }
        // renderSendSync 的调用方在等 returnValue 才被唤醒。handler 返回 undefined
        // 时（用户取消保存对话框、或本来就没有返回值的 handler）它永远不会被赋值，
        // 调用方所在的渲染进程就此永久阻塞——全屏置顶的截屏覆盖层连 Esc 都收不到。
        // 兜一个 null，让"取消"变成一个可判定的返回值（调用方已有 if (!x) return 分支）。
        if (event.returnValue === undefined) {
            event.returnValue = null;
        }
    } else {
        console.log(`ipcMain.on: ${key} not found`);
    }
});

export {
    mainSend,
    renderOn,
    renderSend,
    renderSendSync,
    mainOn,
    mainOnReflect,
};
export type { AppAction, AppActionState, ShellSection };
