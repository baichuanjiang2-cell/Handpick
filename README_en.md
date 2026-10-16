# eSearch-paste

([中文](README.md) | English)

[![license](https://img.shields.io/github/license/xushengfeng/eSearch)](LICENSE)
[![release](https://img.shields.io/github/v/release/baichuanjiang2-cell/eSearch-paste?label=release)](https://github.com/baichuanjiang2-cell/eSearch-paste/releases/latest)

**A personal fork of [eSearch](https://github.com/xushengfeng/eSearch).** All upstream features are kept (screenshot, OCR, search, translation, pin-to-desktop, screen translation, reverse image search, scrolling capture, screen recording). On top of that, this fork adds two things:

1. **A clipboard-history panel that lives in the taskbar** — click the taskbar button to browse everything you've copied
2. **A hand-rolled "liquid glass" look** — it does not rely on OS window materials, and is unaffected by the Windows "Transparency effects" setting

> Upstream has explicitly declined clipboard-manager features ([issue #317](https://github.com/xushengfeng/eSearch/issues/317) and [PR #515](https://github.com/xushengfeng/eSearch/pull/515) are both closed), so this part will not be contributed back and is maintained here only.

> **Note:** the documentation for this fork is written in Chinese. See [`docs/新手使用指南.md`](docs/新手使用指南.md) (Chinese) for the step-by-step guide.

---

## Download

Grab either file from [Releases](https://github.com/baichuanjiang2-cell/eSearch-paste/releases/latest):

| File | Size | Notes |
| --- | --- | --- |
| `esearch_paste-15.6.1-win32-x64.exe` | ~183 MB | **Installer** (recommended). Wizard-based, **no admin rights needed**, creates shortcuts |
| `esearch_paste-15.6.1-win32-x64.zip` | ~242 MB | Portable — unzip and run |

The `esearch_paste-` prefix exists only to avoid confusion with the official build (`eSearch-<version>-win32-x64.exe`). It changes **the file name only** — the internal app name, install location and data directory are unchanged.

Windows may show the blue "Windows protected your PC" warning; click **More info → Run anyway**. The app is unsigned (code-signing certificates cost hundreds of dollars a year), which is normal for small personal tools and does not mean it is malicious.

**Upgrading does not lose data.** The installer and the from-source build share the same data directory, `%APPDATA%\eSearch`.

> ⚠️ This fork shares the same application identity and data directory as the official build. Don't run both at once, and don't install both side by side — they would fight over the same clipboard history.

---

## What this fork adds

| Feature | Description |
| --- | --- |
| **Clipboard history** | A searchable record of what you copied, independent of the current system clipboard. Text, images and file paths |
| **Clipboard panel** | A **standalone window** that shows and manages the history — it *is* the taskbar button. Clicking × just hides it back to the taskbar; the app keeps running |
| **Edit entries** | Text and file entries can be edited in place (images can't). If an edit makes two entries identical, they are merged |
| **Full-size image view** | Image entries can be opened full-size in a modal, instead of only the thumbnail |
| **Pin / Recycle bin** | Pinned entries are never auto-pruned; deleting moves to the recycle bin and can be undone |
| **Type filter** | Show only text / images / files, multi-selectable; stacks with keyword search |
| **Size presets** | How large the panel opens from the taskbar: default / 50% / 75% / 100% |
| **Liquid glass** | The panel background is a self-captured desktop screenshot plus real refraction |
| **Custom data directory** | Supports `--userData`, a `preload_config` file, and portable mode |

---

## Liquid glass

The panel's glass is built by the app itself — it does **not** depend on OS window materials, so you never have to turn on Windows' "Transparency effects".

It is made of two stacked parts:

- **Three background layers** — a `desktop capture` (taken while the panel is hidden) → a translucent tint → refraction (the rim bends the background, which is the most recognisable part of the effect)
- **A foreground optical layer** — a 1px rim highlight, a pointer-following sheen, very light grain, and glass strokes on the cards. This layer needs no background pixels, so the panel always looks like glass

Two sliders under Settings → Clipboard history → Liquid glass:

| Slider | Controls | Default |
| --- | --- | --- |
| **Glass intensity** | Strength of the foreground highlights / sheen / grain | 0.6 |
| **Refraction intensity** | How much the background is bent at the panel **rim** | 0.5 |

> Setting both to 0 turns liquid glass off and falls back to the plain colour panel — the app also stops capturing the screen, so there is no overhead at all.

**Why is the background a snapshot from the last time the panel was hidden?** Capturing while the panel is visible would photograph the panel itself (a picture inside a picture). So the app captures only while the panel is **put away**, and grabs one more shot right before showing it — usually less than a second old.

---

## Data location and encryption

```
%APPDATA%\eSearch\剪贴板历史\
├─ index.bin                index of all entries (text, timestamps, pinned flags)
├─ images\                  image entries, one .bin each
└─ ..\clipboardHistory.key  encryption key (in the parent directory)
```

Entries are **not stored in plain text** — they use **AES-256-GCM**, and the key itself is encrypted at rest with the OS credential store (Electron `safeStorage`). Copying `index.bin` off the machine is not enough to read it.

Two honest caveats:

1. This only protects data **at rest**. It will not stop malware, nor someone who can already operate your computer.
2. If the OS cannot provide encryption (rare), the app **falls back to plain text** and shows a **yellow warning banner** at the top of the settings page. If you see that banner, your history is plain text.

> Don't delete `clipboardHistory.key` by hand — every existing entry would become undecryptable.

---

## Known limitations

- The panel background is a **snapshot from the last time the panel was hidden**, not live. This is a deliberate trade-off.
- **Automatic update checking is off by default** (manual only). This fork shares upstream's version lineage, so an upstream release would prompt you to download the official installer — which would overwrite this fork. Upgrading means merging upstream manually and rebuilding.
- The clipboard-history direction **will not go upstream** (see the note at the top).
- Upstream fixes are **not merged automatically**.
- Only tested on **Windows**.

---

## Build from source

```bash
pnpm install

# build and run
pnpm run start

# package: NSIS installer + portable zip
pnpm run dist
```

Artifacts land in `build/`. Note that `pnpm run dev` does not work in this project (native `.node` modules); use `pnpm run start`.

---

## License

[GPL-3.0](LICENSE) © xushengfeng

Everything except the clipboard-history and liquid-glass work comes from upstream. General upstream fixes submitted from this fork: [PR #518](https://github.com/xushengfeng/eSearch/pull/518).
