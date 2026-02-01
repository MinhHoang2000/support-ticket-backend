-- CreateEnum
CREATE TYPE "WorkerProcessStatus" AS ENUM ('INFO', 'ERROR', 'FAILED');

-- CreateTable
CREATE TABLE "worker_processes" (
    "id" SERIAL NOT NULL,
    "worker_id" TEXT NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_response" TEXT,
    "status" "WorkerProcessStatus" NOT NULL,
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_processes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "worker_processes" ADD CONSTRAINT "worker_processes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
