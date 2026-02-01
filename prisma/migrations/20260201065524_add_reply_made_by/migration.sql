-- CreateEnum
CREATE TYPE "ReplyMadeBy" AS ENUM ('AI', 'HUMAN_AI');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "reply_made_by" "ReplyMadeBy";
