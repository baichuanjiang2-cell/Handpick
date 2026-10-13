import { button, ele, image, input, pack, textarea, txt, view } from "dkh-ui";
import { renderOn, renderSend, renderSendSync } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import type { ClipGeom, ClipItem } from "../../ShareTypes";
import type { IconType } from "../../iconTypes";
import { Class, cssVar, getImgUrl, initStyle, setTitle } from "../root/root";

initStyle(store);
setTitle(t("剪贴板历史"));

// 面板的窗口背景交给系统材质（Windows 亚克力），页面底色必须半透明才透得出来
document.body.classList.add("glass");

// ── 液态玻璃 ────────────────────────────────────────────────────

/*
 * 分三层，从下往上：
 *
 *   .lg-desk   主进程截下来的桌面图，按屏幕坐标摆正，只做模糊
 *   .lg-tint   一层色纱，半透明程度跟随「样式 → 毛玻璃效果 → 不透明度」
 *   .lg-lens   对上面两层做折射（backdrop-filter 引 SVG 位移滤镜）
 *
 * 为什么背景要自己截：CSS 的 backdrop-filter 只能采样页面内部已经绘制的内容，而
 * 桌面是 DWM 在 Chromium 之外合成的，页面拿不到它。所以想让「背景透过玻璃被弯曲」，
 * 只能把桌面像素搬进页面——搬进来之后，backdrop-filter 才第一次真的有东西可弯。
 *
 * 折射方向取「向内取样」：向外取样会取到页面外的空白，窗口边缘会出现一圈发虚的带。
 * 向内取样既躲开了这个问题，也正是液态玻璃边缘那种「内容向边缘压缩」的观感。
 */

/** 位移贴图的边长上限。贴图是平滑的，用不到全分辨率 */
const LENS_MAP_MAX = 256;

const lgDesk = view().class("lg-desk").addInto();
view().class("lg-tint").addInto();
const lgLens = view().class("lg-lens").addInto();
view().class("lg-layer", "lg-rim").addInto();
view().class("lg-layer", "lg-grain").addInto();
view().class("lg-layer", "lg-spec").addInto();

/** 位移滤镜的容器。必须先把 filter 元素放进 DOM，再让 .lg-lens 引用它——
 *  引用一个不存在的 filter，浏览器会直接不渲染那个元素。 */
const lgSvgHost = ele("div")
    .style({
        position: "absolute",
        width: "0",
        height: "0",
        overflow: "hidden",
    })
    .addInto();
lgSvgHost.el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"><filter id="lg-lens" ' +
    'x="0" y="0" width="100%" height="100%" ' +
    'color-interpolation-filters="sRGB"></filter></svg>';
lgLens.style({ backdropFilter: "url(#lg-lens)" });

const lgFilter = lgSvgHost.el.querySelector("filter") as SVGFilterElement;

/** 上一次生成位移贴图用的参数，避免窗口移动时反复重建 */
let lensKey = "";

/**
 * 折射起效的带宽（CSS 像素）。只在边缘这一圈弯，越往里越直。
 *
 * 按面板短边取，不写死：面板小的时候固定带宽会把整块都弯了，
 * 看起来不像玻璃边缘而像哈哈镜。上下限是为了极端尺寸下也别太离谱。
 */
function lensBand(w: number, h: number) {
    return Math.max(10, Math.min(30, Math.min(w, h) * 0.07));
}

/**
 * 生成圆角矩形的位移贴图。
 *
 * 三通道编码（社区通行约定）：
 *   R = X 方向位移，128 为中性
 *   G = Y 方向位移，128 为中性
 *   B = 高光遮罩（预留，当前填中性值）
 *
 * 必须用 Canvas 生成、以位图形式交给 feImage：用 SVG data URI 的话，SVG 会被当成
 * 图片渲染，里面的 CSS 属性不参与求值（mix-blend-mode、filter 都会被忽略），
 * 中心永远无法中和，整个元素会变成一团扭曲。
 */
