export default {
	// Language
	language: {
		en: "English",
		zh: "中文",
	},

	// Sidebar
	sidebar: {
		newTask: "+ 新建任务",
		settings: "设置",
		noSessions: "暂无会话。点击 \"+ 新建任务\" 开始。",
		deleteSession: "删除此会话",
		resumeInClaudeCode: "在 Claude Code 中恢复",
		resume: "恢复",
		close: "关闭",
		copyResumeCommand: "复制恢复命令",
		workingDirUnavailable: "工作目录不可用",
	},

	// Settings Modal
	settings: {
		title: "API 配置",
		description: "支持 Anthropic 官方 API 以及兼容 Anthropic 格式的第三方 API。",
		baseUrl: "基础 URL",
		apiKey: "API 密钥",
		modelName: "模型名称",
		cancel: "取消",
		save: "保存",
		saving: "保存中...",
		saved: "配置保存成功！",
	},

	// Validation errors
	errors: {
		apiKeyRequired: "API 密钥是必填项",
		baseUrlRequired: "基础 URL 是必填项",
		modelRequired: "模型名称是必填项",
		invalidBaseUrl: "无效的基础 URL 格式",
		failedToLoadConfig: "加载配置失败",
		failedToSaveConfig: "保存配置失败",
		sessionStillRunning: "会话仍在运行中。请等待其完成。",
		workingDirectoryRequired: "启动会话需要工作目录。",
		failedToGetSessionTitle: "获取会话标题失败。",
	},

	// Start Session Modal
	startSession: {
		title: "启动会话",
		description: "创建新会话以开始与代理交互。",
		workingDirectory: "工作目录",
		browse: "浏览...",
		recent: "最近使用",
		prompt: "提示词",
		promptPlaceholder: "描述您希望代理处理的任务...",
		startButton: "启动会话",
		starting: "启动中...",
	},

	// Prompt Input
	promptInput: {
		placeholderDisabled: "创建/选择任务以开始...",
		placeholder: "描述您希望代理处理的内容...",
		stopSession: "停止会话",
		sendPrompt: "发送提示词",
	},

	// Common
	common: {
		close: "关闭",
		cancel: "取消",
		save: "保存",
		delete: "删除",
		loading: "加载中...",
	},

	// App
	app: {
		noMessagesYet: "暂无消息",
		startConversation: "开始与 Agent Cowork 对话",
		beginningOfConversation: "对话开始",
		loadingMessages: "加载中...",
		newMessages: "新消息",
	},

	// Deletion Confirmation
	deletion: {
		title: "⚠️ 删除操作确认",
		subtitle: "AI 即将执行删除操作",
		description: "AI 正在尝试执行删除操作。此操作可能会永久删除文件或目录，请仔细确认命令内容。",
		commandLabel: "将要执行的命令：",
		unknownCommand: "未知命令",
		warning: "警告：删除操作无法撤销，请确保您了解此命令的后果。",
		allow: "允许执行",
		deny: "拒绝操作",
		deniedMessage: "用户拒绝了删除操作",
	},
};
