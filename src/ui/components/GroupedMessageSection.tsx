import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { MessageGroup } from "../utils/groupMessages";
import type { PermissionRequest } from "../store/useAppStore";
import { MessageCard } from "./EventCard";

interface GroupedMessageSectionProps {
  group: MessageGroup;
  isLastGroup: boolean;
  isRunning: boolean;
  permissionRequest?: PermissionRequest;
  onPermissionResult?: (toolUseId: string, result: PermissionResult) => void;
  sessionId: string | null;
}

const roleLabels: Record<string, string> = {
  user: "User",
  assistant: "Assistant",
  system: "System",
  result: "Result",
};

export function GroupedMessageSection({
  group,
  isLastGroup,
  isRunning,
  permissionRequest,
  onPermissionResult,
  sessionId,
}: GroupedMessageSectionProps) {
  const { role, messages } = group;
  const label = roleLabels[role] || role;

  return (
    <div className="grouped-message-section">
      {/* Group header */}
      <div className="header text-accent mt-4">{label}</div>

      {/* Render all messages in the group without individual headers */}
      {messages.map((item, idx) => {
        const isLastMessage = isLastGroup && idx === messages.length - 1;
        return (
          <MessageCard
            key={`${sessionId}-msg-${item.originalIndex}`}
            message={item.message}
            isLast={isLastMessage}
            isRunning={isRunning}
            permissionRequest={permissionRequest}
            onPermissionResult={onPermissionResult}
            showHeader={false}
          />
        );
      })}
    </div>
  );
}
