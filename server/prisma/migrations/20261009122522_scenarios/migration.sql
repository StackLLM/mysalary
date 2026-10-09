-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN "reglesScenarios" TEXT;

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ajustements" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL DEFAULT 12,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Scenario_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
