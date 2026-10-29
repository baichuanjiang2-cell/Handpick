import {
    button,
    type ElType,
    ele,
    image,
    input,
    textarea,
    txt,
    view,
} from "dkh-ui";
import type { AppAction, AppActionState, ShellSection } from "../../../lib/ipc";
import { renderOn, renderSend, renderSendSync } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import type { IconType } from "../../iconTypes";
import type { ClipItem } from "../../ShareTypes";
import { iconEl, windowControls } from "../lib/ui";
import { getImgUrl, initStyle, setTitle } from "../root/root";

initStyle(store);
setTitle(t("剪贴板历史"));

document.body.classList.add("glass", "ch-root");

const NARROW = window.matchMedia("(max-width: 860px)");
const PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function icon(name: IconType) {
    const el = iconEl(name, "ch-icon");
    if (name === "star-fill") el.class("ch-star");
    return el;
}

function starIcon() {
    return image(getImgUrl("star-fill.svg"), "")
        .class("ch-icon")
        .class("ch-star");
}

function spacer() {
    return view().class("ch-spacer");
}

function fmtTime(ts: number, withDay = false) {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
    return withDay ? `${dayLabel(ts)} ${time}` : time;
}

function dayStart(ts: number) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayKey(ts: number) {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayLabel(ts: number) {
    const now = new Date();
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();
    const yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
    ).getTime();
    const d = dayStart(ts);
    if (d === today) return t("今天");
    if (d === yesterday) return t("昨天");
    const date = new Date(ts);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function serialOf(ts: number) {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
        d.getHours(),
    )}${p(d.getMinutes())}`;
}

function atDay(ts: number, offset: number) {
    const now = new Date();
    return (
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - offset,
        ).getTime() === dayStart(ts)
    );
}

// ── 控制中心的功能清单 ──────────────────────────────────────────
type FeatureItem = {
    action: AppAction | ((v: string) => void);
    label: string;
    icon: IconType;
    group: string;
    size?: "big";
    state?: "bool" | "seg";
    segLabel?: (v: string) => string;
    dev?: boolean;
    _el?: ReturnType<typeof button>;
};

const sections: { key: ShellSection; label: string; icon: IconType }[] = [
    { key: "clipboard", label: "剪贴板", icon: "paste" },
    { key: "translate", label: "翻译", icon: "translate" },
    { key: "aiVision", label: "AI 识图", icon: "ai_check" },
    { key: "setting", label: "设置", icon: "setting" },
];

const featureGroups: [string, FeatureItem[]][] = [
    [
        "搜索与识别",
        [
            {
                action: "autoOpen",
                label: "自动识别",
                icon: "scan",
                group: "搜索与识别",
                size: "big",
            },
            {
                action: "quickShot",
                label: "快速截屏",
                icon: "camera",
                group: "搜索与识别",
                size: "big",
            },
            {
                action: "clipSearch",
                label: "截屏搜索",
                icon: "search",
                group: "搜索与识别",
            },
            {
                action: "selectionSearch",
                label: "选中搜索",
                icon: "text",
                group: "搜索与识别",
            },
            {
                action: "clipboardSearch",
                label: "剪贴板搜索",
                icon: "paste",
                group: "搜索与识别",
            },
            {
                action: "ocr",
                label: "文字识别（OCR）",
                icon: "ocr",
                group: "搜索与识别",
            },
            {
                action: "imageSearch",
                label: "以图搜图",
                icon: "img",
                group: "搜索与识别",
            },
        ],
    ],
    [
        "录屏与贴图",
        [
            {
                action: "superRecord",
                label: "超级录屏",
                icon: "start_record",
                group: "录屏与贴图",
                size: "big",
            },
            {
                action: "dingFromClipboard",
                label: "从剪贴板贴图",
                icon: "ding",
                group: "录屏与贴图",
            },
        ],
    ],
    [
        "窗口",
        [
            {
                action: "mainPage",
                label: "主页面",
                icon: "main",
                group: "窗口",
                size: "big",
            },
            {
                action: "browserOpenToggle",
                label: "浏览器打开",
                icon: "browser",
                group: "窗口",
                state: "bool",
            },
            {
                action: "reuseMainToggle",
                label: "复用主页面",
                icon: "add_history",
                group: "窗口",
                state: "bool",
            },
        ],
    ],
    [
        "帮助与系统",
        [
            {
                action: "help",
                label: "教程帮助",
                icon: "help",
                group: "帮助与系统",
            },
            {
                action: "checkUpdate",
                label: "检查更新",
                icon: "reload",
                group: "帮助与系统",
            },
            {
                action: "feedback",
                label: "反馈",
                icon: "link",
                group: "帮助与系统",
            },
            {
                action: "restart",
                label: "重启",
                icon: "recume",
                group: "帮助与系统",
            },
            {
                action: "devExit",
                label: "退出开发者模式",
                icon: "hide",
                group: "帮助与系统",
                dev: true,
            },
            {
                action: "exit",
                label: "退出",
                icon: "close",
                group: "帮助与系统",
            },
        ],
    ],
];

function act(a: AppAction | ((v: string) => void)): AppActionState {
    return renderSendSync("appAction", [a as AppAction]);
}

function applyState(state: AppActionState) {
    for (const [, items] of featureGroups) {
        for (const item of items) {
            const el = item._el;
            if (!el) continue;
            if (item.state === "bool") {
                const on =
                    item.action === "browserOpenToggle"
                        ? state.browserOpen
                        : item.action === "reuseMainToggle"
                          ? state.reuseMain
                          : false;
                el.el.classList.toggle("is-on", on);
            }
            if (item.state === "seg") {
                el.el.innerText = item.segLabel
                    ? item.segLabel(state.mainMode)
                    : state.mainMode;
            }
        }
    }
}

// ── 状态 ────────────────────────────────────────────────────────
let trash = false;
let keyword = "";
let paused = false;
let warning = "";
const typeFilter = new Set<ClipItem["type"]>();
let selectedId: string | null = null;
let editingId: string | null = null;
let editingDraft = "";
let allItems: ClipItem[] = [];
let visibleItems: ClipItem[] = [];
let sheetOpen = false;

type Kind = "text" | "link" | "command" | "code" | "log" | "image" | "file";

function kindOf(item: ClipItem): { key: Kind; label: string; icon: IconType } {
    if (item.type === "image")
        return { key: "image", label: t("图片"), icon: "img" };
    if (item.type === "file")
        return { key: "file", label: t("文件"), icon: "file" };
    const text = (item.text ?? "").trim();
    if (/^(npm ERR!|ERR!|error[: ]|fatal[: ]|traceback)/i.test(text))
        return { key: "log", label: t("日志"), icon: "text" };
    if (/^https?:\/\//i.test(text))
        return { key: "link", label: t("链接"), icon: "link" };
    if (
        /^(pnpm|npm|yarn|npx|git|node|cd|ls|curl|wget|docker|python|pip)\b/.test(
            text,
        )
    )
        return { key: "command", label: t("命令"), icon: "text" };
    if (/^--[a-z][\w-]*\s*:/i.test(text))
        return { key: "code", label: t("代码"), icon: "text" };
    return { key: "text", label: t("文本"), icon: "text" };
}

function basename(path: string) {
    return path.split(/[\\/]/).pop() || path;
}

function dirname(path: string) {
    const name = basename(path);
    return path.slice(0, Math.max(0, path.length - name.length - 1));
}

function titleOf(item: ClipItem) {
    if (item.type === "image") return t("图片");
    if (item.type === "file") return basename((item.files ?? [])[0] ?? "");
    return (item.text ?? "").replace(/\s+/g, " ").trim() || "—";
}

function hostOf(text: string) {
    try {
        return new URL(text.trim()).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function lineCount(text: string) {
    return text.split("\n").length;
}

function metaOf(item: ClipItem) {
    if (item.type === "image") return `${item.w ?? "?"} × ${item.h ?? "?"}`;
    if (item.type === "file") {
        const files = item.files ?? [];
        return files.length > 1
            ? `${files.length} ${t("个路径")}`
            : t("单个路径");
    }
    const kind = kindOf(item);
    const text = item.text ?? "";
    if (kind.key === "link") return hostOf(text) || `${text.length} ${t("字")}`;
    if (kind.key === "command" || kind.key === "code" || kind.key === "log")
        return `${lineCount(text)} ${t("行")}`;
    return `${text.length} ${t("字")}`;
}

function subOf(item: ClipItem) {
    if (item.type === "image")
        return `${t("图片")} · ${item.w ?? "?"} × ${item.h ?? "?"}`;
    if (item.type === "file") {
        const files = item.files ?? [];
        if (files.length > 1)
            return `${t("文件")} · ${files.length} ${t("个路径")}`;
        const dir = dirname(files[0] ?? "");
        return dir ? `${t("文件")} · ${dir}` : t("文件");
    }
    return `${kindOf(item).label} · ${metaOf(item)}`;
}

function matchKeyword(item: ClipItem) {
    if (!keyword) return true;
    if (item.type === "text")
        return (item.text ?? "").toLowerCase().includes(keyword);
    if (item.type === "file")
        return (item.files ?? []).join("\n").toLowerCase().includes(keyword);
    return false;
}

function matchItem(item: ClipItem) {
    if (typeFilter.size > 0 && !typeFilter.has(item.type)) return false;
    return matchKeyword(item);
}

function defaultSelection(list: ClipItem[]) {
    return (list.find((i) => !i.pinned) ?? list[0])?.id ?? null;
}

function neighborOf(id: string) {
    const at = visibleItems.findIndex((i) => i.id === id);
    return visibleItems[at + 1]?.id ?? visibleItems[at - 1]?.id ?? null;
}

// ── 全局工具条与侧边栏 ──────────────────────────────────────────

const appVersion = (() => {
    try {
        return renderSendSync("appVersion", []) ?? "";
    } catch {
        return "";
    }
})();

const brand = image(getImgUrl("main.svg"), "eSearch").class("ch-logo");
const headTitle = txt(t("控制中心")).class("ch-scope");

const quick = ele("div").class("ch-quick");
for (const [name, title, action] of [
    ["camera", "快速截屏", "quickShot"],
    ["scan", "自动识别", "autoOpen"],
    ["paste", "回到剪贴板", null],
] as const) {
    const btn = button(icon(name))
        .class("ch-head-btn")
        .attr({ title: t(title) })
        .on("click", () => {
            if (action) {
                const st = renderSendSync("appAction", [action]);
                applyState(st);
            } else goSection("clipboard");
        });
    quick.add(btn);
}

const statusDot = view().class("ch-dot");
const statusText = txt(t("正在记录"), true).class("ch-status-text");
const recordStatus = view("x").class("ch-status").add([statusDot, statusText]);
const pauseIcon = image(getImgUrl("pause.svg"), "");
const pauseEl = button(pauseIcon)
    .class("ch-pause")
    .attr({ title: t("暂停记录") })
    .on("click", () => renderSend("clipHistorySetPaused", [!paused]));

type AppearanceMode = "system" | "light" | "dark";
const appearanceLabels: Record<AppearanceMode, string> = {
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
};
const appearanceOrder: AppearanceMode[] = ["system", "light", "dark"];
let appearanceMode = store.get("全局.深色模式");
const appearanceBtn = button(icon("contrast"))
    .class("ch-head-btn")
    .class("ch-appearance");
function applyAppearance() {
    appearanceBtn.attr({
        title: `${t("外观")}：${t(appearanceLabels[appearanceMode])}`,
    });
}
appearanceBtn.on("click", () => {
    const at = appearanceOrder.indexOf(appearanceMode);
    appearanceMode = appearanceOrder[(at + 1) % appearanceOrder.length];
    renderSend("theme", [appearanceMode]);
    renderSend("shellRefreshSetting", []);
    applyAppearance();
    toast(`${t("外观")}：${t(appearanceLabels[appearanceMode])}`);
});
applyAppearance();
document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    appearanceMode = store.get("全局.深色模式");
    applyAppearance();
});

const winCtl = windowControls().style({ marginLeft: "0" });
winCtl.class("ch-win");
const headDivider = view().class("ch-head-divider");
const headActions = view("x").class("ch-head-actions");
headActions.el.style.setProperty("-webkit-app-region", "no-drag");
headActions.add([quick, recordStatus, pauseEl, appearanceBtn]);

const head = view("x")
    .class("ch-head")
    .add([
        brand,
        txt("eSearch", true).class("ch-brand-name"),
        view().class("ch-sep"),
        headTitle,
        spacer(),
        headActions,
        headDivider,
        winCtl,
    ]);
head.el.style.setProperty("-webkit-app-region", "drag");

const nav = view("y").class("ch-nav");
const sectionBtns = new Map<ShellSection, ElType<HTMLElement>>();
let currentSection: ShellSection = "clipboard";

function goSection(name: ShellSection) {
    if (currentSection === name) return;
    currentSection = name;
    appearanceMode = store.get("全局.深色模式");
    applyAppearance();
    appearanceBtn.el.classList.toggle("ch-hidden", name === "setting");
    for (const [key, el] of sectionBtns)
        el.el.classList.toggle("is-active", key === name);
    showLocal(name === "clipboard");
    renderSend("shellSection", [name]);
    setTitle(name === "clipboard" ? t("剪贴板历史") : t("控制中心"));
    closeSheet();
    if (name === "clipboard") render();
}

for (const sec of sections) {
    const el = button()
        .class("ch-nav-btn")
        .add([icon(sec.icon), txt(t(sec.label))])
        .attr({ title: t(sec.label) })
        .on("click", () => goSection(sec.key));
    if (sec.key === currentSection) el.class("is-active");
    sectionBtns.set(sec.key, el);
    nav.add(el);
}

function toolGroupEl() {
    const headBtn = button()
        .class("ch-tools-head")
        .add([
            icon("super_edit"),
            txt(t("工具组")).class("ch-tools-title"),
            txt(
                String(
                    featureGroups.reduce(
                        (n, [, items]) =>
                            n + items.filter((i) => !i.dev).length,
                        0,
                    ),
                ),
                true,
            )
                .class("ch-num")
                .class("ch-tools-count"),
            icon("down"),
        ]);
    const body = view("y").class("ch-tools-body");
    let open = true;
    for (const [groupName, items] of featureGroups) {
        body.add(txt(t(groupName), true).class("ch-tool-cat"));
        for (const item of items) {
            const row = button()
                .class("ch-tool")
                .add([icon(item.icon), txt(t(item.label))])
                .attr({
                    title: t(item.label),
                    ...(item.dev ? { "data-dev": "" } : {}),
                })
                .on("click", () => applyState(act(item.action)));
            item._el = row;
            body.add(row);
        }
    }
    headBtn.on("click", () => {
        open = !open;
        headBtn.el.classList.toggle("is-open", open);
        body.el.classList.toggle("ch-hidden", !open);
    });
    headBtn.el.classList.add("is-open");
    return view("y").class("ch-tools").add([headBtn, body]);
}

const modeBtns = new Map<string, ElType<HTMLElement>>();
const modeRow = view("x").class("ch-mode-row");
const modeSeg = view("y").class("ch-mode");
modeSeg.add(txt(t("主页面模式")).class("ch-mode-label"));
function applyMode(m: string) {
    for (const [key, el] of modeBtns)
        el.el.classList.toggle("is-active", key === m);
}
for (const [key, label] of [
    ["auto", "自动"],
    ["search", "搜索"],
    ["translate", "翻译"],
] as const) {
    const el = button(txt(t(label)))
        .class("ch-mode-btn")
        .on("click", () => {
            const st = act(
                `mainMode${key[0].toUpperCase()}${key.slice(1)}` as AppAction,
            );
            applyMode(st.mainMode);
        });
    modeBtns.set(key, el);
    modeRow.add(el);
}
modeSeg.add(modeRow);
modeSeg.add(txt(appVersion, true).class("ch-version"));

const sideScroll = view("y").class("ch-side-scroll").add([nav, toolGroupEl()]);
const side = view("y").class("ch-side").add([sideScroll, modeSeg]);

// ── 主区域：页头、查询、列表、记录纸 ────────────────────────────

const pageTitle = ele("h1").class("ch-page-title").add(t("剪贴板"));
const findingEl = txt("", true).class("ch-finding");
const summaryEl = txt("", true).class("ch-summary");
const tallyEl = txt("", true).class("ch-tally");

const trashIcon = icon("delete");
const trashLabel = txt(t("回收站"));
const trashBtn = button()
    .class("ch-text-btn")
    .add([trashIcon, trashLabel])
    .on("click", () => {
        trash = !trash;
        editingId = null;
        editingDraft = "";
        selectedId = null;
        closeSheet();
        render();
    });

const clearLabel = txt(t("清空"));
const clearBtn = button()
    .class("ch-text-btn")
    .add([icon("clear"), clearLabel])
    .on("click", () => {
        if (trash) renderSend("clipHistoryEmptyTrash", []);
        else renderSend("clipHistoryClear", []);
    });

const pageActions = view("x")
    .class("ch-page-actions")
    .add([trashBtn, clearBtn]);
const pageSide = ele("div").class("ch-page-side").add([tallyEl, pageActions]);
const pageHead = ele("div")
    .class("ch-page-head")
    .add([
        view("y").class("ch-page-lead").add([pageTitle, findingEl, summaryEl]),
        pageSide,
    ]);

const pausedText = txt("", true).class("ch-paused-text");
const resumeBtn = button(txt(t("继续记录")))
    .class("ch-paused-btn")
    .on("click", () => renderSend("clipHistorySetPaused", [false]));
const pausedBar = view("x")
    .class("ch-paused")
    .class("ch-hidden")
    .add([icon("pause"), pausedText, spacer(), resumeBtn]);

const warnText = txt("", true).class("ch-warning-text");
const warnEl = view("x")
    .class("ch-warning")
    .class("ch-hidden")
    .add([icon("help"), warnText]);

const searchEl = input("search")
    .class("ch-search-input")
    .attr({
        placeholder: t("搜索文字、路径"),
        autocomplete: "off",
    });
searchEl.el.setAttribute("aria-label", t("搜索"));
searchEl.on("input", () => {
    keyword = searchEl.el.value.trim().toLowerCase();
    cancelEditIfAny();
    closeSheet();
    render();
});
const searchWrap = view("x")
    .class("ch-search")
    .add([icon("search"), searchEl, txt("/", true).class("ch-slash")]);

const filterDefs = [
    { key: "all", label: "全部" },
    { key: "text", label: "文本" },
    { key: "image", label: "图片" },
    { key: "file", label: "文件" },
] as const;
const filterEls: {
    key: (typeof filterDefs)[number]["key"];
    btn: ElType<HTMLElement>;
    count: ElType<HTMLElement>;
}[] = [];
const filters = view("x").class("ch-filters");
for (const def of filterDefs) {
    const count = txt("", true).class("ch-filter-count");
    const btn = button()
        .class("ch-filter")
        .data({ filter: def.key })
        .add([txt(t(def.label)), count]);
    btn.el.setAttribute("aria-pressed", "false");
    btn.on("click", () => {
        if (def.key === "all") typeFilter.clear();
        else if (typeFilter.has(def.key)) typeFilter.delete(def.key);
        else typeFilter.add(def.key);
        cancelEditIfAny();
        closeSheet();
        render();
    });
    filterEls.push({ key: def.key, btn, count });
    filters.add(btn);
}
const query = ele("div").class("ch-query").add([searchWrap, filters]);

const listMeta = txt("", true).class("ch-list-meta");
const listHead = view("x")
    .class("ch-list-head")
    .add([ele("h2").add(t("记录")), listMeta]);
const listScroll = view("y").class("ch-list-scroll");
const hintDesktop = txt(t("单击 / ↑↓ 选择 · 双击复制")).class("ch-hint");
const hintTouch = txt(t("点开记录查看与复制"))
    .class("ch-hint")
    .class("ch-hint-touch");
const footCount = txt("", true).class("ch-list-count");
const listFoot = view("x")
    .class("ch-list-foot")
    .add([hintDesktop, hintTouch, footCount]);
const listPane = view("y")
    .class("ch-list-pane")
    .add([listHead, listScroll, listFoot]);

const detailPane = ele("aside").class("ch-detail");
detailPane.el.setAttribute("aria-label", t("记录"));

const scrim = view()
    .class("ch-scrim")
    .class("ch-hidden")
    .on("click", () => closeSheet());

const workspace = view().class("ch-workspace").add([listPane, detailPane]);
const sheet = view("y")
    .class("ch-sheet")
    .add([pageHead, pausedBar, warnEl, query, workspace, scrim]);
const localPane = view("y").class("ch-local").add(sheet);
const main = view("y").class("ch-main").add(localPane);
const body = view("x").class("ch-body").add([side, main]);
const shell = view("y").class("ch-shell").add([head, body]);
shell.addInto();

function showLocal(show: boolean) {
    localPane.el.classList.toggle("ch-hidden", !show);
}

// ── 选区 / 详情抽屉 ─────────────────────────────────────────────

function openSheet() {
    if (!NARROW.matches) return;
    sheetOpen = true;
    detailPane.el.classList.add("is-open");
    scrim.el.classList.remove("ch-hidden");
    requestAnimationFrame(() =>
        detailPane.el
            .querySelector<HTMLElement>("[data-detail-act='close-detail']")
            ?.focus({ preventScroll: true }),
    );
}

function closeSheet() {
    sheetOpen = false;
    detailPane.el.classList.remove("is-open");
    scrim.el.classList.add("ch-hidden");
}

NARROW.addEventListener("change", () => {
    if (!NARROW.matches) closeSheet();
});

function syncRowSelection() {
    for (const row of listScroll.el.querySelectorAll<HTMLElement>(".ch-row")) {
        const on = row.dataset.id === selectedId;
        row.classList.toggle("is-selected", on);
        row.querySelector(".ch-row-main")?.setAttribute(
            "aria-pressed",
            String(on),
        );
    }
}

function selectRow(id: string, focus = false) {
    if (!visibleItems.some((i) => i.id === id)) return;
    if (selectedId !== id) {
        editingId = null;
        editingDraft = "";
    }
    selectedId = id;
    syncRowSelection();
    renderDetail();
    if (NARROW.matches) openSheet();
    if (focus)
        listScroll.el
            .querySelector<HTMLElement>(`.ch-row[data-id="${id}"] .ch-row-main`)
            ?.focus({ preventScroll: true });
}

function cancelEditIfAny() {
    if (!editingId) return;
    editingId = null;
    editingDraft = "";
}

// ── 缩略图与大图 ────────────────────────────────────────────────

const thumbObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLImageElement;
        const id = el.dataset.clipid;
        if (!id) continue;
        thumbObserver.unobserve(el);
        const url = renderSendSync("clipHistoryThumb", [id]);
        if (url) el.src = url;
    }
});

function thumbFor(id: string) {
    const img = image(PLACEHOLDER, "").class("ch-thumb");
    img.el.dataset.clipid = id;
    thumbObserver.observe(img.el);
    return img;
}

let lightboxId = "";
const lightboxImg = ele("img").style({
    maxWidth: "90vw",
    maxHeight: "80vh",
    objectFit: "contain",
});
const lightboxCopy = button()
    .class("ch-lightbox-copy")
    .add([icon("copy"), txt(t("复制"))])
    .on("click", () => {
        if (!lightboxId) return;
        renderSend("clipHistoryCopy", [lightboxId]);
        lightbox.el.close();
        toast(t("已复制到剪贴板"));
    });
const lightboxBox = view("y")
    .class("ch-lightbox-box")
    .add([lightboxImg, lightboxCopy]);
const lightbox = ele("dialog")
    .class("ch-lightbox")
    .style({
        padding: "0",
        border: "none",
        background: "transparent",
        maxWidth: "none",
        maxHeight: "none",
        overflow: "visible",
    })
    .add(lightboxBox)
    .addInto();
lightbox.on("click", (e) => {
    if (e.target === lightbox.el || e.target === lightboxBox.el)
        lightbox.el.close();
});
lightbox.on("close", () => {
    lightboxId = "";
    lightboxImg.el.removeAttribute("src");
});

function showFullImage(id: string) {
    if (lightbox.el.open) return;
    const url = renderSendSync("clipHistoryFull", [id]);
    if (!url) return;
    lightboxId = id;
    lightboxImg.el.src = url;
    lightbox.el.showModal();
}

// ── 轻提示 ──────────────────────────────────────────────────────

const toastEl = view().class("ch-toast").addInto(document.body);
let toastTimer = 0;
function toast(message: string) {
    toastEl.el.textContent = message;
    toastEl.el.classList.add("is-show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(
        () => toastEl.el.classList.remove("is-show"),
        1800,
    );
}

// ── 列表 ────────────────────────────────────────────────────────

function titleLineOf(item: ClipItem) {
    const line = view("x").class("ch-row-title-line");
    if (item.pinned && !trash) line.add(starIcon());
    line.add(txt(titleOf(item), true).class("ch-row-title"));
    return line;
}

function rowEl(item: ClipItem) {
    const row = view("x").class("ch-row");
    row.el.dataset.id = item.id;
    if (item.id === selectedId) row.class("is-selected");
    if (item.pinned && !trash) row.class("is-pinned");

    const mainBtn = button().class("ch-row-main");
    mainBtn.el.setAttribute("aria-pressed", String(item.id === selectedId));

    mainBtn.add(
        txt(fmtTime(item.time), true).class("ch-row-time").class("ch-num"),
    );
    const media = view().class("ch-row-media");
    if (item.type === "image") media.add(thumbFor(item.id));
    else media.add(icon(kindOf(item).icon));
    mainBtn.add(media);
    mainBtn.add(
        view("y")
            .class("ch-row-text")
            .add([
                titleLineOf(item),
                txt(subOf(item), true).class("ch-row-sub"),
            ]),
    );

    const acts = view("x").class("ch-row-acts");
    if (!trash) {
        const rowActs: [IconType, string, string][] =
            item.type === "image"
                ? [
                      ["copy", "copy", "复制"],
                      ["eye", "view", "放大查看"],
                  ]
                : [["copy", "copy", "复制"]];
        for (const [ic, act, label] of rowActs) {
            acts.add(
                button(icon(ic))
                    .class("ch-row-act")
                    .data({ "row-act": act, id: item.id })
                    .attr({ title: t(label) }),
            );
        }
    }
    row.add([mainBtn, acts]);
    return row;
}

function groupEl(label: string, note: string, items: ClipItem[]) {
    const group = view("y").class("ch-group");
    const groupHead = view("x")
        .class("ch-group-head")
        .add([
            ele("h3").add(label),
            txt(`${items.length} ${t("条")}`, true)
                .class("ch-group-count")
                .class("ch-num"),
            ...(note ? [txt(note).class("ch-group-note")] : []),
            view().class("ch-group-rule"),
        ]);
    const rows = view("y").class("ch-group-rows");
    for (const item of items) rows.add(rowEl(item));
    group.add([groupHead, rows]);
    return group;
}

function emptyEl() {
    const box = view("y").class("ch-empty");
    if (trash) {
        box.add([
            icon("delete"),
            ele("p").add(t("回收站是空的")).class("ch-empty-title"),
            ele("p")
                .add(t("删除的记录会先放在这里，可恢复或永久删除。"))
                .class("ch-empty-sub"),
        ]);
        return box;
    }
    if (keyword || typeFilter.size > 0) {
        box.add([
            icon("search"),
            ele("p").add(t("没有匹配的记录")).class("ch-empty-title"),
            ele("p")
                .add(t("换一个关键词，或把类型筛选改回全部。"))
                .class("ch-empty-sub"),
            button(txt(t("清除搜索与筛选")))
                .class("ch-empty-btn")
                .on("click", () => {
                    keyword = "";
                    typeFilter.clear();
                    searchEl.sv("");
                    render();
                }),
        ]);
        return box;
    }
    box.add([
        icon("paste"),
        ele("p").add(t("还没有记录")).class("ch-empty-title"),
        ele("p")
            .add(t("复制文字、图片或文件后，会按时间出现在这里。"))
            .class("ch-empty-sub"),
    ]);
    return box;
}

function renderList() {
    listScroll.clear();
    listMeta.sv(`${visibleItems.length} ${t("条")} · ${t("按时间倒序")}`);
    footCount.sv(
        trash
            ? `${visibleItems.length} ${t("条")}`
            : `${t("未固定")} ${visibleItems.filter((i) => !i.pinned).length} ${t("条")}`,
    );

    if (!visibleItems.length) {
        listScroll.add(emptyEl());
        return;
    }

    if (!trash) {
        const pinned = visibleItems.filter((i) => i.pinned);
        if (pinned.length)
            listScroll.add(groupEl(t("固定"), t("清空时保留"), pinned));
    }

    const days: { key: string; label: string; items: ClipItem[] }[] = [];
    for (const item of visibleItems.filter((i) => trash || !i.pinned)) {
        const key = dayKey(item.time);
        let group = days.find((d) => d.key === key);
        if (!group) {
            group = { key, label: dayLabel(item.time), items: [] };
            days.push(group);
        }
        group.items.push(item);
    }
    for (const day of days) listScroll.add(groupEl(day.label, "", day.items));

    if (
        !trash &&
        !keyword &&
        typeFilter.size === 0 &&
        !visibleItems.some((i) => !i.pinned)
    ) {
        listScroll.add(
            txt(
                `${t("未固定的记录为空")} · ${t("新的复制会出现在这里。")}`,
                true,
            ).class("ch-list-cleared"),
        );
    }
}

// ── 记录纸 ──────────────────────────────────────────────────────

function paperContent(item: ClipItem) {
    if (item.type === "image") {
        const url = renderSendSync("clipHistoryThumb", [item.id]);
        const btn = button(
            image(url || PLACEHOLDER, "").class("ch-paper-image"),
        )
            .class("ch-paper-image-btn")
            .data({ "detail-act": "view", id: item.id })
            .attr({ title: t("放大查看") });
        return view("y")
            .class("ch-paper-image-wrap")
            .add([
                btn,
                txt(`${item.w ?? "?"} × ${item.h ?? "?"}`, true)
                    .class("ch-paper-caption")
                    .class("ch-num"),
            ]);
    }

    if (item.type === "file") {
        const files = view("y").class("ch-files");
        for (const path of item.files ?? []) {
            files.add(
                view("x")
                    .class("ch-file")
                    .add([
                        icon("file"),
                        view("y")
                            .class("ch-file-text")
                            .add([
                                txt(basename(path), true).class("ch-file-name"),
                                txt(path, true).class("ch-file-path"),
                            ]),
                    ]),
            );
        }
        return files;
    }

    const kind = kindOf(item);
    const text = item.text ?? "";
    if (kind.key === "link") {
        const p = ele("p").class("ch-paper-text").class("is-link");
        p.el.textContent = text;
        return p;
    }
    if (kind.key === "command" || kind.key === "code" || kind.key === "log") {
        const pre = ele("pre")
            .class("ch-code")
            .class(kind.key === "log" ? "is-error" : "");
        if (kind.key === "command" || kind.key === "log") {
            pre.add(
                ele("span")
                    .class("ch-code-prompt")
                    .add(kind.key === "log" ? "!" : "$"),
            );
        }
        pre.el.append(document.createTextNode(text));
        return pre;
    }
    const p = ele("p").class("ch-paper-text");
    p.el.textContent = text;
    return p;
}

function detailBtn(
    label: string,
    action: string,
    id: string,
    cls: string | string[],
    iconName?: IconType,
) {
    const btn = button()
        .class("ch-btn")
        .class(...(Array.isArray(cls) ? cls : [cls]))
        .data({ "detail-act": action, id });
    if (iconName) btn.add(icon(iconName));
    btn.add(txt(label));
    return btn;
}

function renderDetail() {
    detailPane.clear();
    const item =
        visibleItems.find((i) => i.id === selectedId) ?? visibleItems[0];
    if (!item) {
        selectedId = null;
        detailPane.add(
            view("y")
                .class("ch-detail-empty")
                .add([
                    icon("paste"),
                    txt(t("暂无记录")).class("ch-empty-title"),
                ]),
        );
        if (sheetOpen) closeSheet();
        return;
    }
    selectedId = item.id;
    const kind = kindOf(item);
    const editing = editingId === item.id && item.type !== "image" && !trash;
    const index = visibleItems.findIndex((i) => i.id === item.id);

    const chip = view("x")
        .class("ch-chip")
        .class(trash ? "is-trash" : item.pinned ? "is-pinned" : "");
    if (trash) {
        chip.add([icon("delete"), txt(t("已删除"))]);
    } else if (item.pinned) {
        chip.add([starIcon(), txt(t("已固定"))]);
    } else {
        chip.add([icon("star"), txt(t("未固定"))]);
    }

    const closeBtn = button(icon("close"))
        .class("ch-detail-close")
        .data({ "detail-act": "close-detail" })
        .attr({ title: t("关闭") });

    const detailHead = view("x")
        .class("ch-detail-head")
        .add([
            view("y")
                .class("ch-detail-head-text")
                .add([
                    ele("h2").add(kind.label).class("ch-detail-title"),
                    (() => {
                        const p = ele("p").class("ch-detail-serial");
                        p.el.textContent = `${t("记录纸 · 编号")} ${serialOf(
                            item.time,
                        )}`;
                        return p;
                    })(),
                ]),
            view("x").class("ch-detail-head-right").add([chip, closeBtn]),
        ]);

    const paperHead = view("x")
        .class("ch-paper-head")
        .add([
            icon(kind.icon),
            txt(fmtTime(item.time, true), true),
            spacer(),
            txt(metaOf(item), true).class("ch-num"),
        ]);

    const paperBody = view("y").class("ch-paper-body");
    if (editing) {
        const area = textarea().class("ch-editor");
        area.el.id = "ch-editor";
        area.sv(editingDraft);
        area.el.setAttribute("aria-label", t("编辑"));
        paperBody.add(area);
    } else {
        paperBody.add(paperContent(item));
    }

    const origin = ele("p").class("ch-origin");
    origin.el.textContent = trash
        ? `${t("已删除")} · ${t("可恢复或永久删除")}`
        : `${t("来自系统剪贴板")} · ${t("仅保存在本机")}`;

    const note = ele("p").class("ch-note");
    note.el.textContent = trash
        ? t("永久删除不可恢复。")
        : item.pinned
          ? t("固定记录不参与清空。")
          : t("清空只移除未固定的记录。");

    const pager = editing
        ? null
        : view("x")
              .class("ch-pager")
              .add([
                  button(txt(t("上一条")))
                      .class("ch-page-btn")
                      .data({ "detail-act": "prev", id: item.id })
                      .attr({ disabled: index <= 0 }),
                  button(txt(t("下一条")))
                      .class("ch-page-btn")
                      .data({ "detail-act": "next", id: item.id })
                      .attr({
                          disabled: index >= visibleItems.length - 1,
                      }),
              ]);

    const actions = view("x").class("ch-detail-actions");
    if (editing) {
        actions.add([
            detailBtn(t("保存"), "save", item.id, "ch-btn-primary", "save"),
            detailBtn(t("取消"), "cancel-edit", item.id, "ch-btn-line"),
        ]);
    } else if (trash) {
        actions.add([
            detailBtn(t("恢复"), "restore", item.id, "ch-btn-primary", "back"),
            detailBtn(
                t("永久删除"),
                "purge",
                item.id,
                ["ch-btn-line", "ch-btn-danger"],
                "delete",
            ),
        ]);
    } else {
        actions.add(
            detailBtn(
                item.type === "file" ? t("复制路径") : t("复制"),
                "copy",
                item.id,
                "ch-btn-primary",
                "copy",
            ),
        );
        if (item.type === "image")
            actions.add(
                detailBtn(t("放大查看"), "view", item.id, "ch-btn-line", "eye"),
            );
        actions.add(
            detailBtn(
                item.pinned ? t("取消固定") : t("固定"),
                item.pinned ? "unpin" : "pin",
                item.id,
                "ch-btn-line",
                item.pinned ? "star-fill" : "star",
            ),
        );
        if (item.type !== "image")
            actions.add(
                detailBtn(t("编辑"), "edit", item.id, "ch-btn-line", "edit"),
            );
        actions.add(
            detailBtn(
                t("删除"),
                "trash",
                item.id,
                ["ch-btn-text", "ch-btn-danger"],
                "delete",
            ),
        );
    }

    const footIndex = txt(
        `${t("记录")} ${index + 1} / ${visibleItems.length}`,
        true,
    )
        .class("ch-detail-index")
        .class("ch-num");
    const foot = view("x")
        .class("ch-detail-foot")
        .add([footIndex, ...(pager ? [pager] : [])]);

    detailPane.add([
        detailHead,
        view("y").class("ch-paper").add([paperHead, paperBody]),
        origin,
        note,
        actions,
        foot,
    ]);

    if (editing) {
        requestAnimationFrame(() => {
            const area =
                detailPane.el.querySelector<HTMLTextAreaElement>("#ch-editor");
            if (!area) return;
            area.focus({ preventScroll: true });
            area.setSelectionRange(area.value.length, area.value.length);
        });
    }
}

// ── 页头 / 暂停 / 渲染 ──────────────────────────────────────────

function findingText() {
    if (trash) {
        return allItems.length
            ? `${t("回收站")} ${allItems.length} ${t("条")} · ${t("可恢复或永久删除")}`
            : `${t("回收站")} · ${t("回收站是空的")}`;
    }
    if (keyword || typeFilter.size > 0) {
        if (!visibleItems.length) return t("没有匹配的记录");
        const latest = [...visibleItems].sort((a, b) => b.time - a.time)[0];
        return `${t("匹配")} ${visibleItems.length} ${t("条")} · ${t("最新")} ${fmtTime(latest.time, true)}`;
    }
    if (!allItems.length)
        return `${t("还没有记录")} · ${t("复制后会自动出现在这里")}`;
    const unpinned = allItems.filter((i) => !i.pinned);
    if (!unpinned.length)
        return `${t("未固定的记录为空")} · ${allItems.length} ${t("条固定记录")}`;
    const latest = unpinned[0];
    return `${t("最新")} ${fmtTime(latest.time, true)} · ${kindOf(latest).label} · ${latest.pinned ? t("已固定") : t("未固定")}`;
}

function updateChrome() {
    const pinned = allItems.filter((i) => i.pinned).length;
    pageTitle.el.textContent = trash ? t("回收站") : t("剪贴板");
    findingEl.sv(findingText());
    summaryEl.sv(
        trash
            ? `${t("已删除")} ${allItems.length} ${t("条")}`
            : `${t("今天")} ${allItems.filter((i) => atDay(i.time, 0)).length} · ${t("昨天")} ${allItems.filter((i) => atDay(i.time, 1)).length} · ${t("固定")} ${pinned}`,
    );
    tallyEl.sv(
        trash
            ? `${allItems.length} ${t("条记录")}`
            : `${allItems.length} ${t("条记录")} · ${pinned} ${t("条固定")}`,
    );

    trashIcon.el.src = getImgUrl(trash ? "back.svg" : "delete.svg");
    trashLabel.el.textContent = trash ? t("返回剪贴板") : t("回收站");
    clearLabel.el.textContent = trash ? t("清空回收站") : t("清空");
    clearBtn.el.classList.toggle("is-danger", trash);
    const canClear = trash
        ? allItems.length > 0
        : allItems.some((i) => !i.pinned);
    clearBtn.el.toggleAttribute("disabled", !canClear);

    statusText.sv(paused ? t("已暂停") : t("正在记录"));
    recordStatus.el.classList.toggle("is-paused", paused);
    pauseIcon.el.src = getImgUrl(paused ? "recume.svg" : "pause.svg");
    pauseEl.attr({ title: paused ? t("继续记录") : t("暂停记录") });
    pausedBar.el.classList.toggle("ch-hidden", !paused);
    pausedText.sv(t("已暂停记录，新的复制不会被保存。"));
    shell.el.classList.toggle("is-paused", paused);

    if (warning) {
        warnText.sv(warning);
        warnEl.el.classList.remove("ch-hidden");
    } else {
        warnEl.el.classList.add("ch-hidden");
    }

    for (const filter of filterEls) {
        const active =
            filter.key === "all"
                ? typeFilter.size === 0
                : typeFilter.has(filter.key);
        filter.btn.el.classList.toggle("is-active", active);
        filter.btn.el.setAttribute("aria-pressed", String(active));
        const count =
            filter.key === "all"
                ? allItems.filter(matchKeyword).length
                : allItems.filter(
                      (i) => i.type === filter.key && matchKeyword(i),
                  ).length;
        filter.count.sv(String(count));
    }
}

function render() {
    const r = renderSendSync("clipHistoryGet", [trash]);
    allItems = r.items;
    paused = r.paused;
    warning = r.warning ?? "";
    visibleItems = allItems.filter(matchItem);

    if (editingId && !visibleItems.some((i) => i.id === editingId)) {
        editingId = null;
        editingDraft = "";
    }
    if (!selectedId || !visibleItems.some((i) => i.id === selectedId)) {
        selectedId = defaultSelection(visibleItems);
    }

    updateChrome();
    renderList();
    renderDetail();
}

// ── 交互 ────────────────────────────────────────────────────────

function saveEdit(item: ClipItem) {
    if (!editingDraft.trim()) {
        toast(t("内容不能为空"));
        return;
    }
    const ok =
        item.type === "text"
            ? renderSendSync("clipHistoryEditText", [item.id, editingDraft])
            : renderSendSync("clipHistoryEditFiles", [
                  item.id,
                  editingDraft.split("\n"),
              ]);
    if (ok) {
        editingId = null;
        editingDraft = "";
        toast(t("已保存"));
        render();
    }
}

function detailAction(action: string) {
    const item = visibleItems.find((i) => i.id === selectedId);
    if (!item) return;
    if (action === "close-detail") {
        closeSheet();
        return;
    }
    if (action === "copy") {
        renderSend("clipHistoryCopy", [item.id]);
        toast(t("已复制到剪贴板"));
        return;
    }
    if (action === "view") {
        showFullImage(item.id);
        return;
    }
    if (action === "pin" || action === "unpin") {
        editingId = null;
        renderSend("clipHistoryPin", [item.id, action === "pin"]);
        return;
    }
    if (action === "edit") {
        editingId = item.id;
        editingDraft =
            item.type === "text"
                ? (item.text ?? "")
                : (item.files ?? []).join("\n");
        renderDetail();
        return;
    }
    if (action === "save") {
        saveEdit(item);
        return;
    }
    if (action === "cancel-edit") {
        editingId = null;
        editingDraft = "";
        renderDetail();
        return;
    }
    if (action === "trash" || action === "restore" || action === "purge") {
        selectedId = neighborOf(item.id);
        editingId = null;
        if (action === "trash") renderSend("clipHistoryRemove", [item.id]);
        else if (action === "restore")
            renderSend("clipHistoryRestore", [item.id]);
        else renderSend("clipHistoryPurge", [item.id]);
        return;
    }
    if (action === "prev" || action === "next") {
        const at = visibleItems.findIndex((i) => i.id === item.id);
        const next = visibleItems[at + (action === "prev" ? -1 : 1)];
        if (!next) return;
        selectedId = next.id;
        editingId = null;
        syncRowSelection();
        renderDetail();
        listScroll.el
            .querySelector<HTMLElement>(`.ch-row[data-id="${next.id}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }
}

