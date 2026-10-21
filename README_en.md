# eSearch-paste

([中文](README.md) | English)

[![license](https://img.shields.io/github/license/xushengfeng/eSearch)](LICENSE)
[![release](https://img.shields.io/github/v/release/baichuanjiang2-cell/eSearch-paste?label=release)](https://github.com/baichuanjiang2-cell/eSearch-paste/releases/latest)

**A personal fork of [eSearch](https://github.com/xushengfeng/eSearch).** All upstream features are kept (screenshot, OCR, search, translation, pin-to-desktop, screen translation, reverse image search, scrolling capture, screen recording). On top of that, this fork adds two things:

**Clipboard history** — a searchable record of everything you've copied (text, images, file paths). Search it, edit entries in place, open images full-size, and pin entries (pinned ones get a filled gold star).

**The Control Center** — clicking the taskbar button opens the app's shell window: a sidebar plus a top bar, with the clipboard history as the default page. Screenshot, pin-to-desktop, recording, OCR and every other feature live in the sidebar's tool groups, one click away. Opening the app = clicking the taskbar button, and everything is there.

> Upstream has explicitly declined clipboard-manager features ([issue #317](https://github.com/xushengfeng/eSearch/issues/317) and [PR #515](https://github.com/xushengfeng/eSearch/pull/515) are both closed), so this part will not be contributed back and is maintained here only.

> **Note:** the documentation for this fork is written in Chinese. See [`docs/新手使用指南.md`](docs/新手使用指南.md) (Chinese) for the step-by-step guide.

---

## Download

Grab either file from [Releases](https://github.com/baichuanjiang2-cell/eSearch-paste/releases/latest):

| File | Size | Notes |
| --- | --- | --- |
| `esearch_paste-15.7.0-win32-x64.exe` | ~186 MB | **Installer** (recommended). Wizard-based, **no admin rights needed**, creates shortcuts |
| `esearch_paste-15.7.0-win32-x64.zip` | ~246 MB | Portable — unzip and run |

The `esearch_paste-` prefix exists only to avoid confusion with the official build (`eSearch-<version>-win32-x64.exe`). It changes **the file name only** — the internal app name, install location and data directory are unchanged.

Windows may show the blue "Windows protected your PC" warning; click **More info → Run anyway**. The app is unsigned (code-signing certificates cost hundreds of dollars a year), which is normal for small personal tools and does not mean it is malicious.

**Upgrading does not lose data.** The installer and the from-source build share the same data directory, `%APPDATA%\eSearch`.

> ⚠️ This fork shares the same application identity and data directory as the official build. Don't run both at once, and don't install both side by side — they would fight over the same clipboard history.

---

## What this fork adds

| Feature | Description |
| --- | --- |
| **Control Center** | The app's **shell window** (top bar + sidebar + main area) that the taskbar button opens — every feature is reachable from here. It *is* the taskbar button; clicking × just hides it back to the taskbar |
| **Clipboard history** | A searchable record of what you copied, independent of the current system clipboard. Text, images and file paths; the Control Center's default page |
| **Unified entries** | The tray's right-click menu shrank from 20 items to 4 (open Control Center / quick screenshot / pause recording / exit); a left click still does a quick screenshot. All remaining features live in the Control Center's **tool groups**, backed by the same action table as the tray, so nothing gets lost |
| **Paper-ink design** | One consistent look app-wide: warm paper background, gold / vermilion accents, hairline rules and small-radius cards; headings in Source Han Serif, body in Source Han Sans, numerals in Fraunces (a ~2.7 MB common-character subset ships with the app so the typeface never falls back). Dark mode is ink-black with amber glow |
| **Edit entries** | Text and file entries can be edited in place (images can't). If an edit makes two entries identical, they are merged |
| **Full-size image view** | Image entries can be opened full-size in a modal, instead of only the thumbnail |
| **Pin / Recycle bin** | Pinned entries are never auto-pruned, float to the top, and get a filled gold star plus a gold bar on the card. Deleting moves to the recycle bin and can be undone |
| **Type filter** | Show only text / images / files, multi-selectable; stacks with keyword search |
| **Size presets** | How large the Control Center opens from the taskbar: default / 50% / 75% / 100% |
| **Custom data directory** | Supports `--userData`, a `preload_config` file, and portable mode |

---

## The Control Center

Three ways to open it: click the taskbar button, right-click the tray icon → **Open Control Center**, or click the first-run notification. The window defaults to ~**1100 × 720** (shrunk to fit the screen's work area on small displays), is freely movable/resizable, and **remembers its position and size** (if a monitor change puts it off-screen, it recenters automatically).

Layout — top bar, sidebar, main area:

- **Top bar**: quick actions (quick screenshot / auto recognition / back to clipboard) plus the paper-ink window controls (gold = minimize, hollow dot = maximize, vermilion = close)
- **Sidebar**: brand + version; page sections (Clipboard / Translate / AI Vision / Settings) that swap content in the main area; the collapsible **tool groups** (Search & recognition / Recording & pinning / Window / Help & system) holding every action by name; and the **main-page mode** picker (auto / search / translate)
- **Main area**: clipboard history by default; translate, AI Vision and settings switch in here

The main page (editor) and Help remain separate windows; screenshot, pin-to-desktop, screen translation and recorder overlays are full-screen layers launched from the tool groups.

### Look: paper & ink

One consistent look app-wide: warm paper background, gold / vermilion accents, hairline rules and small-radius cards. Headings use Source Han Serif, body text uses Source Han Sans, numerals use Fraunces — a ~**2.7 MB** common-character subset ships with the app, so the typefaces never fall back even offline; rare characters fall back to system fonts.

Dark mode is ink-black with an amber glow. Change it in **Settings → Colors**: four preset palettes (the first one is paper & ink) plus per-color customization, and dark mode can be light / dark / follow system (light by default).

The **tray** now does only two things: left click = quick screenshot (setting: "auto screenshot on tray click", on by default); right click = the 4-item menu.

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

Everything except the clipboard-history and Control Center work comes from upstream. General upstream fixes submitted from this fork: [PR #518](https://github.com/xushengfeng/eSearch/pull/518).
