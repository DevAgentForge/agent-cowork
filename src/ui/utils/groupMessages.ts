import type { StreamMessage } from "../types";
import type { IndexedMessage } from "../hooks/useMessageWindow";

export type MessageRole = "user" | "assistant" | "system" | "result";

/**
 * Determines the role of a message for grouping purposes
 */
export function getMessageRole(message: StreamMessage): MessageRole {
  if (message.type === "user_prompt") {
    return "user";
  }
  if (message.type === "system") {
    return "system";
  }
  if (message.type === "result") {
    return "result";
  }
  if (message.type === "assistant") {
    return "assistant";
  }
  if (message.type === "user") {
    // SDK user messages contain tool results, group with assistant
    return "assistant";
  }
  // Default for unknown types
  return "assistant";
}

export interface MessageGroup {
  role: MessageRole;
  messages: IndexedMessage[];
}

/**
 * Groups consecutive messages by role
 */
export function groupConsecutiveMessages(messages: IndexedMessage[]): MessageGroup[] {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of messages) {
    const role = getMessageRole(item.message);

    if (!currentGroup || currentGroup.role !== role) {
      // Start a new group
      currentGroup = { role, messages: [item] };
      groups.push(currentGroup);
    } else {
      // Add to existing group
      currentGroup.messages.push(item);
    }
  }

  return groups;
}

/**
 * Filters out system and result messages (they're shown in the sidebar info modal)
 */
export function filterSessionMessages(messages: IndexedMessage[]): IndexedMessage[] {
  return messages.filter((item) => {
    const type = item.message.type;
    return type !== "system" && type !== "result" && type !== "stream_event";
  });
}