listScroll.on("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.closest<HTMLElement>("[data-row-act]");
    if (action) {
        const item = visibleItems.find((i) => i.id === action.dataset.id);
        if (!item) return;
        if (action.dataset.rowAct === "view") showFullImage(item.id);
        else {
            renderSend("clipHistoryCopy", [item.id]);
            toast(t("已复制到剪贴板"));
        }
        return;
    }
    const mainBtn = target.closest<HTMLElement>(".ch-row-main");
    const row = mainBtn?.closest<HTMLElement>(".ch-row");
    if (row?.dataset.id) selectRow(row.dataset.id);
});

listScroll.on("dblclick", (e) => {
    if (NARROW.matches) return;
    const mainBtn = (e.target as HTMLElement).closest<HTMLElement>(
        ".ch-row-main",
    );
    const row = mainBtn?.closest<HTMLElement>(".ch-row");
    if (!row?.dataset.id) return;
    if (!visibleItems.some((i) => i.id === row.dataset.id)) return;
    renderSend("clipHistoryCopy", [row.dataset.id]);
    toast(t("已复制到剪贴板"));
});

listScroll.on("keydown", (e) => {
    if (NARROW.matches) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const mainBtn = (e.target as HTMLElement).closest<HTMLElement>(
        ".ch-row-main",
    );
    const row = mainBtn?.closest<HTMLElement>(".ch-row");
    if (!row?.dataset.id) return;
    const at = visibleItems.findIndex((i) => i.id === row.dataset.id);
    const next = visibleItems[at + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    selectRow(next.id, true);
});

detailPane.on("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-detail-act]",
    );
    if (btn?.dataset.detailAct) detailAction(btn.dataset.detailAct);
});

