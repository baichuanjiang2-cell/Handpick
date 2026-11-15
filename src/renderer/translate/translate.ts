import xtranslator, { matchFitLan } from "xtranslator";
import { Class, getImgUrl, initStyle } from "../root/root";
const fs = require("node:fs") as typeof import("fs");
import { initFastText } from "@xushengfeng/fasttext_wasm";
import { writeText } from "../lib/clipboard";

import { renderOn, renderSend } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";

import { button, ele, image, pText, pack, spacer, txt, view } from "dkh-ui";

import { t } from "../../../lib/translate/translate";
import type { IconType } from "../../iconTypes";
import { getTranslators } from "../lib/translate";

initStyle(store);

document.title = t("翻译");

function iconEl(img: IconType) {
    return image(getImgUrl(`${img}.svg`), "icon").class("icon");
}

function iconButton(img: IconType, title?: string) {
    const b = button(iconEl(img));
    if (title) b.attr({ title });
    return b;
}

type TranslatorConfig = {
    id: string;
    name: string;
    type: keyof typeof import("xtranslator")["default"]["e"] | "llm";
    keys: Record<string, string | object>;
};

type HistoryItem = {
    time: number;
    from: string;
    to: string;
    source: string;
    results: { engine: string; text: string }[];
};

type saveData = {
    from: string;
    to: string;
    fromT: string;
    toT: string;
    engine: string;
};

let fyq: TranslatorConfig[] = store.get("翻译.翻译器");
let fanyiqi = new Map(
    fyq.map((f) => {
        const e = getTranslators(store, f);
        return [f.id, e];
    }),
);

let showCang = store.get("翻译.收藏");
let c常用语言 = store.get("翻译.常用语言").filter(Boolean);

/* ── 页面骨架：标题行 / 方向行 / 源文 / 结果账册 ────────────── */

pack(document.body).style({
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
});

const page = view("y").class("tr-page").style({ height: "100%" });

const h1 = ele("h1")
    .class("tr-title")
    .add(txt(t("翻译")));
const historyBtn = button(iconEl("history"))
    .class("tr-ghost")
    .attr({ title: t("翻译历史") })
    .add(txt(t("历史")));

const titleRow = view("x")
    .style({ alignItems: "center", width: "100%" })
    .class(Class.gap)
    .add([h1, spacer(), historyBtn]);

const input = ele("textarea")
    .class("tr-input")
    .attr({
        placeholder: t("输入或粘贴要翻译的内容"),
    });

const results = view("y").class("tr-ledger").style({ width: "100%" });

/* ── 语言方向：from ⇅ to + 「检测到」徽标 ─────────────────── */

const setLan = (el: HTMLSelectElement, lan: string) => {
    const supportLans = Array.from(el.querySelectorAll("option")).map(
        (i) => i.value,
    );
    const matchLan = matchFitLan(lan, supportLans) ?? supportLans[0];
    el.value = matchLan;
};

const lansFrom = ele("select")
    .on("change", () => {
        updateChip();
        translate(input.el.value);
    })
    .bindGet((el) => el.value)
    .bindSet((lan: string, el) => setLan(el, lan));
const lansTo = ele("select")
    .on("change", () => {
        translate(input.el.value);
    })
    .bindGet((el) => el.value)
    .bindSet((lan: string, el) => setLan(el, lan));

const swapBtn = iconButton("updown", t("交换语言方向")).on("click", () => {
    const from = lansFrom.gv;
    const to = lansTo.gv;
    lansTo.sv(from === "auto" ? (detectedLan ?? to) : from);
    lansFrom.sv(to);
    updateChip();
    translate(input.el.value);
});

const detectChip = view("x")
    .class("tr-chip")
    .style({ display: "none" })
    .attr({ title: t("点击锁定该语言") })
    .on("click", () => {
        if (!detectedLan) return;
        lansFrom.sv(detectedLan);
        updateChip();
    });

const dirRow = view("x")
    .class("tr-dir-row")
    .class(Class.gap)
    .add([lansFrom, swapBtn, lansTo, detectChip]);

page.add([titleRow, dirRow, input, results]);
page.addInto();

/** 「语言.语言」下的语言显示名；auto 显示「自动」 */
function lanName(lan: string) {
    if (lan === "auto") return t("自动");
    const trans = new Intl.DisplayNames(store.get("语言.语言"), {
        type: "language",
    });
    // of() 的入参被类型库收窄成了语言枚举联合，运行时接受任意 BCP-47 串
    return (trans.of as (tag: string) => string | undefined)(lan) ?? lan;
}

let detectedLan: string | undefined;

function updateChip() {
    if (lansFrom.gv === "auto" && detectedLan && input.el.value.trim()) {
        detectChip.clear();
        detectChip.add(txt(`${t("检测到")} · ${lanName(detectedLan)}`));
        detectChip.el.style.display = "";
    } else {
        detectChip.el.style.display = "none";
    }
}

