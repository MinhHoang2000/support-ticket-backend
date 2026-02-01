-- GIN index for full-text search on ticket title (used by to_tsvector/plainto_tsquery)
CREATE INDEX "tickets_title_fts_idx" ON "tickets" USING GIN (to_tsvector('english', title));
