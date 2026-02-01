-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "tickets_title_idx" ON "tickets"("title");

-- CreateIndex
CREATE INDEX "tickets_status_createdAt_idx" ON "tickets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_status_title_idx" ON "tickets"("status", "title");

-- CreateIndex
CREATE INDEX "tickets_category_createdAt_idx" ON "tickets"("category", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_category_title_idx" ON "tickets"("category", "title");

-- CreateIndex
CREATE INDEX "tickets_sentiment_createdAt_idx" ON "tickets"("sentiment", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_sentiment_title_idx" ON "tickets"("sentiment", "title");

-- CreateIndex
CREATE INDEX "tickets_urgency_createdAt_idx" ON "tickets"("urgency", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_urgency_title_idx" ON "tickets"("urgency", "title");