/** 结果账册：每引擎一条，加载 / 成功 / 失败三态 */
function noTranslatorTip() {
    return view("y")
        .class("tr-empty")
        .add([
            txt(t("还没有可用的翻译引擎")),
            button(t("请在设置添加翻译器")).on("click", () => {
                renderSend("appAction", ["settings"]);
            }),
        ]);
}

function buildEntry(engine: TranslatorConfig, text: string) {
    const engineEl = txt(engine.name).class("tr-engine");

    const content = pText("").class("tr-body");
    const reTransEl = pText("").class("tr-retrans").style({ display: "none" });
    const errorRow = view("x")
        .class("tr-error-row")
        .style({ display: "none" })
        .add([
            view().class("tr-error-dot"),
            txt("").class("tr-error-msg"),
            button(t("重试")).class("tr-retry"),
        ]);
    const errorMsg = errorRow.el.querySelector(".tr-error-msg") as HTMLElement;
    const bodyWrap = view("y")
        .class("tr-body-wrap")
        .add([content, errorRow, reTransEl]);

    const copyBtn = iconButton("copy", t("复制"));
    const saveBtn = iconButton("star", t("收藏")).style({
        display: showCang.fetch.length || showCang.文件.length ? "" : "none",
    });
    const reTryBtn = iconButton("reload", t("重试"));
    const retransBtn = iconButton("replace", t("回译"));
    const actions = view("y")
        .class("tr-actions")
        .add([copyBtn, saveBtn, reTryBtn, retransBtn]);

    const root = view("x")
        .class("tr-entry")
        .style({ width: "100%" })
        .add([engineEl, bodyWrap, actions]);

    const setLoading = () => {
        content.clear();
        content.add(
            view("y")
                .style({ gap: "6px", width: "100%" })
                .add([
                    view().class("tr-bar").style({ width: "72%" }),
                    view().class("tr-bar").style({ width: "46%" }),
                ]),
        );
        errorRow.el.style.display = "none";
        reTransEl.el.style.display = "none";
        reTransEl.clear();
    };

    const setText = (ttext: string) => {
        content.clear();
        content.sv(ttext);
        errorRow.el.style.display = "none";
        copyBtn.on("click", () => {
            writeText(ttext);
        });
        saveBtn.on("click", () => {
            saveW({
                from: resolvedFrom(),
                to: lansTo.gv,
                fromT: text,
                toT: ttext,
                engine: engine.name,
            });
        });
    };

    const setError = (msg: string) => {
        content.clear();
        errorRow.el.style.display = "";
        errorMsg.textContent = msg;
        errorMsg.onclick = () => {
            // 点错误句展开原始报错（保留旧交互）
            errorMsg.textContent = lastErrorDetail;
            errorMsg.onclick = null;
        };
    };

    let lastErrorDetail = "";

    const run = () => {
        setLoading();
        const ff = fanyiqi.get(engine.id);
        if (!ff) {
            root.style({ order: "1" });
            lastErrorDetail = t("翻译器不存在");
            setError(lastErrorDetail);
            return;
        }
        // @ts-ignore run() 的语言入参被类型库收窄成联合，运行时接受 auto 与检测值
        ff.run(text, resolvedFrom(), lansTo.gv)
            .then((_ttext: string) => {
                root.style({ order: "0" });
                const ttext = _ttext.trim();
                setText(ttext);
                recordResult(engine.name, ttext);
                retransBtn.on("click", async () => {
                    // @ts-ignore 同上
                    const rt = await ff.run(ttext, lansTo.gv, resolvedFrom());
                    reTransEl.clear();
                    reTransEl.sv(rt);
                    reTransEl.el.style.display = "";
                });
            })
            .catch((err: Error) => {
                console.error(err);
                root.style({ order: "1" });
                lastErrorDetail = String(err);
                if (err.message.includes("[1]")) {
                    setError(
                        `${t("不支持输入语言")} ${lanName(resolvedFrom())}`,
                    );
                } else if (err.message.includes("[2]")) {
                    setError(`${t("不支持输出语言")} ${lanName(lansTo.gv)}`);
                } else {
                    setError(t("翻译失败，请重试，点击查看错误信息"));
                }
            });
    };
    reTryBtn.on("click", run);
    return { root, run };
}

function resolvedFrom() {
    return lansFrom.gv === "auto" ? (detectedLan ?? "auto") : lansFrom.gv;
}

/* ── 翻译历史抽屉 ─────────────────────────────────────────── */

const historyList = view("y").class("tr-history-list");

