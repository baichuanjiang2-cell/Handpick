import {
    addClass,
    button,
    dynamicSelect,
    ele,
    image,
    pack,
    trackPoint,
    txt,
    view,
} from "dkh-ui";
import { jsKeyCodeDisplay } from "../../../lib/key";

import { Class, cssVar, getImgUrl, initStyle } from "../root/root";

import { renderOn, renderSend, renderSendSync } from "../../../lib/ipc";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import { typedEntries } from "../../../lib/utils";
import type { IconType } from "../../iconTypes";

/**
 * 录屏悬浮条（ADR 0014：录制期间唯一的控制面）。
 * 两种模式：
 * - zone（区域录屏，超级管线）：待命 → 倒计时/手动开始 → 录制（暂停/停止）→
 *   直出转换进度。开始前可改画质档与格式、切区域/全屏。
 * - classic（经典录屏兼容模式）：只保留 计时 / 暂停 / 停止，状态由旧控制窗管理。
 * 穿透是事件驱动的：窗口以 forward 模式穿透，收到 mousemove 后按命中结果
 * 请求交互/穿透，不再轮询全屏命中。
 */
const mode: "classic" | "zone" =
    new URLSearchParams(location.search).get("mode") === "classic"
        ? "classic"
        : "zone";

type ZoneState = "recording" | "paused" | "converting";

// 「开始前不录」由截图覆盖层的录屏就绪条负责；悬浮条装载时已在录制中
let state: ZoneState = "recording";
const rectOn = true;

/* ── 键鼠可视化（uiohook），可在录制中随时开关 ───────────────── */

type UiohookModule = typeof import("uiohook-napi");
let uiohook: UiohookModule | null = null;
let hooksOn = false;
let hooksAttached = false;

function attachHooks() {
    if (hooksAttached || !uiohook) return;
    hooksAttached = true;
    const { uIOhook, UiohookKey } = uiohook;

    function rKey() {
        const posi = store.get("录屏.提示.键盘.位置");
        const px = posi.x === "+" ? "right" : "left";
        const py = posi.y === "+" ? "bottom" : "top";
        const pel = keysEl.parentElement as HTMLElement;
        pel.style[px] = `${posi.offsetX}px`;
        pel.style[py] = `${posi.offsetY}px`;

        keysEl.style.fontSize = `${store.get("录屏.提示.键盘.大小") * 16}px`;

        const keycode2key: Record<number, string | number> = {};

        for (const [i, v] of typedEntries(UiohookKey)) {
            keycode2key[v] = i;
        }

        const map: { [k: string]: string } = {
            Ctrl: "Control",
            CtrlRight: "ControlRight",
        };

        for (let i = 0; i < 25; i++) {
            const k = String.fromCharCode(65 + i);
            map[k] = `Key${k}`;
        }

        function getKey(keycode: number) {
            const key = keycode2key[keycode] as string;

            const keyDisplay = jsKeyCodeDisplay(map[key] || key);

            const mainKey = keyDisplay.primary ?? key;
            let topKey = keyDisplay?.secondary ?? keyDisplay?.symble ?? "";
            if (keyDisplay.isNumpad) topKey = "";
            return {
                main: mainKey,
                top: topKey,
                numpad: keyDisplay.isNumpad,
                right: keyDisplay.isRight,
            };
        }

        let keyO: number[] = [];

        let lastKey = null as ReturnType<typeof view> | null;

        uIOhook.on("keydown", (e) => {
            if (!hooksOn) return;
            if (!keyO.includes(e.keycode)) keyO.push(e.keycode);
            if (!lastKey) {
                lastKey = view();
                if (posi.x === "+") keysEl.append(lastKey.el);
                else keysEl.insertAdjacentElement("afterbegin", lastKey.el);
            }
            const key = getKey(e.keycode);
            if (["Ctrl", "Alt", "Shift", "Meta"].includes(key.main))
                lastKey.data({ modi: "true" });
            const kbdEl = ele("kbd").add(
                txt(key.main)
                    .class("main_key")
                    .data({ k: e.keycode.toString() }),
            );

            if (key.top) kbdEl.add(txt(key.top).class("top_key"));
            else {
                kbdEl.el.querySelector("span")?.classList.remove("main_key");
                kbdEl.el.classList.add("only_key");
            }
            lastKey.add(kbdEl);
            if (key.numpad) kbdEl.el.classList.add("numpad_key");
            if (key.right) kbdEl.el.classList.add("right_key");
            const l = Array.from(keysEl.children);
            if (posi.x === "+") {
                for (const v of l.slice(0, -10)) v.remove();
            } else {
                for (const v of l.slice(10)) v.remove();
            }
        });
        uIOhook.on("keyup", (e) => {
            if (!hooksOn) return;
            keyO = keyO.filter((i) => i !== e.keycode);
            for (const el of (lastKey?.el
                .querySelectorAll(`[data-k="${e.keycode}"]`)
                ?.values() as Iterable<HTMLElement>) || []) {
                el.classList.add("key_hidden");
            }
            if (keyO.length === 0) {
                const e = lastKey;
                setTimeout(() => {
                    e?.style({ opacity: "0" });
                }, 4000);
                lastKey = null;
            }
        });
    }

    function rMouse() {
        const m2m = {
            1: mouseKey.left,
            3: mouseKey.center,
            2: mouseKey.right,
        };

        uIOhook.on("mousedown", (e) => {
            if (!hooksOn) return;
            const b = e.button as 1 | 2 | 3;
            m2m[b].el.style.backgroundColor = "var(--accent-pine)";
        });
        uIOhook.on("mouseup", (e) => {
            if (!hooksOn) return;
            const b = e.button as 1 | 2 | 3;
            m2m[b].el.style.backgroundColor = "";
        });

        let time_out: NodeJS.Timeout;
        uIOhook.on("wheel", (e) => {
            if (!hooksOn) return;
            const x = {
                3: { 1: "wheel_u", "-1": "wheel_d" },
                4: { 1: "wheel_l", "-1": "wheel_r" },
            } as const;
            if (e.rotation === 1 || e.rotation === -1)
                recorderMouseEl.className = x[e.direction][e.rotation];
            else recorderMouseEl.className = "";
            clearTimeout(time_out);
            time_out = setTimeout(() => {
                recorderMouseEl.className = "";
            }, 200);
        });
    }

    rKey();
    rMouse();
}

