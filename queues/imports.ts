import { defineQueue } from "void";
import { logger } from "void/log";
import { failImport, runImport, type ImportMessage } from "@/services/import";
import { summarizeCause } from "@/domain/hydration";

// Void requires this setting to be a numeric literal at build time.
export const maxRetries = 3;

export default defineQueue<ImportMessage>(async (batch) => {
  for (const msg of batch.messages) {
    try {
      await runImport(msg.body.importId);
      msg.ack();
    } catch (cause) {
      logger.warn("import job failed", { body: msg.body, attempt: msg.attempts, cause });
      if (msg.attempts >= maxRetries) {
        await failImport(msg.body.importId, summarizeCause(cause));
        msg.ack();
      } else {
        msg.retry({ delaySeconds: 30 });
      }
    }
  }
});
