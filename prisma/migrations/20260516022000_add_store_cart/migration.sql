-- CreateTable
CREATE TABLE "store_carts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "anonymousToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "store_carts_userId_fkey" FOREIGN KEY (
        "userId"
    ) REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "store_cart_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "store_cart_items_cartId_fkey" FOREIGN KEY (
        "cartId"
    ) REFERENCES "store_carts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "store_cart_items_productId_fkey" FOREIGN KEY (
        "productId"
    ) REFERENCES "store_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "store_carts_anonymousToken_key" ON "store_carts" (
    "anonymousToken"
);

-- CreateIndex
CREATE INDEX "store_carts_userId_idx" ON "store_carts" ("userId");

-- CreateIndex
CREATE UNIQUE INDEX "store_cart_items_cartId_productId_key" ON "store_cart_items" (
    "cartId", "productId"
);

-- CreateIndex
CREATE INDEX "store_cart_items_productId_idx" ON "store_cart_items" (
    "productId"
);