/** 开 / 关键鼠可视化：写回设置并动态起停全局钩子 */
function setKeyMouse(on: boolean) {
    store.set("录屏.提示.键盘.开启", on);
    store.set("录屏.提示.鼠标.开启", on);
    (keysEl.parentElement as HTMLElement).style.display = on ? "" : "none";
    if (on) {
        if (!uiohook) uiohook = require("uiohook-napi") as UiohookModule;
        attachHooks();
        if (!hooksOn) {
            uiohook.uIOhook.start();
            hooksOn = true;
        }
    } else if (hooksOn && uiohook) {
        uiohook.uIOhook.stop();
        hooksOn = false;
    }
    kmBtn.el.classList.toggle("km_on", on);
}

/* ── 摄像头 ───────────────────────────────────────────────── */

async function cameraStreamF(id: string | null) {
    if (id) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: id },
        });
        videoEl.srcObject = stream;
        videoEl.play();
        if (store.get("录屏.摄像头.镜像"))
            videoEl.style.transform = "rotateY(180deg)";

        videoEl.oncanplay = () => {
            cEl.style({ display: "" });
            initSeg();
        };
    } else {
        const src = videoEl.srcObject;
        if (src instanceof MediaStream) {
            try {
                src.getVideoTracks()[0].stop();
            } catch (e) {}
        }
        videoEl.srcObject = null;
        cEl.style({ display: "none" });
    }
}

async function getAndSetStream() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoL = devices.filter((i) => i.kind === "videoinput");
    cameraSelect.setList(
        videoL.map((i) => ({
            name: i.label,
            value: i.deviceId,
        })),
    );
    if (videoL.length > 1) {
        cameraSelect.el.style({ display: "" });
    } else cameraSelect.el.style({ display: "none" });
    if (videoL.length > 0) {
        const id =
            videoL.find((i) => i.deviceId === store.get("录屏.摄像头.设备"))
                ?.deviceId ?? videoL[0].deviceId;
        cameraSelect.el.sv(id);
        return id;
    }
    return null;
}

let seg: typeof import("esearch-seg");

async function initSeg() {
    const bgSetting = store.get("录屏.摄像头.背景");
    if (bgSetting.模式 === "none") {
        return;
    }
    const path = require("node:path") as typeof import("path");
    videoEl.style.display = "";
    segEl.clear();
    videoEl.style.display = "none";
    cameraCanvas = document.createElement("canvas");
    segCanvas = document.createElement("canvas");
    const bgEl = document.createElement("div");
    if (bgSetting.模式 === "img" || bgSetting.模式 === "video") {
        const bg =
            bgSetting.模式 === "img"
                ? document.createElement("img")
                : document.createElement("video");
        const url =
            bgSetting.模式 === "img" ? bgSetting.imgUrl : bgSetting.videoUrl;
        bg.src = url;
        bgEl.append(bg);
        bgEl.style.objectFit = bgSetting.fit;
        cameraCanvas.style.display = "none";
    }
    if (bgSetting.模式 === "blur") {
        cameraCanvas.style.filter = `blur(${bgSetting.模糊}px)`;
        cameraCanvas.style.display = "";
    }
    if (bgSetting.模式 === "hide") {
        cameraCanvas.style.display = "none";
    }
    segEl.add([cameraCanvas, bgEl, segCanvas]);
    seg = require("esearch-seg") as typeof import("esearch-seg");
    await seg.init({
        segPath: path.join(__dirname, "../../assets/onnx/seg", "seg.onnx"),
        ort: require("onnxruntime-node"),
        ortOption: {
            executionProviders: [{ name: store.get("AI.运行后端") || "cpu" }],
        },
        shape: [256, 144],
        invertOpacity: true,
        threshold: 0.7,
    });
    drawCamera();
    segEl.style({
        aspectRatio: `auto ${videoEl.videoWidth} / ${videoEl.videoHeight}`,
    });
}

