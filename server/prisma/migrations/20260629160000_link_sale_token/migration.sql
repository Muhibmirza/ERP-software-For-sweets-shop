-- Keep token-backed POS sales visible in sales history on existing installs.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tokenNumber" INTEGER;

CREATE TABLE IF NOT EXISTS "TokenCounter" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Token" (
  "id" TEXT NOT NULL,
  "tokenNumber" INTEGER NOT NULL,
  "items" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "cashierId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "saleId" TEXT,
  CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Token" ADD COLUMN IF NOT EXISTS "saleId" TEXT;

UPDATE "Sale" s
SET "tokenNumber" = t."tokenNumber",
    "tokenId" = t."id"
FROM "Token" t
WHERE t."saleId" = s."id"
  AND (s."tokenNumber" IS NULL OR s."tokenId" IS NULL);
