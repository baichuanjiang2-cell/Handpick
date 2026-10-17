import { button, ele, image, input, pack, textarea, txt, view } from "dkh-ui";
import { renderOn, renderSend, renderSendSync } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import type { ClipItem } from "../../ShareTypes";
import type { IconType } from "../../iconTypes";
import { Class, cssVar, getImgUrl, initStyle, setTitle } from "../root/root";

initStyle(store);
setTitle(t("剪贴板历史"));

// 面板底色由 body.glass 直接给主题色（窗口不透明，没有任何东西可透）
document.body.classList.add("glass");

const padding = cssVar("o-padding");

function iconEl(src: IconType, cls?: string) {
    return image(getImgUrl(`${src}.svg`), "icon").class("icon").class(cls ?? "");
}

function iconB(src: IconType, title: string, onClick: () => void, cls?: string) {
    return button(iconEl(src, cls))
        .attr({ title })
        .on("click", () => onClick());
}

function fmtTime(ts: number) {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

pack(document.body).style({
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
});
bar.addInto();
warnEl.addInto();
listEl.addInto();

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
        .add([txt(typeName), txt(fmtTime(item.time))]);

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
