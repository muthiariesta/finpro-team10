-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SafePointType" AS ENUM ('MEDICAL', 'POLICE', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "AreaRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'LIMITED');

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "SafePointEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SafePointType" NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafePointEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskArea" (
    "id" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "streetSegment" TEXT NOT NULL,
    "crowdDensity" TEXT NOT NULL,
    "riskLevel" "AreaRiskLevel" NOT NULL DEFAULT 'LIMITED',
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");