function buildLensMap(w: number, h: number, radius: number, band: number) {
    const scale = Math.min(1, LENS_MAP_MAX / Math.max(w, h));
    const mw = Math.max(8, Math.round(w * scale));
    const mh = Math.max(8, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = mw;
    c.height = mh;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(mw, mh);

    const r = Math.min(radius * scale, Math.min(mw, mh) / 2);
    // 带宽换到贴图坐标系；至少要几个像素，否则整条渐变会被采样成一两级台阶
    const rim = Math.max(3, band * scale);
    const cx = mw / 2;
    const cy = mh / 2;

    const sdf = (x: number, y: number) => {
        const qx = Math.abs(x - cx) - (mw / 2 - r);
        const qy = Math.abs(y - cy) - (mh / 2 - r);
        return (
            Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
            Math.min(Math.max(qx, qy), 0) -
            r
        );
    };

    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            const i = (y * mw + x) * 4;
            // sdf 为负表示在矩形内部，-sdf 就是「离边缘多远」
            const t = Math.min(Math.max(-sdf(x, y) / rim, 0), 1);
            // smoothstep 反向：边缘处 1，往中心衰减到 0，避免出现一圈硬边
            const f = 1 - t * t * (3 - 2 * t);
            if (f <= 0) {
                img.data[i] = 128;
                img.data[i + 1] = 128;
                img.data[i + 2] = 128;
                img.data[i + 3] = 255;
                continue;
            }
            // 中心差分求法线。SDF 的梯度朝外，取负号让 R/G 在边缘处偏向
            // 「指向内侧」那一侧——配合正的 scale，采样方向就是朝内。
            // 朝内取样既躲开「取到页面外空白」的发虚边，也正是液态玻璃边缘
            // 那种「背景被压向边缘」的观感。
            const e = 1;
            const gx = sdf(x + e, y) - sdf(x - e, y);
            const gy = sdf(x, y + e) - sdf(x, y - e);
            const len = Math.hypot(gx, gy) || 1;
            img.data[i] = 128 - (gx / len) * f * 127;
            img.data[i + 1] = 128 - (gy / len) * f * 127;
            img.data[i + 2] = 128;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
}

/**
 * 面板上实际用的模糊半径。
 *
 * 不直接用「样式 → 毛玻璃效果」那个值：那个是给整个页面做背景模糊用的，25px 会把
 * 面板糊成一片，糊到没有细节可弯，折射就白做了。这里只取它的一小部分。
 */
function lensBlur() {
    return Math.min(12, Math.max(0, store.get("全局.模糊") * 0.35));
}

/**
 * 重建折射滤镜。只跟窗口尺寸、模糊与折射强度有关——位移贴图的边缘永远落在窗口
 * 边界上，与窗口在屏幕上的位置无关，所以拖动窗口不必重建。
 *
 * 模糊和折射都在这一条滤镜里做，顺序是先糊再弯，正是毛玻璃的成像顺序。
 * 模糊之所以不放在 .lg-desk 上（用 CSS 的 filter: blur()），是因为 CSS filter 在
 * 元素边界外按透明处理，面板贴着屏幕边时会出现一圈发虚的边；backdrop-filter 的
 * 采样在边界外是钳制的，不会。
 */
function buildLensFilter() {
    const refract = store.get("剪贴板历史.折射强度");
    const blur = lensBlur();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const key = `${w}x${h}#${refract.toFixed(2)}#${blur.toFixed(2)}`;
    if (key === lensKey) return;
    lensKey = key;

    const head =
        blur > 0
            ? `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="frost"/>`
            : '<feOffset in="SourceGraphic" result="frost"/>';

    if (refract <= 0) {
        // 折射强度为 0 = 只模糊不折射，滤镜到此为止，输出就是 frost
        lgFilter.innerHTML = head;
        return;
    }

    const radius =
        Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
                "--border-radius",
            ),
        ) || 8;
    const band = lensBand(w, h);
    // 边缘处的最大位移量，取带宽的 0.7 倍：位移/带宽就是这个位置的平均放大率，
    // 0.7 约等于 1.7 倍压缩，是「看得出在弯、但还认得出背景」的区间。
    const amp = band * 0.7 * refract;
    // feDisplacementMap 的 scale 是通道满量程（±127/255≈0.498）对应的位移，
    // 所以要乘 1/0.498 才能让边缘处正好达到 amp。
    const base = (amp / 0.498) * 1;
    // 三通道各差一点点位移量，做出色散。差值随 amp 走，面板小的时候不至于糊成彩虹。
    const chroma = amp * 0.1;
    const map = buildLensMap(w, h, radius, band);
    const at = (s: number) =>
        `in="frost" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G"`;
    // 三个通道用不同位移量各弯一次，再把各通道加回去。
    // 相加而不是 screen 混合：每张图只有一个通道非零，相加才正好还原亮度。
    // 注意矩阵的对角线必须落在第 k 行第 k 列——写成固定的 "1 0 0 0 0"
    // 会让三个通道全都取 R，合成出来就是一张灰度图。
    const keep = (k: number) => {
        const rows = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0],
        ];
        rows[k][k] = 1;
        return rows.map((r) => r.join(" ")).join(" ");
    };
    lgFilter.innerHTML = [
        head,
        `<feImage href="${map}" result="map" preserveAspectRatio="none"/>`,
        `<feDisplacementMap ${at(base - chroma)} result="dr"/>`,
        `<feDisplacementMap ${at(base)} result="dg"/>`,
        `<feDisplacementMap ${at(base + chroma)} result="db"/>`,
        `<feColorMatrix in="dr" type="matrix" values="${keep(0)}" result="cr"/>`,
        `<feColorMatrix in="dg" type="matrix" values="${keep(1)}" result="cg"/>`,
        `<feColorMatrix in="db" type="matrix" values="${keep(2)}" result="cb"/>`,
        `<feComposite in="cr" in2="cg" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="crg"/>`,
        `<feComposite in="crg" in2="cb" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>`,
    ].join("");
}

