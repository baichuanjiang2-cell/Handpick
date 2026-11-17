const { ipcRenderer } = require("electron");
import type { setting } from "../../src/ShareTypes"; // 使用类型映射和条件类型来解析路径

type Join<K, P> = K extends string | number
    ? P extends string | number
        ? `${K}.${P}`
        : never
    : never;

type Paths<T> = T extends object
    ? {
          [K in keyof T]-?: K extends string | number
              ? `${K}` | Join<K, Paths<T[K]>>
              : never;
      }[keyof T]
    : never;

type SettingPath = Paths<setting>;

type GetValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? GetValue<T[K], Rest>
        : never
    : P extends keyof T
      ? T[P]
      : never;

// get 走 sendSync（阻塞渲染进程）。热路径（截屏页逐帧、编辑器高频读配置）
// 会反复读同一条设置，这里加一层短 TTL 缓存：命中就不发 IPC，
// 跨窗口的设置变化最多 300ms 后可见——低于人的感知阈值。
const CACHE_TTL_MS = 300;
const cache = new Map<string, { value: unknown; at: number }>();

const store = {
    get: <P extends SettingPath>(path: P): GetValue<setting, P> => {
        const cached = cache.get(path);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS)
            return cached.value as GetValue<setting, P>;
        const value = ipcRenderer.sendSync("store", { type: "get", path });
        cache.set(path, { value, at: Date.now() });
        return value;
    },
    set: <P extends SettingPath>(
        path: P,
        value: GetValue<setting, P> | (unknown & {}),
    ): void => {
        cache.set(path, { value, at: Date.now() });
        ipcRenderer.send("store", { type: "set", path, value });
    },
    getAll: () => {
        cache.clear();
        return ipcRenderer.sendSync("store", { type: "getAll" }) as setting;
    },
    setAll: (value: setting) => {
        cache.clear();
        ipcRenderer.send("store", { type: "setAll", value });
    },
};

export default store;

export type { SettingPath, GetValue };
