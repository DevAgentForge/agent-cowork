import winston from 'winston';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// 全局日志目录（用于应用级别的日志）
function getGlobalLogDir(): string {
    return path.join(app.getPath('userData'), 'logs');
}

// 自定义日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
        }
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

// 全局 Logger 实例（用于应用级别日志）
let globalLoggerInstance: winston.Logger | null = null;

// 获取或创建全局 logger 实例
function getGlobalLogger(): winston.Logger {
    if (!globalLoggerInstance) {
        const logDir = getGlobalLogDir();
        // 确保日志目录存在
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        globalLoggerInstance = winston.createLogger({
            level: 'info',
            format: logFormat,
            transports: [
                // 控制台输出（开发环境）
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        logFormat
                    )
                }),
                // 所有日志文件
                new winston.transports.File({
                    filename: path.join(logDir, 'app.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                // 错误日志文件
                new winston.transports.File({
                    filename: path.join(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ]
        });

        // 开发环境使用 debug 级别
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
            globalLoggerInstance.level = 'debug';
        }
    }
    return globalLoggerInstance;
}

// 会话日志缓存（按会话 ID 缓存 logger 实例）
const sessionLoggers = new Map<string, winston.Logger>();

/**
 * 获取会话级别的 logger
 * @param sessionId 会话 ID
 * @param cwd 工作目录（任务文件夹路径）
 * @returns Winston Logger 实例
 */
function getSessionLogger(sessionId: string, cwd?: string): winston.Logger {
    // 如果已有缓存的 logger，直接返回
    if (sessionLoggers.has(sessionId)) {
        return sessionLoggers.get(sessionId)!;
    }

    // 如果没有 cwd，使用全局 logger
    if (!cwd) {
        return getGlobalLogger();
    }

    // 创建会话日志目录（在任务文件夹内）
    const sessionLogDir = path.join(cwd, '.agent-cowork', 'logs');

    // 确保日志目录存在
    if (!fs.existsSync(sessionLogDir)) {
        try {
            fs.mkdirSync(sessionLogDir, { recursive: true });
        } catch (error) {
            // 如果无法创建目录，回退到全局 logger
            getGlobalLogger().warn(`Failed to create session log directory: ${sessionLogDir}`, error);
            return getGlobalLogger();
        }
    }

    // 创建会话专用的 logger
    const sessionLogger = winston.createLogger({
        level: 'info',
        format: logFormat,
        transports: [
            // 控制台输出（开发环境）
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                )
            }),
            // 会话综合日志
            new winston.transports.File({
                filename: path.join(sessionLogDir, 'session.log'),
                maxsize: 5242880, // 5MB
                maxFiles: 10
            }),
            // 会话错误日志
            new winston.transports.File({
                filename: path.join(sessionLogDir, 'error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            })
        ]
    });

    // 开发环境使用 debug 级别
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        sessionLogger.level = 'debug';
    }

    // 缓存 logger
    sessionLoggers.set(sessionId, sessionLogger);

    // 记录会话日志创建
    sessionLogger.info(`Session logger initialized for session: ${sessionId}`);
    sessionLogger.info(`Log directory: ${sessionLogDir}`);

    return sessionLogger;
}

/**
 * 清理会话 logger
 * @param sessionId 会话 ID
 */
function clearSessionLogger(sessionId: string): void {
    const logger = sessionLoggers.get(sessionId);
    if (logger) {
        logger.info('Session logger closing');
        logger.close();
        sessionLoggers.delete(sessionId);
    }
}

// 导出便捷方法
export const log = {
    info: (message: string, meta?: any) => getGlobalLogger().info(message, meta),
    error: (message: string, error?: Error | any) => {
        const logger = getGlobalLogger();
        if (error instanceof Error) {
            logger.error(message, { error: error.message, stack: error.stack });
        } else {
            logger.error(message, error);
        }
    },
    warn: (message: string, meta?: any) => getGlobalLogger().warn(message, meta),
    debug: (message: string, meta?: any) => getGlobalLogger().debug(message, meta),
    // 记录 IPC 事件
    ipc: (event: string, data?: any) => {
        getGlobalLogger().debug(`[IPC] ${event}`, data ? JSON.stringify(data, null, 2) : '');
    },
    // 记录会话事件（使用全局 logger）
    session: (sessionId: string, event: string, data?: any) => {
        getGlobalLogger().info(`[Session:${sessionId}] ${event}`, data);
    },
    // 记录会话事件（指定 cwd，使用会话 logger）
    sessionCwd: (sessionId: string, cwd: string, event: string, data?: any) => {
        getSessionLogger(sessionId, cwd).info(`[${event}]`, data);
    },
    // 记录性能指标
    performance: (operation: string, duration: number) => {
        getGlobalLogger().debug(`[Performance] ${operation} took ${duration}ms`);
    }
};

// 应用启动时记录
export function logStartup(): void {
    const logger = getGlobalLogger();
    const logDir = getGlobalLogDir();
    logger.info('='.repeat(50));
    logger.info('Application Starting');
    logger.info(`Version: ${app.getVersion()}`);
    logger.info(`Platform: ${process.platform} ${process.arch}`);
    logger.info(`Electron: ${process.versions.electron}`);
    logger.info(`Node: ${process.versions.node}`);
    logger.info(`User Data: ${app.getPath('userData')}`);
    logger.info(`Global Log Directory: ${logDir}`);
    logger.info('='.repeat(50));
}

// 应用关闭时记录
export function logShutdown(): void {
    const logger = getGlobalLogger();
    logger.info('='.repeat(50));
    logger.info('Application Shutting Down');
    logger.info('='.repeat(50));

    // 关闭所有会话 logger
    sessionLoggers.forEach((logger, sessionId) => {
        logger.info(`Closing session logger for: ${sessionId}`);
        logger.close();
    });
    sessionLoggers.clear();
}

// 记录未捕获的异常
export function setupErrorHandling(): void {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
        getGlobalLogger().error('Uncaught Exception', error);
        // 给系统一点时间记录日志
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

    // 未处理的 Promise rejection
    process.on('unhandledRejection', (reason, promise) => {
        getGlobalLogger().error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}

// 导出会话 logger 相关函数
export { getSessionLogger, clearSessionLogger };

// 导出默认 logger（延迟初始化）
export default getGlobalLogger;