/** 截图所在显示器（屏幕坐标，DIP）与面板内容区（屏幕坐标，DIP） */
let deskDisp: ClipGeom["disp"] | null = null;
let deskContent: ClipGeom["content"] | null = null;
/** 当前桌面图的 objectURL，换图时要释放上一张 */
let deskUrl = "";

/** 把桌面图按屏幕坐标摆正。窗口移动时只需重设 left/top，不必重画 */
function placeDesk() {
    if (!deskDisp || !deskContent) return;
    lgDesk.style({
        left: `${deskDisp.x - deskContent.x}px`,
        top: `${deskDisp.y - deskContent.y}px`,
        width: `${deskDisp.width}px`,
        height: `${deskDisp.height}px`,
    });
}

/** 两个滑块都为 0 时，主进程不采集桌面，面板退回纯色玻璃 */
function glassOff() {
    return (
        store.get("剪贴板历史.玻璃强度") <= 0 &&
        store.get("剪贴板历史.折射强度") <= 0
    );
}

function applyGlass() {
    const s = document.documentElement.style;
    s.setProperty("--lg-i", String(store.get("剪贴板历史.玻璃强度")));
    s.setProperty("--lg-refract", String(store.get("剪贴板历史.折射强度")));
    // 色纱的厚度跟着「样式 → 毛玻璃效果 → 不透明度」走。initStyle 只在页面加载时
    // 设过一次，用户在设置页拖滑块之后得在这里补上，否则面板要重开才变。
    s.setProperty("--alpha", `${store.get("全局.不透明度") * 100}%`);
    // 只负责「关」：lg-bg 由桌面图到位时打开（见 clipHistoryBackdrop），
    // 这样图还没来时不会先闪一层色纱。
    if (glassOff()) document.body.classList.remove("lg-bg");
    buildLensFilter();
}
applyGlass();

renderOn("clipHistoryBackdrop", ([b]) => {
    if (glassOff()) return;
    deskDisp = b.disp;
    deskContent = b.content;
    const url = URL.createObjectURL(
        new Blob([b.data as unknown as BlobPart], { type: "image/jpeg" }),
    );
    if (deskUrl) URL.revokeObjectURL(deskUrl);
    deskUrl = url;
    lgDesk.style({ backgroundImage: `url("${url}")` });
    document.body.classList.add("lg-bg");
    placeDesk();
});

// 窗口移动/缩放时主进程只推几何，不重新截图：图是屏幕对齐的，改一下 left/top 就行。
renderOn("clipHistoryBackdropGeom", ([g]) => {
    if (glassOff()) return;
    deskDisp = g.disp;
    deskContent = g.content;
    placeDesk();
});

// 设置页拖「玻璃强度 / 折射强度」时走这条：只重算外观，不重列历史
renderOn("clipHistoryGlass", () => {
    applyGlass();
});

let placePending = false;
window.addEventListener("resize", () => {
    if (placePending) return;
    placePending = true;
    requestAnimationFrame(() => {
        placePending = false;
        placeDesk();
        buildLensFilter();
    });
});

// 反光跟着指针走。用 rAF 合并同一帧里的多次移动，否则高频 pointermove 会让
// 每次移动都写一次自定义属性，白白触发样式重算。
let specPending = false;
window.addEventListener("pointermove", (e) => {
    if (specPending) return;
    specPending = true;
    requestAnimationFrame(() => {
        specPending = false;
        const s = document.documentElement.style;
        s.setProperty("--mx", `${e.clientX}px`);
        s.setProperty("--my", `${e.clientY}px`);
    });
});

const padding = cssVar("o-padding");

function iconEl(src: IconType) {
    return image(getImgUrl(`${src}.svg`), "icon").class("icon");
}

function iconB(src: IconType, title: string, onClick: () => void) {
    return button(iconEl(src))
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
    listEl.el.classList.remove("lg-appear"),
);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    listEl.el.classList.remove("lg-appear");
    // 读一次布局强制重排，否则同一个类加回去不会重新播动画
    void listEl.el.offsetWidth;
    listEl.el.classList.add("lg-appear");
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
    const card = view().class(Class.deco).style({
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
            iconB("star", item.pinned ? t("取消固定") : t("固定"), () =>
                renderSend("clipHistoryPin", [item.id, !item.pinned]),
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
    // 设置页改了玻璃强度会走这个通道，顺手重读一次
    applyGlass();
    render();
});
