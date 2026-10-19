import {
    type ElType,
    button,
    ele,
    image,
    input,
    pack,
    textarea,
    txt,
    view,
} from "dkh-ui";
import type { AppAction, AppActionState, ShellSection } from "../../../lib/ipc";
import { renderOn, renderSend, renderSendSync } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import type { ClipItem } from "../../ShareTypes";
import type { IconType } from "../../iconTypes";
import { iconButton, iconEl, titleBar } from "../lib/ui";
import { Class, cssVar, getImgUrl, initStyle, setTitle } from "../root/root";

initStyle(store);
setTitle(t("剪贴板历史"));

// 面板底色由 body.glass 直接给主题色（窗口不透明，没有任何东西可透）
document.body.classList.add("glass");

const padding = cssVar("o-padding");

function iconB(
    src: IconType,
    title: string,
    onClick: () => void,
    cls?: string,
) {
    return iconButton(src, title, cls).on("click", () => onClick());
}

function fmtTime(ts: number) {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 控制中心的功能清单。全量动作一张表，四项一组，没有一个是"失踪的"；
 *  状态项（bool/seg）由主进程回传的最新状态渲染，点击 = 派发对应动作 */
type FeatureItem = {
    action: AppAction | ((v: string) => void);
    label: string;
    icon: IconType;
    group: string;
    size?: "big";
    state?: "bool" | "seg";
    segLabel?: (v: string) => string;
    /** 仅开发者模式显示（root 的 [data-dev] 机制会藏起它） */
    dev?: boolean;
    /** 渲染后回填的条目按钮，applyState 靠它改外观 */
    _el?: ReturnType<typeof button>;
};

/** 壳的页面栏目。切栏目 = 主内容区换内容；setting/translate/aiVision 是子视图，clipboard 是壳本页 */
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
            if ("state" in item && item.state === "bool") {
                const on =
                    item.action === "browserOpenToggle"
                        ? state.browserOpen
                        : item.action === "reuseMainToggle"
                          ? state.reuseMain
                          : false;
                el.style({ outlineColor: on ? "var(--accent-gold)" : "" });
            }
            if ("state" in item && item.state === "seg") {
                el.el.innerText = item.segLabel
                    ? item.segLabel(state.mainMode)
                    : state.mainMode;
            }
        }
    }
}

let trash = false;
let keyword = "";
let paused = false;
/**
 * 类型筛选。空集合表示「全部」——这也是每次打开面板的初始状态：
 * 筛选是临时的查看动作，不是配置，所以不持久化。
 */
const typeFilter = new Set<ClipItem["type"]>();

/** 正在就地编辑的记录 id，以及编辑框里的草稿内容 */
let editingId: string | null = null;
let editingDraft = "";

// ── 工具条 ──────────────────────────────────────────────────────

const searchEl = input("search")
    .attr({ placeholder: t("搜索"), type: "search" })
    .style({ flex: "1", minWidth: 0 });
searchEl.on("input", () => {
    keyword = (searchEl.el as HTMLInputElement).value.trim().toLowerCase();
    render();
});

const pauseIcon = iconEl("pause");
const pauseEl = button(pauseIcon)
    .attr({ title: t("暂停记录") })
    .on("click", () => renderSend("clipHistorySetPaused", [!paused]));

const trashEl = iconB("delete", t("回收站"), () => {
    trash = !trash;
    editingId = null;
    render();
});

const clearEl = iconB("clear", t("清空"), () => {
    if (trash) renderSend("clipHistoryEmptyTrash", []);
    else renderSend("clipHistoryClear", []);
});

/** 三个类型筛选按钮，可多选，都不选 = 全部 */
const typeFilters = (
    [
        { type: "text", icon: "text", title: "只看文本" },
        { type: "image", icon: "img", title: "只看图片" },
        { type: "file", icon: "file", title: "只看文件" },
    ] as const
).map((i) => ({
    type: i.type as ClipItem["type"],
    el: iconB(i.icon, t(i.title), () => {
        if (typeFilter.has(i.type)) typeFilter.delete(i.type);
        else typeFilter.add(i.type);
        render();
    }),
}));

