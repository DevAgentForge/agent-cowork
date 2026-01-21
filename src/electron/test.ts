import osUtils from "os-utils";
import fs from "fs"
import os from "os"
import { BrowserWindow } from "electron";
import { ipcWebContentsSend } from "./util.js";
import { log } from "./logger.js";

// 优化：增加轮询间隔到 2 秒，减少 CPU 消耗
const POLLING_INTERVAL = 2000;

let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
let isWindowVisible = true;

export function pollResources(mainWindow: BrowserWindow): void {
    log.info(`Starting resource polling (interval: ${POLLING_INTERVAL}ms)`);

    // 监听窗口可见性变化
    mainWindow.on('blur', () => {
        isWindowVisible = false;
        log.debug('Window lost focus, polling continues but less critical');
    });

    mainWindow.on('focus', () => {
        isWindowVisible = true;
        log.debug('Window gained focus');
    });

    pollingIntervalId = setInterval(async () => {
        if (mainWindow.isDestroyed()) {
            log.info('Window destroyed, stopping polling');
            stopPolling();
            return;
        }

        try {
            const startTime = Date.now();
            const cpuUsage = await getCPUUsage();
            const storageData = getStorageData();
            const ramUsage = getRamUsage();
            const duration = Date.now() - startTime;

            // 性能日志
            if (duration > 100) {
                log.warn(`Resource polling took ${duration}ms, considered slow`);
            }

            if (mainWindow.isDestroyed()) {
                stopPolling();
                return;
            }

            ipcWebContentsSend("statistics", mainWindow.webContents, { cpuUsage, ramUsage, storageData: storageData.usage });
        } catch (error) {
            log.error('Error during resource polling', error);
        }
    }, POLLING_INTERVAL);

    log.info('Resource polling started');
}

export function stopPolling(): void {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
        log.info('Resource polling stopped');
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


