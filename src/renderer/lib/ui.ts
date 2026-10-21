import { type ElType, button, image, txt, view } from "dkh-ui";
import { renderSend } from "../../../lib/ipc";
import type { IconType } from "../../iconTypes";
import { getImgUrl } from "../root/root";

/** 类名只允许字母数字和连字符，杜绝任意字符串进 class */
function safeClass(cls: string) {
    return /^[\w-]+$/.test(cls) ? cls : "";
}

function iconEl(src: IconType, cls?: string) {
    return image(getImgUrl(`${src}.svg`), "icon")
        .class("icon")
        .class(safeClass(cls ?? ""));
}

/**
 * 图标按钮：全软件的图标按钮统一从这里出，
 * 各页别再各写一份（历史上 editor/recorder/videoEditor/clip 各写过一遍）。
 * @param title 提示文字，不给就没有 tooltip
 * @param cls 额外类名，如固定星标的 "star-fill"（<img> 吃不到 CSS 变量的例外）
 */
function iconButton(src: IconType, title?: string, cls?: string) {
    const b = button(iconEl(src, cls));
    if (title) b.attr({ title });
    return b;
}

/**
 * 纸墨自绘标题栏：整条可拖动，右侧三个圆点窗控——
 * 金实心 = 最小化、墨线空心 = 最大化/还原、朱砂实心 = 关闭。
 * 配 frame: false 的窗口用（自绘窗控和系统 titleBarOverlay 不共存）。
 */
/** 窗控按钮：28px 见方、细墨线符号，颜色保留纸墨语义 */
function windowCtl(
    name: string,
    glyph: string,
    color: string,
    onClick: () => void,
) {
    return button(glyph)
        .attr({ title: name })
        .style({
            width: "var(--win-ctl-size, 28px)",
            height: "var(--win-ctl-size, 28px)",
            padding: "0",
            borderRadius: "var(--border-radius)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--win-ctl-font, 13px)",
            lineHeight: "1",
            color: color,
            outline: "none",
            flexShrink: "0",
        })
        .on("click", onClick);
}

/** 标准窗控三键：最小化 —、最大化 ▢、关闭 ✕。各窗口共用，放在标题栏右端 */
function windowControls() {
    return view("x")
        .style({
            marginLeft: "auto",
            gap: "var(--win-ctl-gap, 2px)",
            alignItems: "center",
            // @ts-ignore
            "-webkit-app-region": "no-drag",
        })
        .add([
            windowCtl("最小化", "—", "var(--accent-gold)", () =>
                renderSend("windowMinimize", []),
            ),
            windowCtl("最大化", "▢", "var(--font-color-l)", () =>
                renderSend("windowMaximize", []),
            ),
            windowCtl("关闭", "✕", "var(--accent-cinnabar)", () =>
                renderSend("windowClose", []),
            ),
        ]);
}

/**
 * @param embedded 嵌进控制中心壳时传 true：壳顶栏已有窗控，这里只画标题不画窗控
 */
function titleBar(
    title: string,
    middle?: ElType<HTMLElement>[],
    embedded?: boolean,
) {
    return view("x")
        .style({
            // @ts-ignore
            "-webkit-app-region": "drag",
            alignItems: "center",
            gap: "6px",
            padding: "0 12px",
            height: "36px",
            flexShrink: "0",
            userSelect: "none",
            fontFamily: "var(--title-font)",
        })
        .add(txt(title))
        .add(
            view("x")
                .style({
                    // @ts-ignore
                    "-webkit-app-region": "no-drag",
                    marginLeft: "8px",
                    gap: "6px",
                    alignItems: "center",
                })
                .add(middle ?? []),
        )
        .add(embedded ? [] : windowControls());
}

export { iconEl, iconButton, titleBar, windowControls };