function drawCamera() {
    const canvasCtx = cameraCanvas.getContext("2d")!;
    const segCtx = segCanvas.getContext("2d")!;
    cameraCanvas.width = videoEl.videoWidth;
    cameraCanvas.height = videoEl.videoHeight;
    canvasCtx.drawImage(videoEl, 0, 0, cameraCanvas.width, cameraCanvas.height);
    seg.seg(
        canvasCtx.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height),
    ).then((data) => {
        segCanvas.width = data.width;
        segCanvas.height = data.height;
        segCtx.putImageData(data, 0, 0);
    });
    setTimeout(() => {
        if (videoEl.srcObject) drawCamera();
    }, 10);
}

/* ── 页面骨架 ─────────────────────────────────────────────── */

function iconEl(src: IconType) {
    return image(getImgUrl(`${src}.svg`), "icon").class("icon");
}

initStyle(store);

pack(document.body)
    .style({
        overflow: "hidden",
    })
    .class(Class.mono);

const rectEl = view().addInto().attr({ id: "recorder_rect" }).style({
    width: "100vw",
    height: "calc(100vh - 24px)",
    position: "relative",
});
const rb = view().addInto(rectEl).attr({ id: "recorder_bar" });
const keysEl = view().addInto(rb).attr({ id: "recorder_key" }).el;
const mouseKey = {
    left: view(),
    center: view(),
    right: view(),
};
const recorderMouseEl = view()
    .addInto()
    .attr({ id: "mouse_c" })
    .class("mouse")
    .add([mouseKey.left, mouseKey.center, mouseKey.right]).el;

const cEl = view()
    .addInto()
    .style({ position: "fixed", left: 0, top: 0, width: "100px" });

const videoEl = ele("video").addInto(cEl).el;
const segEl = view()
    .attr({ id: "seg" })
    .addInto(cEl)
    .class(
        addClass(
            { position: "relative", overflow: "hidden" },
            { "&>*": { position: "absolute", top: 0, width: "100%" } },
        ),
    );
const cameraSelect = dynamicSelect();
cEl.class(Class.smallSize).add(cameraSelect.el.style({ display: "none" }));
cameraSelect.el.on("change", async () => {
    const id = cameraSelect.el.gv;
    cameraStreamF(id);
    store.set("录屏.摄像头.设备", id);
});

let cameraCanvas: HTMLCanvasElement = document.createElement("canvas");
let segCanvas: HTMLCanvasElement = document.createElement("canvas");

/* ── 控制条 ───────────────────────────────────────────────── */

const timeEl = txt("").class(Class.textItem);

const stopBtn = button(iconEl("stop_record").style({ filter: "none" }))
    .attr({ title: t("停止录制") })
    .on("click", () => {
        renderSend("recordState", ["stop"]);
    });

/** classic：暂停走旧 recordState（旧控制窗内部切换）；zone：发给超级管线 */
const pauseBtn = button(iconEl("play_pause"))
    .attr({ title: t("暂停 / 继续") })
    .on("click", () => {
        if (mode === "classic") renderSend("recordState", ["pause"]);
        else renderSend("recordPauseToggle", []);
    });

const exportCancelBtn = button(iconEl("close"))
    .attr({ title: t("取消导出") })
    .on("click", () => {
        renderSend("exportCancel", []);
    });

const cameraBtn = button(iconEl("eye"))
    .attr({ title: t("摄像头") })
    .on("click", () => {
        const on = !store.get("录屏.摄像头.开启");
        store.set("录屏.摄像头.开启", on);
        renderSend("recordCamera", [on]);
    });

const kmBtn = button(txt(t("键鼠")))
    .attr({ title: t("键盘鼠标提示") })
    .on("click", () => {
        setKeyMouse(!store.get("录屏.提示.键盘.开启"));
    });