// ── 工具组（侧边栏里收纳全局动作，可折叠，默认展开） ──────────────

function toolGroupEl() {
    const head = button()
        .add([iconEl("super_edit"), txt(t("工具组"))])
        .attr({ title: t("工具组") })
        .style({
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: "100%",
            height: "28px",
            padding: "2px 8px",
            justifyContent: "flex-start",
            color: "var(--font-color-l)",
            fontFamily: "var(--title-font)",
            fontSize: "0.85em",
        });
    const body = view("y").style({ gap: "2px" });
    let open = true;
    for (const [, items] of featureGroups) {
        body.add(
            view("y")
                .style({ gap: "2px" })
                .add(
                    items.map((item) => {
                        const row = button()
                            .add([
                                iconEl(item.icon),
                                txt(t(item.label)).style({
                                    fontSize: "0.88em",
                                }),
                            ])
                            .attr({
                                title: t(item.label),
                                ...(item.dev ? { "data-dev": "" } : {}),
                            })
                            .style({
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                width: "100%",
                                height: "26px",
                                padding: "2px 8px 2px 22px",
                                justifyContent: "flex-start",
                            })
                            .on("click", () => {
                                const st = act(item.action);
                                applyState(st);
                            });
                        item._el = row;
                        return row;
                    }),
                ),
        );
    }
    head.on("click", () => {
        open = !open;
        body.style({ display: open ? "" : "none" });
    });
    const wrap = view("y").style({ gap: "2px" }).add([head, body]);
    applyState(renderSendSync("appAction", ["getState"]));
    return wrap;
}

const bar = view()
    .class(Class.group)
    .style({
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding,
        flexShrink: "0",
    })
    .add([
        searchEl,
        pauseEl,
        trashEl,
        clearEl,
        ...typeFilters.map((i) => i.el),
    ]);

const warnEl = view().style({ display: "none", padding, opacity: "0.7" });

const listEl = view().style({
    display: "flex",
    flexDirection: "column",
    gap: padding,
    padding,
    overflowY: "auto",
    flex: "1",
    minHeight: "0",
});

// ── 壳布局：顶栏 + 侧边栏 + 主内容区 ────────────────────────────

pack(document.body).style({
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
});

/** 顶栏快路径：快速截屏 / 自动识别 / 回到剪贴板 */
const quickBtns = [
    iconB("camera", t("快速截屏"), () => act("quickShot")),
    iconB("scan", t("自动识别"), () => act("autoOpen")),
    iconB("paste", t("回到剪贴板"), () => goSection("clipboard")),
];

const head = titleBar(t("控制中心"), quickBtns).style({
    borderBottom: "1px solid var(--border-color)",
});

// 侧边栏：品牌 + 页面栏目 + 工具组
const side = view("y").style({
    width: "180px",
    flexShrink: "0",
    overflowY: "auto",
    padding: "8px",
    gap: "4px",
    borderRight: "1px solid var(--border-color)",
});

const brand = view("x").style({
    alignItems: "center",
    gap: "8px",
    padding: "8px 6px 12px",
    fontFamily: "var(--title-font)",
});
let appVersion = "";
try {
    appVersion = renderSendSync("appVersion", []) ?? "";
} catch (error) {}
brand.add([
    image(getImgUrl("main.svg"), "icon").class("icon").style({
        width: "20px",
        height: "20px",
        maxWidth: "none",
        maxHeight: "none",
    }),
    view("y")
        .style({ gap: "0", lineHeight: "1.2" })
        .add([
            txt("eSearch").style({ fontWeight: "600", fontSize: "1.05em" }),
            txt(appVersion).style({
                color: "var(--font-color-l)",
                fontFamily: "var(--num-font)",
                fontSize: "0.75em",
            }),
        ]),
]);

