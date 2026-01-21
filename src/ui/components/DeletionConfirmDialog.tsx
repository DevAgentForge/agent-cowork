import { useTranslation } from "react-i18next";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionRequest } from "../store/useAppStore";

interface DeletionConfirmDialogProps {
  request: PermissionRequest;
  onSubmit: (result: PermissionResult) => void;
}

export function DeletionConfirmDialog({ request, onSubmit }: DeletionConfirmDialogProps) {
  const { t } = useTranslation();

  const input = request.input as Record<string, unknown> | null;
  const command = input?.command as string || t("deletion.unknownCommand");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border-2 border-error/30 bg-surface shadow-2xl animate-scale-in">
        {/* 警告头部 */}
        <div className="flex items-center gap-3 border-b border-error/20 bg-error-light/30 px-6 py-4 rounded-t-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/20">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-error" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-error">{t("deletion.title")}</h3>
            <p className="text-xs text-error/80">{t("deletion.subtitle")}</p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-5">
          <p className="text-sm text-ink-700">{t("deletion.description")}</p>

          {/* 命令显示 */}
          <div className="mt-4 rounded-xl bg-error-light/30 border border-error/20 p-4">
            <div className="text-xs font-medium text-error mb-2">{t("deletion.commandLabel")}</div>
            <pre className="text-sm text-ink-800 font-mono whitespace-pre-wrap break-words bg-surface rounded-lg p-3">
              {command}
            </pre>
          </div>

          {/* 警告提示 */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning-light/20 border border-warning/30 p-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 text-warning" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-warning-dark">{t("deletion.warning")}</p>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex items-center justify-end gap-3 border-t border-ink-900/10 bg-surface-secondary px-6 py-4 rounded-b-2xl">
          <button
            className="rounded-full border-2 border-error/30 bg-error-light px-6 py-2.5 text-sm font-semibold text-error hover:bg-error hover:text-white hover:border-error transition-all shadow-soft"
            onClick={() => onSubmit({ behavior: "deny", message: t("deletion.deniedMessage") })}
          >
            {t("deletion.deny")}
          </button>
          <button
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-accent-hover transition-all"
            onClick={() => onSubmit({ behavior: "allow", updatedInput: input as Record<string, unknown> })}
          >
            {t("deletion.allow")}
          </button>
        </div>
      </div>
    </div>
  );
}
