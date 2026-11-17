const fs = require("node:fs") as typeof import("fs");

import { xget, xset } from "./parse";

import type { GetValue, SettingPath } from "./renderStore";
import type { setting } from "../../src/ShareTypes";
import { safeJSONParse } from "../utils";

type data = {
    [key: string]: unknown;
};

function deepMerge(target: data, source: data): data {
    const result = { ...target };
    for (const key in source) {
        if (source[key]?.constructor === Object && target[key]?.constructor === Object) {
            result[key] = deepMerge(target[key] as data, source[key] as data);
        } else if (target[key] === undefined) {
            result[key] = source[key];
        }
    }
    return result;
}

class Store {
    private configPath: string;
    private data: data | undefined;
    private defaultData: data;
    private writeTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(op: { configPath: string; defaultData?: data }) {
        this.configPath = op.configPath;
        this.defaultData = op.defaultData || {};
        if (!fs.existsSync(this.configPath)) {
            this.init();
        }
        this.data = this.getStore();
        // 防抖窗口内的 set 可能还没落盘进程就退出了（含 app.exit，
        // 它不触发 will-quit）：exit 事件兜底同步写一次
        process.on("exit", () => this.flush());
    }

    setDefaultData(defaultData: setting) {
        this.defaultData = defaultData as unknown as data;
    }

    private init() {
        fs.writeFileSync(this.configPath, "{}");
        this.data = {};
    }

    private getStore() {
        if (this.data) return this.data;
        let str = "{}";
        try {
            str = fs.readFileSync(this.configPath).toString() || "{}";
        } catch (error) {
            this.init();
        }
        return safeJSONParse<data>(str, {});
    }

    private setStore(data: data) {
        this.data = data;
        // 防抖合并写盘：窗口尺寸/位置这类高频设置不再每次都同步重写整份 config；
        // 内存里的 data 立即生效，磁盘 500ms 内跟上，进程退出时强制落盘
        if (this.writeTimer) clearTimeout(this.writeTimer);
        this.writeTimer = setTimeout(() => this.flush(), 500);
        this.writeTimer.unref?.();
    }

    /** 立即把当前配置写盘，防抖窗口内的多次 set 合并成一次 */
    flush() {
        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
            this.writeTimer = null;
        }
        if (this.data === undefined) return;
        try {
            fs.writeFileSync(
                this.configPath,
                JSON.stringify(this.data, null, 2),
            );
        } catch (e) {
            console.error("配置写盘失败", e);
        }
    }

    path() {
        return this.configPath;
    }

    set<P extends SettingPath>(
        keyPath: P,
        value: GetValue<setting, P> | (unknown & {}),
    ): void {
        const store = this.getStore();
        xset(store, keyPath, value);
        this.setStore(store);
    }
    get<P extends SettingPath>(keyPath: P): GetValue<setting, P> {
        const store = this.getStore();
        const value = xget(store, keyPath);
        if (value !== undefined) return value;
        return xget(this.defaultData as Record<string, unknown>, keyPath);
    }

    remove(keyPath: string) {
        const store = this.getStore();
        const pathx = keyPath.split(".");
        const last = pathx.pop() ?? "";
        let obj = store;
        for (const p of pathx) {
            if (obj[p]?.constructor !== Object) return;
            obj = obj[p] as data;
        }
        if (!(last in obj)) return;
        delete obj[last];
        this.setStore(store);
    }

    removeArrayValue(keyPath: string, value: string) {
        const store = this.getStore();
        const pathx = keyPath.split(".");
        const last = pathx.pop() ?? "";
        let obj = store;
        for (const p of pathx) {
            if (obj[p]?.constructor !== Object) return;
            obj = obj[p] as data;
        }
        const arr = obj[last];
        if (!Array.isArray(arr) || !arr.includes(value)) return;
        obj[last] = arr.filter((x) => x !== value);
        this.setStore(store);
    }

    clear() {
        this.init();
    }

    getAll() {
        const store = this.getStore();
        return deepMerge(store, this.defaultData);
    }
    setAll(data: data) {
        this.setStore(data);
    }
}

export default Store;