detailPane.on("input", (e) => {
    const target = e.target as HTMLElement;
    if (target.id === "ch-editor")
        editingDraft = (target as HTMLTextAreaElement).value;
});

document.addEventListener("keydown", (e) => {
    if (lightbox.el.open) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA";
    if (e.key === "/" && !typing) {
        e.preventDefault();
        searchEl.el.focus();
        return;
    }
    if (e.key !== "Escape") return;
    if (editingId) {
        e.preventDefault();
        editingId = null;
        editingDraft = "";
        renderDetail();
        return;
    }
    if (sheetOpen) {
        e.preventDefault();
        closeSheet();
        return;
    }
    if (searchEl.el.value) {
        searchEl.sv("");
        keyword = "";
        render();
    }
});

/** 主内容区矩形发给主进程，子视图（翻译/AI 识图/设置）按它对齐 */
function syncSlot() {
    const r = main.el.getBoundingClientRect();
    renderSend("shellSlot", [
        {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
        },
    ]);
}
new ResizeObserver(() => syncSlot()).observe(main.el);
window.addEventListener("resize", () => syncSlot());

applyMode(renderSendSync("appAction", ["getState"]).mainMode);
render();
renderOn("clipHistoryChange", () => render());
renderOn("shellGo", ([name]) => goSection(name));
syncSlot();
