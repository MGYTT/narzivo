CREATE TYPE "BillingPeriod" AS ENUM ('ONE_TIME', 'MONTH', 'YEAR', 'CUSTOM');
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'REJECTED');

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT NOT NULL,
    "countryCode" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AffiliateProgram" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "termsUrl" TEXT,
    "cookieDays" INTEGER,
    "commissionNote" TEXT,
    "accountReference" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "priceAmount" DECIMAL(12,2),
    "regularPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTH',
    "billingLabel" TEXT,
    "promoCode" TEXT,
    "affiliateUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "useCases" TEXT[],
    "pros" TEXT[],
    "cons" TEXT[],
    "editorScore" DECIMAL(3,1),
    "methodologyNotes" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "priceAmount" DECIMAL(12,2),
    "regularPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgentHash" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_isPublished_sortOrder_idx" ON "Category"("isPublished", "sortOrder");
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");
CREATE INDEX "AffiliateProgram_providerId_status_idx" ON "AffiliateProgram"("providerId", "status");
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");
CREATE INDEX "Offer_categoryId_isPublished_idx" ON "Offer"("categoryId", "isPublished");
CREATE INDEX "Offer_providerId_isPublished_idx" ON "Offer"("providerId", "isPublished");
CREATE INDEX "Offer_isFeatured_isPublished_idx" ON "Offer"("isFeatured", "isPublished");
CREATE INDEX "OfferPriceHistory_offerId_capturedAt_idx" ON "OfferPriceHistory"("offerId", "capturedAt");
CREATE INDEX "AffiliateClick_offerId_createdAt_idx" ON "AffiliateClick"("offerId", "createdAt");
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");

ALTER TABLE "AffiliateProgram" ADD CONSTRAINT "AffiliateProgram_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
