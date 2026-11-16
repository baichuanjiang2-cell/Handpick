import { exec, execSync } from "node:child_process";
import { renameSync, rmSync } from "node:fs";

const appPath =
    process.platform === "linux"
        ? `${process.env.HOME}/.config/HandPick`
        : process.platform === "win32"
          ? `${process.env.APPDATA}/HandPick`
          : process.platform === "darwin"
            ? `${process.env.HOME}/Library/Application Support/HandPick`
            : "";
const configPath = `${appPath}/config.json`;
const backupPath = `${appPath}/config.json.bak`;

function runApp() {
    return exec("pnpm run start");
}

function initConfig() {
    renameSync(configPath, backupPath);
}

function restoreConfig() {
    try {
        rmSync(configPath);
    } catch (error) {}
    renameSync(backupPath, configPath);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export { runApp, initConfig, restoreConfig, sleep };