/** 页面栏目按钮组 */
const sectionBtns = new Map<ShellSection, ElType<HTMLElement>>();
const sectionList = view("y").style({ gap: "2px" });
let currentSection: ShellSection = "clipboard";
function goSection(name: ShellSection) {
    if (currentSection === name) return;
    currentSection = name;
    for (const [key, el] of sectionBtns) {
        el.style({
            backgroundColor: key === name ? "var(--m-color-bb)" : "transparent",
            color:
                key === name
                    ? "var(--font-color-emphasis)"
                    : "var(--font-color)",
        });
    }
    // clipboard 用壳本页 DOM，其余栏目交给主进程挂子视图
    showLocal(name === "clipboard");
    renderSend("shellSection", [name]);
    setTitle(name === "clipboard" ? t("剪贴板历史") : t("控制中心"));
}
for (const sec of sections) {
    const el = button()
        .add([iconEl(sec.icon), txt(t(sec.label))])
        .attr({ title: t(sec.label) })
        .style({
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            height: "32px",
            padding: "2px 8px",
            justifyContent: "flex-start",
        })
        .on("click", () => goSection(sec.key));
    sectionBtns.set(sec.key, el);
    sectionList.add(el);
}

/** 主页面模式：单选设置（自动/搜索/翻译），三个选项同屏、选中墨绿实心 */
const modeBtns = new Map<string, ElType<HTMLElement>>();
const modeRow = view("x").style({ gap: "4px" });
const modeSeg = view("y").style({ gap: "2px", padding: "8px 6px" });
modeSeg.add(
    txt(t("主页面模式")).style({
        color: "var(--font-color-l)",
        fontSize: "0.85em",
        fontFamily: "var(--title-font)",
        marginBottom: "2px",
    }),
);
function applyMode(m: string) {
    for (const [key, el] of modeBtns) {
        const on = key === m;
        el.style({
            backgroundColor: on ? "var(--accent-pine)" : "transparent",
            color: on ? "#fff" : "var(--font-color)",
        });
    }
}
for (const [key, label] of [
    ["auto", "自动"],
    ["search", "搜索"],
    ["translate", "翻译"],
]) {
    const el = button(t(label))
        .style({
            flex: "1",
            height: "26px",
            padding: "0 4px",
            fontSize: "0.85em",
            justifyContent: "center",
        })
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

side.add([brand, sectionList, toolGroupEl(), modeSeg]);

/** 主内容区：clipboard 栏目的 DOM 挂这里；子视图窗口内坐标也对齐它 */
const main = view().style({
    flex: "1",
    display: "flex",
    flexDirection: "column",
    minHeight: "0",
    position: "relative",
});

const localPane = view().style({
    display: "flex",
    flexDirection: "column",
    flex: "1",
    minHeight: "0",
});
localPane.add([bar, warnEl, listEl]);
main.add(localPane);

const body = view("x").style({ flex: "1", minHeight: "0" });
body.add([side, main]);

head.addInto();
body.addInto();

/** clipboard 栏目本地 DOM 的显隐（切到子视图栏目时藏起） */
function showLocal(show: boolean) {
    localPane.style({ display: show ? "flex" : "none" });
}

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

/**
 * 面板被唤出时让列表整体淡入上浮一下。
 * 面板从最小化还原不会重新加载页面，所以动画只能挂在可见性变化上，不能指望
 * 页面加载时跑一次。动画结束就摘掉这个类——render() 会重建所有子节点，
 * 类留着的话每敲一个字符搜索框都会重放一次动画。
 */
listEl.el.addEventListener("animationend", () =>
    listEl.el.classList.remove("list-appear"),
);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    listEl.el.classList.remove("list-appear");
    // 读一次布局强制重排，否则同一个类加回去不会重新播动画
    void listEl.el.offsetWidth;
    listEl.el.classList.add("list-appear");
});

