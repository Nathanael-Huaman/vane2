-- CreateTable
CREATE TABLE "store_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "priceMinorUnits" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sku" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "store_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "store_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "store_categories_slug_key" ON "store_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_slug_key" ON "store_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_sku_key" ON "store_products"("sku");

-- CreateIndex
CREATE INDEX "store_products_status_featured_idx" ON "store_products"("status", "featured");

-- CreateIndex
CREATE INDEX "store_products_status_createdAt_idx" ON "store_products"("status", "createdAt");

-- CreateIndex
CREATE INDEX "store_products_categoryId_status_idx" ON "store_products"("categoryId", "status");
