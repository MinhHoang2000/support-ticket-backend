-- AlterEnum
ALTER TYPE "WorkerProcessStatus" ADD VALUE 'INVALID_RESPONSE';

-- AlterTable: rename ai_response to ai_reply_message and add raw_ai_response
ALTER TABLE "worker_processes" RENAME COLUMN "ai_response" TO "ai_reply_message";
ALTER TABLE "worker_processes" ADD COLUMN "raw_ai_response" TEXT;
