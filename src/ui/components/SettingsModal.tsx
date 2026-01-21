import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "../config/constants";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string; responseTime?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 加载当前配置
    setLoading(true);
    window.electron.getApiConfig()
      .then((config) => {
        if (config) {
          setApiKey(config.apiKey);
          setBaseURL(config.baseURL);
          setModel(config.model);
        }
      })
      .catch((err) => {
        console.error("Failed to load API config:", err);
        setError(t("errors.failedToLoadConfig"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  const handleSave = async () => {
    // 验证输入
    if (!apiKey.trim()) {
      setError(t("errors.apiKeyRequired"));
      return;
    }
    if (!baseURL.trim()) {
      setError(t("errors.baseUrlRequired"));
      return;
    }
    if (!model.trim()) {
      setError(t("errors.modelRequired"));
      return;
    }

    // 验证 URL 格式
    try {
      new URL(baseURL);
    } catch {
      setError(t("errors.invalidBaseUrl"));
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const result = await window.electron.saveApiConfig({
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim(),
        model: model.trim(),
        apiType: "anthropic"
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1000);
      } else {
        setError(result.error || t("errors.failedToSaveConfig"));
      }
    } catch (err) {
      console.error("Failed to save API config:", err);
      setError(t("errors.failedToSaveConfig"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // 验证输入
    if (!apiKey.trim()) {
      setError(t("errors.apiKeyRequired"));
      return;
    }
    if (!baseURL.trim()) {
      setError(t("errors.baseUrlRequired"));
      return;
    }
    if (!model.trim()) {
      setError(t("errors.modelRequired"));
      return;
    }

    // 验证 URL 格式
    try {
      new URL(baseURL);
    } catch {
      setError(t("errors.invalidBaseUrl"));
      return;
    }

    setError(null);
    setTestResult(null);
    setTesting(true);

    try {
      const result = await window.electron.testApiConnection({
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim(),
        model: model.trim()
      });
      setTestResult(result);
    } catch (err) {
      console.error("Failed to test API connection:", err);
      setTestResult({
        success: false,
        message: "测试失败",
        details: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/5 bg-surface p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-ink-800">{t("settings.title")}</span>
            <a
              href={APP_CONFIG.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-6 h-6 rounded-full bg-surface-secondary border border-ink-900/10 text-muted hover:text-accent hover:border-accent/50 transition-colors"
              aria-label="帮助"
              title="点击查看 API 配置帮助"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5c0 1.5-2.5 2-2.5 4" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                点击查看 API 配置帮助
              </span>
            </a>
          </div>
          <button
            className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{t("settings.description")}</p>

        {loading ? (
          <div className="mt-5 flex items-center justify-center py-8">
            <svg aria-hidden="true" className="w-6 h-6 animate-spin text-accent" viewBox="0 0 100 101" fill="none">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" opacity="0.3" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
            </svg>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted">{t("settings.baseUrl")}</span>
              <input
                type="url"
                className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="htts://..."
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted">{t("settings.apiKey")}</span>
              <input
                type="password"
                className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">{t("settings.modelName")}</span>
                <button
                  className="text-xs text-accent hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  onClick={handleTestConnection}
                  disabled={testing || !apiKey.trim() || !baseURL.trim() || !model.trim()}
                >
                  {testing ? (
                    <>
                      <svg aria-hidden="true" className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      测试中
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      测试连接
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="claude-3-5-sonnet-20241022"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setTestResult(null);
                }}
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-error/20 bg-error-light px-4 py-2.5 text-sm text-error">
                {error}
              </div>
            )}

            {testResult && (
              <div className={`rounded-xl border px-4 py-2.5 text-sm ${
                testResult.success
                  ? 'border-success/20 bg-success-light text-success'
                  : 'border-error/20 bg-error-light text-error'
              }`}>
                <div className="font-medium">{testResult.message}</div>
                {testResult.details && (
                  <div className="mt-1 text-xs opacity-80">{testResult.details}</div>
                )}
                {testResult.responseTime && (
                  <div className="mt-1 text-xs opacity-60">响应时间: {testResult.responseTime}ms</div>
                )}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-success/20 bg-success-light px-4 py-2.5 text-sm text-success">
                {t("settings.saved")}
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary transition-colors"
                onClick={onClose}
                disabled={saving}
              >
                {t("settings.cancel")}
              </button>
              <button
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSave}
                disabled={saving || !apiKey.trim() || !baseURL.trim() || !model.trim()}
              >
                {saving ? (
                  <svg aria-hidden="true" className="mx-auto w-5 h-5 animate-spin" viewBox="0 0 100 101" fill="none">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" opacity="0.3" />
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="white" />
                  </svg>
                ) : t("settings.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
