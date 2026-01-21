export default {
	// Language
	language: {
		en: "English",
		zh: "中文",
	},

	// Sidebar
	sidebar: {
		newTask: "+ New Task",
		settings: "Settings",
		noSessions: "No sessions yet. Click \"+ New Task\" to start.",
		deleteSession: "Delete this session",
		resumeInClaudeCode: "Resume in Claude Code",
		resume: "Resume",
		close: "Close",
		copyResumeCommand: "Copy resume command",
		workingDirUnavailable: "Working dir unavailable",
	},

	// Settings Modal
	settings: {
		title: "API Configuration",
		description: "Supports Anthropic's official API as well as third-party APIs compatible with the Anthropic format.",
		baseUrl: "Base URL",
		apiKey: "API Key",
		modelName: "Model Name",
		cancel: "Cancel",
		save: "Save",
		saving: "Saving...",
		saved: "Configuration saved successfully!",
	},

	// Validation errors
	errors: {
		apiKeyRequired: "API Key is required",
		baseUrlRequired: "Base URL is required",
		modelRequired: "Model is required",
		invalidBaseUrl: "Invalid Base URL format",
		failedToLoadConfig: "Failed to load configuration",
		failedToSaveConfig: "Failed to save configuration",
		sessionStillRunning: "Session is still running. Please wait for it to finish.",
		workingDirectoryRequired: "Working Directory is required to start a session.",
		failedToGetSessionTitle: "Failed to get session title.",
	},

	// Start Session Modal
	startSession: {
		title: "Start Session",
		description: "Create a new session to start interacting with agent.",
		workingDirectory: "Working Directory",
		browse: "Browse...",
		recent: "Recent",
		prompt: "Prompt",
		promptPlaceholder: "Describe the task you want agent to handle...",
		startButton: "Start Session",
		starting: "Starting...",
	},

	// Prompt Input
	promptInput: {
		placeholderDisabled: "Create/select a task to start...",
		placeholder: "Describe what you want agent to handle...",
		stopSession: "Stop session",
		sendPrompt: "Send prompt",
	},

	// Common
	common: {
		close: "Close",
		cancel: "Cancel",
		save: "Save",
		delete: "Delete",
		loading: "Loading...",
	},

	// App
	app: {
		noMessagesYet: "No messages yet",
		startConversation: "Start a conversation with agent cowork",
		beginningOfConversation: "Beginning of conversation",
		loadingMessages: "Loading...",
		newMessages: "New messages",
	},

	// Deletion Confirmation
	deletion: {
		title: "⚠️ Deletion Confirmation",
		subtitle: "AI is about to perform a deletion operation",
		description: "AI is attempting to execute a deletion operation. This operation may permanently delete files or directories. Please carefully verify the command content.",
		commandLabel: "Command to be executed:",
		unknownCommand: "Unknown command",
		warning: "Warning: Deletion operations cannot be undone. Make sure you understand the consequences of this command.",
		allow: "Allow Execution",
		deny: "Deny Operation",
		deniedMessage: "User denied the deletion operation",
	},
};
