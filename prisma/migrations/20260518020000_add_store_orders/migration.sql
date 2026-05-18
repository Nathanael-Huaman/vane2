-- CreateTable
CREATE TABLE "store_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotalMinorUnits" INTEGER NOT NULL,
    "totalMinorUnits" INTEGER NOT NULL,
    "confirmationTokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "store_orders_userId_fkey" FOREIGN KEY (
        "userId"
    ) REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "store_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "unitPriceMinorUnits" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalMinorUnits" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_order_items_orderId_fkey" FOREIGN KEY (
        "orderId"
    ) REFERENCES "store_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "store_order_items_productId_fkey" FOREIGN KEY (
        "productId"
    ) REFERENCES "store_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_confirmationTokenHash_key" ON "store_orders" (
    "confirmationTokenHash"
);

-- CreateIndex
CREATE INDEX "store_orders_userId_createdAt_idx" ON "store_orders" (
    "userId", "createdAt"
);

-- CreateIndex
CREATE INDEX "store_orders_status_createdAt_idx" ON "store_orders" (
    "status", "createdAt"
);

-- CreateIndex
CREATE INDEX "store_order_items_orderId_idx" ON "store_order_items" ("orderId");

-- CreateIndex
CREATE INDEX "store_order_items_productId_idx" ON "store_order_items" (
    "productId"
);