// ── 缩略图懒加载 ────────────────────────────────────────────────

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

// ── 大图查看 ────────────────────────────────────────────────────

/**
 * 面板内的放大弹层。面板本身就是任务栏窗口，另开一个窗口会多出一个任务栏按钮，
 * 所以用 <dialog> 在本窗口内看原图；::backdrop 已经带毛玻璃。
 */
const lightboxImg = ele("img").style({
    maxWidth: "90vw",
    maxHeight: "88vh",
    objectFit: "contain",
});
const lightbox = ele("dialog")
    .style({
        padding: "0",
        border: "none",
        background: "transparent",
        maxWidth: "none",
        maxHeight: "none",
        overflow: "visible",
    })
    .add(lightboxImg)
    .addInto();
lightbox.on("click", (e) => {
    // 只有点在图片之外的遮罩上才关闭
    if (e.target === lightbox.el) lightbox.el.close();
});
lightbox.on("close", () => {
    // 用 removeAttribute 而不是 src = ""：后者会被当成相对地址再请求一次
    lightboxImg.el.removeAttribute("src");
});

function showFullImage(id: string) {
    if (lightbox.el.open) return;
    const url = renderSendSync("clipHistoryFull", [id]);
    if (!url) return;
    lightboxImg.el.src = url;
    lightbox.el.showModal();
}

// ── 渲染 ────────────────────────────────────────────────────────

function textBlock(s: string) {
    return view()
        .style({
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: "10lh",
            overflow: "hidden",
            fontSize: "0.9em",
        })
        .add(txt(s));
}

/** 进入就地编辑。图片没有可改的内容，只有文本与文件（路径列表）能编辑 */
function startEdit(item: ClipItem) {
    editingId = item.id;
    editingDraft =
        item.type === "text"
            ? (item.text ?? "")
            : (item.files ?? []).join("\n");
    render();
}

function saveEdit(item: ClipItem) {
    const ok =
        item.type === "text"
            ? renderSendSync("clipHistoryEditText", [item.id, editingDraft])
            : renderSendSync("clipHistoryEditFiles", [
                  item.id,
                  editingDraft.split("\n"),
              ]);
    // 内容被清空时主进程会拒绝保存，此时留在编辑态让用户改回来
    if (ok) editingId = null;
    render();
}