const drawer = view("y")
    .class("tr-drawer")
    .add([
        view("x")
            .class("tr-drawer-head")
            .class(Class.gap)
            .add([
                ele("h2")
                    .class("tr-drawer-title")
                    .add(txt(t("翻译历史"))),
                spacer(),
                iconButton("close", t("关闭")).on("click", closeDrawer),
            ]),
        historyList,
        view("x")
            .class("tr-drawer-foot")
            .add([
                button(t("清空历史"))
                    .class("tr-clear")
                    .on("click", clearHistory),
            ]),
    ]);

const backdrop = view()
    .class("tr-backdrop")
    .style({ display: "none" })
    .on("click", closeDrawer);

backdrop.addInto();
drawer.addInto();

function openDrawer() {
    renderHistory();
    drawer.el.classList.add("open");
    backdrop.el.style.display = "";
    const closeBtn = drawer.el.querySelector(
        ".tr-drawer-head button",
    ) as HTMLButtonElement | null;
    closeBtn?.focus();
}
historyBtn.on("click", openDrawer);

function closeDrawer() {
    drawer.el.classList.remove("open");
    backdrop.el.style.display = "none";
}

function clearHistory() {
    if (confirm(t("确定要清空全部翻译历史吗？"))) {
        store.set("翻译.历史", []);
        renderHistory();
    }
}

