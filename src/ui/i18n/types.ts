export interface TranslationResources {
  language: {
    en: string;
    zh: string;
  };
  sidebar: {
    newTask: string;
    settings: string;
    noSessions: string;
    deleteSession: string;
    resumeInClaudeCode: string;
    resume: string;
    close: string;
    copyResumeCommand: string;
    workingDirUnavailable: string;
  };
  settings: {
    title: string;
    description: string;
    baseUrl: string;
    apiKey: string;
    modelName: string;
    cancel: string;
    save: string;
    saving: string;
    saved: string;
  };
  errors: {
    apiKeyRequired: string;
    baseUrlRequired: string;
    modelRequired: string;
    invalidBaseUrl: string;
    failedToLoadConfig: string;
    failedToSaveConfig: string;
    sessionStillRunning: string;
    workingDirectoryRequired: string;
    failedToGetSessionTitle: string;
  };
  startSession: {
    title: string;
    description: string;
    workingDirectory: string;
    browse: string;
    recent: string;
    prompt: string;
    promptPlaceholder: string;
    startButton: string;
    starting: string;
  };
  promptInput: {
    placeholderDisabled: string;
    placeholder: string;
    stopSession: string;
    sendPrompt: string;
  };
  common: {
    close: string;
    cancel: string;
    save: string;
    delete: string;
    loading: string;
  };
  app: {
    noMessagesYet: string;
    startConversation: string;
    beginningOfConversation: string;
    loadingMessages: string;
    newMessages: string;
  };
}

// 扩展 i18next 模块以包含自定义类型
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: TranslationResources;
  }
}