function itemEl(item: ClipItem) {
    // 回收站里不显示固定状态：那里只有「恢复 / 永久删除」，固定状态没有对应操作
    const pinned = item.pinned && !trash;
    const card = view()
        .class(Class.deco)
        .class(pinned ? "pinned" : "")
        .style({
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding,
        });

    const typeName =
        item.type === "text"
            ? t("文本")
            : item.type === "image"
              ? t("图片")
              : t("文件");

    const head = view()
        .style({
            display: "flex",
            alignItems: "center",
            gap: "6px",
            opacity: "0.7",
            fontSize: "0.85em",
        })
        .add([
            txt(typeName).style({ color: "var(--accent-pine)" }),
            txt(fmtTime(item.time)).style({ fontFamily: "var(--num-font)" }),
        ]);

    const editing = !trash && editingId === item.id;
    const actions = view().class(Class.group).style({ marginLeft: "auto" });
    if (trash) {
        actions.add([
            iconB("back", t("恢复"), () =>
                renderSend("clipHistoryRestore", [item.id]),
            ),
            iconB("delete", t("永久删除"), () =>
                renderSend("clipHistoryPurge", [item.id]),
            ),
        ]);
    } else if (editing) {
        actions.add([
            iconB("back", t("取消"), () => {
                editingId = null;
                render();
            }),
            iconB("save", t("保存"), () => saveEdit(item)),
        ]);
    } else {
        // 图片只能看不能改，所以「眼睛」和「编辑」互斥，只会出现一个
        if (item.type === "image")
            actions.add(
                iconB("eye", t("放大查看"), () => showFullImage(item.id)),
            );
        else actions.add(iconB("edit", t("编辑"), () => startEdit(item)));
        actions.add([
            iconB("copy", t("复制"), () =>
                renderSend("clipHistoryCopy", [item.id]),
            ),
            iconB(
                pinned ? "star-fill" : "star",
                pinned ? t("取消固定") : t("固定"),
                () => renderSend("clipHistoryPin", [item.id, !item.pinned]),
                pinned ? "star-fill" : undefined,
            ),
            iconB("close", t("删除"), () =>
                renderSend("clipHistoryRemove", [item.id]),
            ),
        ]);
    }
    head.add(actions);
    card.add(head);

    if (editing) {
        const ta = textarea().style({
            width: "100%",
            boxSizing: "border-box",
            minHeight: "6lh",
            maxHeight: "40vh",
            fontSize: "0.9em",
            resize: "vertical",
        });
        ta.sv(editingDraft);
        ta.on("input", () => {
            editingDraft = (ta.el as HTMLTextAreaElement).value;
        });
        card.add(ta);
    } else if (item.type === "text") {
        card.add(textBlock(item.text ?? ""));
    } else if (item.type === "file") {
        card.add(textBlock((item.files ?? []).join("\n")));
    } else {
        const img = image("", "thumb").style({
            maxWidth: "100%",
            maxHeight: "160px",
            objectFit: "contain",
            alignSelf: "flex-start",
        });
        // 占位透明像素：避免 src="" 触发一次多余的页面请求
        img.el.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        img.el.dataset.clipid = item.id;
        card.add(img);
        thumbObserver.observe(img.el);
    }

    if (item.pinned) card.style({ outlineColor: "var(--emphasis-color)" });
    return card;
}

function match(item: ClipItem) {
    if (typeFilter.size > 0 && !typeFilter.has(item.type)) return false;
    if (!keyword) return true;
    if (item.type === "text")
        return (item.text ?? "").toLowerCase().includes(keyword);
    if (item.type === "file")
        return (item.files ?? []).join("\n").toLowerCase().includes(keyword);
    // 图片没有文字可搜，只能靠类型筛选命中
    return false;
}

function render() {
    const r = renderSendSync("clipHistoryGet", [trash]);
    // 正在编辑的那条被永久删除 / 清空之后，编辑态就该结束
    if (editingId && !r.items.some((i) => i.id === editingId)) editingId = null;
    paused = r.paused;
    pauseIcon.el.src = getImgUrl(paused ? "recume.svg" : "pause.svg");
    pauseEl.style({
        outlineColor: paused ? "var(--emphasis-color)" : "",
    });
    trashEl.style({ outlineColor: trash ? "var(--emphasis-color)" : "" });
    for (const { type, el } of typeFilters)
        el.style({
            outlineColor: typeFilter.has(type) ? "var(--emphasis-color)" : "",
        });

    if (r.warning) {
        warnEl.el.innerText = r.warning;
        warnEl.style({ display: "" });
    } else {
        warnEl.style({ display: "none" });
    }

    listEl.clear();
    const list = r.items.filter(match);
    if (list.length === 0) {
        listEl.add(
            view()
                .style({ opacity: "0.5", padding })
                .add(txt(t("暂无记录"))),
        );
        return;
    }
    listEl.add(list.map(itemEl));
    // 重绘会把编辑框重建出来，光标得手动送回末尾
    if (editingId) {
        const ta = listEl.el.querySelector("textarea");
        if (ta) {
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
        }
    }
}

render();
renderOn("clipHistoryChange", () => {
    render();
});

// 主进程请求切栏目（如动作表的「设置」从别处派发）
renderOn("shellGo", ([name]) => goSection(name));
syncSlot();
applyMode(renderSendSync("appAction", ["getState"]).mainMode);