function fmtTime(time: number) {
    return new Date(time).toLocaleString(store.get("语言.语言"), {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function renderHistory() {
    historyList.clear();
    const arr: HistoryItem[] = store.get("翻译.历史") || [];
    if (!arr.length) {
        historyList.add(txt(t("还没有翻译记录")).class("tr-history-empty"));
        return;
    }
    for (const h of arr) {
        const first = h.results[0];
        const item = view("y")
            .class("tr-history-item")
            .attr({ title: t("点击恢复这次翻译") })
            .add([
                txt(
                    `${fmtTime(h.time)} · ${lanName(h.from)} → ${lanName(h.to)}${first ? ` · ${first.engine}` : ""}`,
                ).class("tr-history-meta"),
                txt(h.source).class("tr-history-src"),
                txt(first ? first.text : "").class("tr-history-res"),
            ]);
        item.on("click", () => {
            input.el.value = h.source;
            lansFrom.sv(h.from);
            lansTo.sv(h.to);
            if (h.from !== "auto") detectedLan = h.from;
            updateChip();
            closeDrawer();
            translate(h.source);
            input.el.focus();
        });
        historyList.add(item);
    }
}

let histTimer: NodeJS.Timeout;
let currentEntry: HistoryItem | undefined;

/** 单条引擎结果落地就记；一秒没有新结果才落盘，连续改同一句只更新同一条 */
function recordResult(engine: string, text: string) {
    if (!currentEntry) return;
    currentEntry.results.push({ engine, text });
    if (histTimer) clearTimeout(histTimer);
    histTimer = setTimeout(saveHistory, 1000);
}

function saveHistory() {
    const entry = currentEntry;
    if (!entry || !entry.results.length) return;
    const arr: HistoryItem[] = store.get("翻译.历史") || [];
    const prev = arr[0];
    if (
        prev &&
        prev.source === entry.source &&
        prev.from === entry.from &&
        prev.to === entry.to
    ) {
        prev.results = entry.results;
        prev.time = entry.time;
        store.set("翻译.历史", arr);
    } else {
        store.set("翻译.历史", [entry, ...arr].slice(0, 200));
    }
    if (drawer.el.classList.contains("open")) renderHistory();
}

/* ── 翻译主流程 ───────────────────────────────────────────── */

function translate(_text: string) {
    results.clear();
    currentEntry = undefined;
    const text = _text.trim();
    if (!text) return;

    const toLan = lansTo.gv;

    currentEntry = {
        time: Date.now(),
        from: resolvedFrom(),
        to: toLan,
        source: text,
        results: [],
    };

    for (const i of fyq) {
        const entry = buildEntry(i, text);
        results.add(entry.root);
        entry.run();
    }

    const fromLan = lansFrom.gv;
    const cl = c常用语言.filter((k) => k !== fromLan && k !== toLan);
    store.set(
        "翻译.常用语言",
        [toLan, fromLan, ...cl].filter((k) => k && k !== "auto").slice(0, 5),
    );

    if (fyq.length === 0) {
        results.add(noTranslatorTip());
    }
}

function saveW(obj: saveData) {
    try {
        saveFile(obj);
    } catch (error) {
        console.error("保存到文件失败", error);
    }
    try {
        saveFetch(obj);
    } catch (error) {
        console.error("保存到网络失败", error);
    }
}

function saveTemplate(t: string, obj: saveData) {
    return t
        .replaceAll("${from}", obj.from)
        .replaceAll("${to}", obj.to)
        .replaceAll("${fromT}", obj.fromT)
        .replaceAll("${toT}", obj.toT)
        .replaceAll("${engine}", obj.engine);
}

function saveFile(obj: saveData) {
    const filesx = showCang.文件;
    for (const i of filesx) {
        fs.appendFile(i.path, `\n${saveTemplate(i.template, obj)}`, () => {});
    }
}

function saveFetch(obj: saveData) {
    const webx = showCang.fetch;
    for (const i of webx) {
        fetch(saveTemplate(i.url, obj), {
            method: i.method,
            body: saveTemplate(i.body, obj),
            headers: i.headers,
        });
    }
}

function pick2First(list: { text: string; lan: string }[], toPick: string[]) {
    const baseList = list.filter((i) => !toPick.includes(i.lan));
    const first = toPick.map(
        (i) => list.find((j) => j.lan === i) || { text: i, lan: i },
    );
    return first.concat(baseList);
}

function detectLan(text: string) {
    const d = text.trim() ? fasttext?.identify(text)?.alpha2 : undefined;
    detectedLan = d ?? undefined;
    updateChip();
}

/** 首次带入文本时挑一个常用目标语言（不打扰用户此后手动选的方向） */
function pickToLan(fromLan: string) {
    const m = matchFitLan(fromLan, c常用语言);
    return c常用语言.filter((i) => i !== m).at(0) ?? store.get("语言.语言");
}

const inputText = decodeURIComponent(
    new URLSearchParams(location.search).get("text") || "",
).trim();

function fillLanSelects() {
    const from = lansFrom.gv;
    const to = lansTo.gv;
    const allFromLan = Array.from(
        new Set(
            fyq.flatMap(
                (f) =>
                    xtranslator.e[f.type === "llm" ? "chatgpt" : f.type]?.lan,
            ),
        ),
    );
    const allToLan = Array.from(
        new Set(
            fyq.flatMap(
                (f) =>
                    xtranslator.e[f.type === "llm" ? "chatgpt" : f.type]
                        ?.targetLan,
            ),
        ),
    );

    lansFrom.clear();
    lansTo.clear();
    lansFrom.add(
        pick2First(getLansName(allFromLan), ["auto", ...c常用语言]).map((v) =>
            ele("option").add(txt(v.text)).attr({ value: v.lan }),
        ),
    );
    lansTo.add(
        pick2First(getLansName(allToLan), c常用语言).map((v) =>
            ele("option").add(txt(v.text)).attr({ value: v.lan }),
        ),
    );
    lansFrom.sv(from || "auto");
    lansTo.sv(to || store.get("语言.语言"));
    updateChip();
}

function getLansName(l: string[]) {
    return l
        .map((i) => ({ text: lanName(i), lan: i }))
        .toSorted((a, b) =>
            a.text.localeCompare(b.text, store.get("语言.语言")),
        );
}

fillLanSelects();

/** 控制中心子视图常驻，切回翻译栏目时重读设置里可能刚改过的翻译器 */
function refreshTranslators() {
    fyq = store.get("翻译.翻译器");
    fanyiqi = new Map(
        fyq.map((f) => {
            const e = getTranslators(store, f);
            return [f.id, e];
        }),
    );
    showCang = store.get("翻译.收藏");
    c常用语言 = store.get("翻译.常用语言").filter(Boolean);
    fillLanSelects();
    if (input.el.value.trim()) {
        translate(input.el.value);
        return;
    }
    results.clear();
    if (fyq.length === 0) results.add(noTranslatorTip());
}

renderOn("translateRefresh", refreshTranslators);

input.el.value = inputText;

/** 语言识别模型要联网下载，加载失败也得能打字翻译，所以不等它，好了再启用识别 */
let fasttext:
    | {
          identify(text: string): { alpha2: string | null } | undefined;
      }
    | undefined;
initFastText()
    .then((m) => m.FastText().loadModel())
    .then((model) => {
        fasttext = model;
        if (input.el.value.trim()) detectLan(input.el.value);
    })
    .catch((err) => {
        console.error("语言识别模型加载失败", err);
    });

if (inputText) {
    detectLan(inputText);
    if (!lansTo.gv || detectedLan) lansTo.sv(pickToLan(detectedLan ?? "auto"));
    translate(inputText);
} else {
    lansFrom.sv("auto");
    lansTo.sv(store.get("语言.语言"));
    // 空配置打开就提示（translate() 在触发时也会补一条）
    if (fyq.length === 0) results.add(noTranslatorTip());
}

let composing = false;
input
    .on("compositionstart", () => {
        composing = true;
    })
    .on("compositionend", () => {
        composing = false;
    });

let lastTrans: NodeJS.Timeout;

input.on("input", () => {
    if (composing) return;
    if (lastTrans) clearTimeout(lastTrans);
    lastTrans = setTimeout(() => {
        translate(input.el.value);
    }, 2000);
    detectLan(input.el.value);
});
