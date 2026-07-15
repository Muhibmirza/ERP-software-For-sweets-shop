ALTER TABLE "SupplierPayment" ADD COLUMN "purchaseOrderId" TEXT;

CREATE TABLE "PurchaseReturn" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "totalAmount" REAL NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PurchaseReturn_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PurchaseReturnItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "purchaseReturnId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "quantity" REAL NOT NULL,
  "unit" TEXT NOT NULL,
  "rate" REAL NOT NULL,
  "subtotal" REAL NOT NULL,
  CONSTRAINT "PurchaseReturnItem_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseReturnItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
