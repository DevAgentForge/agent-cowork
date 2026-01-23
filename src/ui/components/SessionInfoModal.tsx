import * as Dialog from "@radix-ui/react-dialog";
import type { SessionMetadata } from "../store/useAppStore";

interface SessionInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata?: SessionMetadata;
  sessionTitle?: string;
}

const formatMinutes = (ms: number | undefined) =>
  typeof ms !== "number" ? "-" : `${(ms / 60000).toFixed(2)} min`;

const formatUsd = (usd: number | undefined) =>
  typeof usd !== "number" ? "-" : `$${usd.toFixed(4)}`;

const formatTokens = (tokens: number | undefined) =>
  typeof tokens !== "number" ? "-" : tokens.toLocaleString();

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-ink-900/5 last:border-0">
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-medium text-ink-700">{value}</span>
  </div>
);

export function SessionInfoModal({ open, onOpenChange, metadata, sessionTitle }: SessionInfoModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-4">
            <Dialog.Title className="text-lg font-semibold text-ink-800">
              Session Info
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10" aria-label="Close dialog">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {sessionTitle && (
            <div className="mb-4 pb-4 border-b border-ink-900/10">
              <span className="text-xs text-muted uppercase tracking-wide">Session</span>
              <p className="mt-1 text-sm font-medium text-ink-800">{sessionTitle}</p>
            </div>
          )}

          <div className="space-y-1">
            <div className="mb-3">
              <span className="text-xs text-muted uppercase tracking-wide">Configuration</span>
            </div>
            <div className="rounded-xl border border-ink-900/10 bg-surface px-4">
              <InfoRow label="Session ID" value={metadata?.sessionId?.slice(0, 12) + "..." || "-"} />
              <InfoRow label="Model" value={metadata?.model || "-"} />
              <InfoRow label="Permission Mode" value={metadata?.permissionMode || "-"} />
              <InfoRow label="Working Directory" value={metadata?.workingDirectory || "-"} />
            </div>
          </div>

          <div className="space-y-1 mt-4">
            <div className="mb-3">
              <span className="text-xs text-muted uppercase tracking-wide">Usage Statistics</span>
            </div>
            <div className="rounded-xl border border-ink-900/10 bg-surface px-4">
              <InfoRow label="Duration" value={formatMinutes(metadata?.durationMs)} />
              <InfoRow label="API Duration" value={formatMinutes(metadata?.durationApiMs)} />
              <InfoRow label="Total Cost" value={formatUsd(metadata?.totalCostUsd)} />
              <InfoRow label="Input Tokens" value={formatTokens(metadata?.inputTokens)} />
              <InfoRow label="Output Tokens" value={formatTokens(metadata?.outputTokens)} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
