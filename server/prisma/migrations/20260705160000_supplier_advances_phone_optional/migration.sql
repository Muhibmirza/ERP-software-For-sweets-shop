ALTER TABLE "Employee" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "phone" DROP NOT NULL;

CREATE TABLE "SupplierAdvance" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "advanceType" TEXT NOT NULL DEFAULT 'SHORT_TERM',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "monthlyDeduction" DOUBLE PRECISION,
    "reason" TEXT,
    "advanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFullyRecovered" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAdvance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierAdvanceRecovery" (
    "id" TEXT NOT NULL,
    "supplierAdvanceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recoveredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentId" TEXT,

    CONSTRAINT "SupplierAdvanceRecovery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SupplierAdvance" ADD CONSTRAINT "SupplierAdvance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierAdvance" ADD CONSTRAINT "SupplierAdvance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierAdvanceRecovery" ADD CONSTRAINT "SupplierAdvanceRecovery_supplierAdvanceId_fkey" FOREIGN KEY ("supplierAdvanceId") REFERENCES "SupplierAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
