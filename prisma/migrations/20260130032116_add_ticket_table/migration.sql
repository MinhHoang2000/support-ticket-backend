-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT,
    "sentiment" INTEGER,
    "urgency" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);
