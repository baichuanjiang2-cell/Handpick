import { button, ele, image, input, pack, select, view } from "dkh-ui";
import store from "../../../lib/store/renderStore";
import { t } from "../../../lib/translate/translate";
import { iconButton as iconBEl } from "../lib/ui";
import { Class, getImgUrl, initStyle } from "../root/root";

initStyle(store);

pack(document.body).style({
    background: "var(--bg)",
    color: "var(--font-color)",
    padding: "24px",
});

function section(title: string) {
    const s = view("y").style({ gap: "8px", marginBottom: "24px" }).addInto();
    s.add(
        ele("h2").add(t(title)).style({
            fontFamily: "var(--title-font)",
            fontSize: "20px",
            fontWeight: "600",
            margin: "0 0 4px",
            paddingBottom: "6px",
            borderBottom: "1px solid var(--border-color)",
        }),
    );
    return s;
}

function chip(name: string, color: string) {
    return view("y")
        .style({ gap: "4px", width: "auto", alignItems: "center" })
        .add([
            view().style({
                width: "72px",
                height: "40px",
                borderRadius: "var(--border-radius)",
                backgroundColor: color,
                outline: "1px solid var(--border-color)",
                outlineOffset: "-1px",
            }),
            ele("small")
                .add(t(name))
                .style({ color: "var(--font-color-l)", whiteSpace: "nowrap" }),
        ]);
}

const root = view("y").style({ gap: "8px", maxWidth: "760px" }).addInto();

root.add(
    ele("h1").add(t("纸墨编辑部 · 设计样本")).style({
        fontFamily: "var(--title-font)",
        fontSize: "28px",
        fontWeight: "600",
        margin: "0 0 4px",
    }),
);
root.add(
    ele("p")
        .add(
            t(
                "这一页是「纸墨编辑部」设计语言的样板：字体、色板、形状、控件。亮/暗主题切换走设置里的「深色模式」。",
            ),
        )
        .style({ color: "var(--font-color-l)", margin: "0 0 24px" }),
);

const fontSec = section("字体");
fontSec.add(
    ele("div").add(t("标题 · 思源宋体 · 金石可镂，纸上春秋")).style({
        fontFamily: "var(--title-font)",
        fontSize: "24px",
        fontWeight: "600",
    }),
);
fontSec.add(
    ele("div")
        .add(
            t(
                "正文 · 思源黑体 · 用平实的字形承载界面里大部分文字，让内容先于装饰被读到。",
            ),
        )
        .style({ fontFamily: "var(--main-font)", fontSize: "14px" }),
);
fontSec.add(
    ele("div")
        .add(t("数字 · Fraunces · 0123456789  3.14  96%  2026-10-18"))
        .style({
            fontFamily: "var(--num-font)",
            fontVariationSettings: '"SOFT" 30, "WONK" 1, "opsz" 40',
            fontSize: "18px",
        }),
);
fontSec.add(
    view()
        .class(Class.gap)
        .style({ flexDirection: "row", flexWrap: "wrap" })
        .add([
            ele("kbd").add("Ctrl"),
            ele("kbd").add("Alt"),
            ele("kbd").add("V"),
            ele("span")
                .add(t("快捷键样例"))
                .style({ color: "var(--font-color-l)" }),
        ]),
);

const colorSec = section("色板");
colorSec.add(
    view()
        .style({ flexDirection: "row", flexWrap: "wrap", gap: "8px" })
        .add([
            chip("纸底 --bg", "var(--bg)"),
            chip("条底 --bar-bg0", "var(--bar-bg0)"),
            chip("强调 --emphasis", "var(--emphasis-color)"),
            chip("字色 --font-color", "var(--font-color)"),
            chip("金 重点", "var(--accent-gold)"),
            chip("朱砂 批注", "var(--accent-cinnabar)"),
            chip("墨绿 辅助", "var(--accent-pine)"),
            chip("琥珀 微光", "var(--accent-amber)"),
        ]),
);

const shapeSec = section("形状与卡片");
shapeSec.add(
    view("y")
        .style({
            gap: "8px",
            padding: "12px",
            borderRadius: "var(--border-radius)",
            outline: "1px solid var(--border-color)",
            outlineOffset: "-1px",
            width: "auto",
            maxWidth: "420px",
        })
        .add([
            ele("div").add(t("纸条卡片 · 6px 小圆角 + 细墨线描边")).style({
                fontFamily: "var(--title-font)",
                fontWeight: "600",
            }),
            ele("div")
                .add(t("阴影克制、分隔靠墨线，卡片像纸上裁下的一张条子。"))
                .style({ color: "var(--font-color-l)", fontSize: "13px" }),
        ]),
);
shapeSec.add(
    view("y")
        .style({
            position: "relative",
            gap: "8px",
            padding: "12px",
            paddingLeft: "18px",
            borderRadius: "var(--border-radius)",
            outline: "1px solid var(--border-color)",
            outlineOffset: "-1px",
            backgroundColor:
                "color-mix(in oklab, var(--bg) 92%, var(--accent-gold))",
            width: "auto",
            maxWidth: "420px",
        })
        .add([
            view().style({
                position: "absolute",
                left: "0",
                top: "0",
                bottom: "0",
                width: "3px",
                borderRadius: "var(--border-radius) 0 0 var(--border-radius)",
                backgroundColor: "var(--accent-gold)",
            }),
            view()
                .style({
                    flexDirection: "row",
                    gap: "8px",
                    alignItems: "center",
                })
                .add([
                    image(getImgUrl("star-fill.svg"), "icon")
                        .class("icon")
                        .style({
                            width: "18px",
                            height: "18px",
                            maxWidth: "none",
                            maxHeight: "none",
                            filter: "none",
                        }),
                    ele("div")
                        .add(t("重点标记 · 金色色带 + 实心金星 + 微暖底色"))
                        .style({
                            fontFamily: "var(--title-font)",
                            fontWeight: "600",
                        }),
                ]),
            ele("div")
                .add(t("全软件的「重点」都用这一套金色语言。"))
                .style({ color: "var(--font-color-l)", fontSize: "13px" }),
        ]),
);

const ctrlSec = section("控件");
ctrlSec.add(
    view()
        .style({
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
        })
        .add([
            button(t("文字按钮")),
            button(t("主操作")).style({
                backgroundColor: "var(--emphasis-color)",
                color: "var(--font-color-emphasis)",
            }),
            iconBEl("translate"),
            iconBEl("copy"),
            select([{ value: "1", name: t("下拉选择") }]),
            input().sv(t("输入框")),
            input("checkbox"),
        ]),
);

const barSec = section("玻璃条 · 覆盖层工具条");
barSec.add(
    view()
        .style({
            padding: "16px",
            borderRadius: "var(--border-radius)",
            backgroundImage: "linear-gradient(120deg, #c9b8a0, #8aa0b8)",
            width: "auto",
            maxWidth: "420px",
        })
        .add(
            view()
                .class(Class.glassBar)
                .add([
                    iconBEl("copy"),
                    iconBEl("translate"),
                    iconBEl("edit"),
                    iconBEl("close"),
                ]),
        ),
);
