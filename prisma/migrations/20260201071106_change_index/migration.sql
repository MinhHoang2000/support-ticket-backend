-- DropIndex
DROP INDEX "tickets_category_createdAt_idx";

-- DropIndex
DROP INDEX "tickets_category_title_idx";

-- DropIndex
DROP INDEX "tickets_sentiment_createdAt_idx";

-- DropIndex
DROP INDEX "tickets_sentiment_title_idx";

-- DropIndex
DROP INDEX "tickets_status_createdAt_idx";

-- DropIndex
DROP INDEX "tickets_status_title_idx";

-- DropIndex
DROP INDEX "tickets_urgency_createdAt_idx";

-- DropIndex
DROP INDEX "tickets_urgency_title_idx";

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_category_idx" ON "tickets"("category");

-- CreateIndex
CREATE INDEX "tickets_sentiment_idx" ON "tickets"("sentiment");

-- CreateIndex
CREATE INDEX "tickets_urgency_idx" ON "tickets"("urgency");
