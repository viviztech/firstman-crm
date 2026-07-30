import { db } from "@/db";
import {
  type messageChannelEnum,
  messageLogs,
  type messageStatusEnum,
} from "@/db/schema/message-logs";

type MessageChannel = (typeof messageChannelEnum.enumValues)[number];
type MessageStatus = (typeof messageStatusEnum.enumValues)[number];

type MessageLogInput = {
  channel: MessageChannel;
  to: string;
  template?: string;
  payload?: unknown;
  status: MessageStatus;
  error?: string;
  entityType?: string;
  entityId?: string;
};

/** Appends one send-attempt row. Called from every notification job, including the log-driver path (spec 4.8). */
export async function recordMessageLog(input: MessageLogInput): Promise<void> {
  await db.insert(messageLogs).values({
    channel: input.channel,
    to: input.to,
    template: input.template,
    payload: input.payload,
    status: input.status,
    error: input.error,
    entityType: input.entityType,
    entityId: input.entityId,
  });
}
