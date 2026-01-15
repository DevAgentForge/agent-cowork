import osUtils from "os-utils";
import fs from "fs"
import os from "os"
import { BrowserWindow } from "electron";
import { ipcWebContentsSend } from "./util.js";

const POLLING_INTERVAL = 2000;

export function pollResources(mainWindow: BrowserWindow): ReturnType<typeof setInterval> {
    const intervalId = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(intervalId);
            return;
        }
        const cpuUsage = await getCPUUsage();
        const storageData = getStorageData();
        const ramUsage = getRamUsage();

        ipcWebContentsSend("statistics", mainWindow.webContents, { cpuUsage, ramUsage, storageData: storageData.usage });
    }, POLLING_INTERVAL);
    return intervalId;
}

export function cleanupPolling(intervalId: ReturnType<typeof setInterval> | null): void {
    if (intervalId) {
        clearInterval(intervalId);
    }
}

export function getStaticData() {
    const totalStorage = getStorageData().total;
    const cpuModel = os.cpus()[0].model;
    const totalMemoryGB = Math.floor(osUtils.totalmem() / 1024);

    return {
        totalStorage,
        cpuModel,
        totalMemoryGB
    }
}

function getCPUUsage(): Promise<number> {
    return new Promise(resolve => {
        osUtils.cpuUsage(resolve);
    })
}

function getRamUsage() {
    return 1 - osUtils.freememPercentage();
}

function getStorageData() {
    const stats = fs.statfsSync(process.platform === 'win32' ? 'C://' : '/');
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bfree;

    return {
        total: Math.floor(total / 1_000_000_000),
        usage: 1 - free / total
    }
}


