-- CreateTable
CREATE TABLE "shop_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "shopifySubscriptionId" TEXT,
    "planType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" DATETIME NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "trialEndsAt" DATETIME,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "billingPeriod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "shop_subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "aiSearchesPerMonth" INTEGER NOT NULL,
    "conversationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hybridSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_subscriptions_shopDomain_key" ON "shop_subscriptions"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "shop_subscriptions_shopifySubscriptionId_key" ON "shop_subscriptions"("shopifySubscriptionId");

-- CreateIndex
CREATE INDEX "usage_records_shopDomain_billingPeriod_usageType_idx" ON "usage_records"("shopDomain", "billingPeriod", "usageType");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_planType_key" ON "plan_limits"("planType");