/** 直出转换进度 */
const progFill = view().style({
    height: "100%",
    width: "0%",
    borderRadius: "3px",
    backgroundColor: "var(--accent-pine)",
    transition: "width 0.2s",
});
const progTrack = view()
    .style({
        width: "72px",
        height: "6px",
        borderRadius: "3px",
        overflow: "hidden",
        backgroundColor: "color-mix(in srgb, var(--font-color) 15%, var(--bg))",
    })
    .add([progFill]);
const progTxt = txt("").class(Class.textItem);

const controlBar = view("x")
    .class(Class.smallSize, Class.screenBar)
    .addInto()
    .style({
        position: "fixed",
        bottom: 0,
        right: 0,
        borderRadius: cssVar("o-padding"),
        maxWidth: "100%",
    });

/** 按状态重建控制条内容 */
function renderBar() {
    controlBar.clear();
    if (mode === "classic") {
        controlBar.add([stopBtn, pauseBtn, timeEl]);
        return;
    }
    if (state === "recording" || state === "paused") {
        controlBar.add([timeEl, pauseBtn, stopBtn, cameraBtn, kmBtn]);
    } else {
        controlBar.add([progTrack, progTxt, exportCancelBtn]);
    }
}
renderBar();

/* ── 状态镜像 ─────────────────────────────────────────────── */

renderOn("recordStateX", ([s]) => {
    if (mode !== "zone") return;
    state = s;
    renderBar();
});

renderOn("exportProgress", ([p]) => {
    const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
    progFill.style({ width: `${pct}%` });
    progTxt.sv(`${pct}%`);
});

renderOn("recordTime", ([t]) => {
    timeEl.sv(t);
});

renderOn("recordCamera", async ([b]) => {
    if (b) {
        const id = await getAndSetStream();
        cameraStreamF(id);
    } else {
        cameraStreamF(null);
    }
});

/* ── 拖拽 / 缩放摄像头小窗、键鼠初始化 ─────────────────────── */

navigator.mediaDevices.ondevicechange = async () => {
    const id = await getAndSetStream();
    cameraStreamF(id);
};

trackPoint(cEl, {
    start: () => {
        const r = cEl.el.getBoundingClientRect();
        return { x: r.left, y: r.top };
    },
    ing: (p) => {
        cEl.style({ left: `${p.x}px`, top: `${p.y}px` });
    },
});

cEl.on("wheel", (e) => {
    const r = cEl.el.getBoundingClientRect();
    cEl.style({ width: `${r.width * (1 + e.deltaY / 600)}px` });
});

if (mode === "classic") {
    // 经典模式保持旧行为：按设置在装载时起钩子
    if (store.get("录屏.提示.键盘.开启") || store.get("录屏.提示.鼠标.开启"))
        setKeyMouse(true);
} else {
    // 区域录屏默认不显示键鼠提示，悬浮条上可随时开
    (keysEl.parentElement as HTMLElement).style.display = "none";
}

if (store.get("录屏.提示.光标.开启")) recorderMouseEl.style.display = "flex";

const mouseStyle = document.createElement("style");
mouseStyle.innerHTML = `.mouse{${store.get("录屏.提示.光标.样式").replaceAll(";", " !important;")}}`;
document.body.appendChild(mouseStyle);

/* ── 穿透：事件驱动命中 ───────────────────────────────────── */

let overUI = false;

function updateHit(x: number, y: number) {
    const l = document.elementsFromPoint(x, y);
    const hit = l.includes(controlBar.el) || l.includes(cEl.el);
    if (hit !== overUI) {
        overUI = hit;
        renderSend("windowIgnoreMouse", [!hit]);
    }
}

// forward 穿透下 mousemove 仍然到达；交互态下是原生事件。一条监听覆盖两种态。
window.addEventListener("mousemove", (e) => {
    updateHit(e.clientX, e.clientY);
    // 光标可视化跟随（仅开启时可见；窗口外由下面的轮询补）
    if (store.get("录屏.提示.光标.开启")) {
        recorderMouseEl.style.left = `${e.clientX}px`;
        recorderMouseEl.style.top = `${e.clientY}px`;
    }
});

// 鼠标离开窗口（进全屏区域/另一屏）时可能不再有事件，强制恢复穿透
document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget && overUI) {
        overUI = false;
        renderSend("windowIgnoreMouse", [true]);
    }
});

// 光标可视化在窗口外仍要跟随：只在开启时轮询全局鼠标位置
if (store.get("录屏.提示.光标.开启")) {
    setInterval(() => {
        const { x, y } = renderSendSync("getMousePos", []).po;
        recorderMouseEl.style.left = `${x}px`;
        recorderMouseEl.style.top = `${y}px`;
    }, 10);
}
