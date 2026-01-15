import { BrowserWindow, screen, type WebContents } from "electron";
import { getPreloadPath, getUIPath, getIconPath } from "./pathResolver.js";
import { isDev, DEV_PORT } from "./util.js";

export class WindowManager {
    private static instance: WindowManager | null = null;
    private mainWindow: BrowserWindow | null = null;

    static getInstance(): WindowManager {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }

    private createWindow(): BrowserWindow {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        const win = new BrowserWindow({
            width: Math.min(1200, width * 0.85),
            height: Math.min(800, height * 0.85),
            minWidth: 900,
            minHeight: 600,
            webPreferences: {
                preload: getPreloadPath(),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            },
            icon: getIconPath(),
            titleBarStyle: "hiddenInset",
            backgroundColor: "#FAF9F6",
            trafficLightPosition: { x: 15, y: 18 },
            show: false
        });

        return win;
    }

    async initialize(): Promise<void> {
        this.mainWindow = this.createWindow();

        if (isDev()) {
            await this.mainWindow.loadURL(`http://localhost:${DEV_PORT}`);
        } else {
            await this.mainWindow.loadFile(getUIPath());
        }

        this.mainWindow.once("ready-to-show", () => {
            this.mainWindow?.show();
            this.mainWindow?.focus();
        });

        this.mainWindow.on("closed", () => {
            this.mainWindow = null;
        });
    }

    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    getWebContents(): WebContents | null {
        return this.mainWindow?.webContents ?? null;
    }

    focus(): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.focus();
            this.mainWindow.show();
        }
    }

    isDestroyed(): boolean {
        return !this.mainWindow || this.mainWindow.isDestroyed();
    }
}
