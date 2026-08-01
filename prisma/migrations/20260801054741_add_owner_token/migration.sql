/*
  Warnings:

  - Added the required column `ownerToken` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "description" TEXT,
    "evidenceUrl" TEXT,
    "ownerToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Incident" ("category", "createdAt", "description", "evidenceUrl", "id", "location", "timestamp") SELECT "category", "createdAt", "description", "evidenceUrl", "id", "location", "timestamp" FROM "Incident";
DROP TABLE "Incident";
ALTER TABLE "new_Incident" RENAME TO "Incident";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
