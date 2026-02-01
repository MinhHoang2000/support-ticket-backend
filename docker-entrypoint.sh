#!/bin/sh
set -e

echo "Waiting for database..."
retries=10
while ! npx prisma migrate deploy; do
  retries=$((retries - 1))
  if [ "$retries" -le 0 ]; then
    echo "Database migration failed after 10 attempts."
    exit 1
  fi
  echo "Migration failed, retrying in 3s... ($retries attempts left)"
  sleep 3
done

echo "Migrations applied. Starting server..."
while true; do
  node dist/server.js
  code=$?
  echo "Server exited (code ${code}). Restarting in 5s..."
  sleep 5
done
