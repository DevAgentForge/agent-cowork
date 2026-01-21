import { isDev } from "./util.js"
import path from "path"
import { app } from "electron"

export function getPreloadPath() {
    return path.join(
        app.getAppPath(),
        isDev() ? './' : '../',
        '/dist-electron/preload.cjs'
    )
}

export function getUIPath() {
    return path.join(app.getAppPath(), '/dist-react/index.html');
}

export function getIconPath() {
    // 开发环境直接使用项目根目录，打包环境使用 resources 目录
    if (isDev()) {
        // 开发环境：从项目根目录获取
        return path.join(process.cwd(), 'templateIcon.ico');
    }
    // 打包环境：图标文件在 resources 目录
    return path.join(process.resourcesPath, 'templateIcon.ico');
}