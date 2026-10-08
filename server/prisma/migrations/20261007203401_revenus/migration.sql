-- AlterTable
ALTER TABLE "LignePaie" ADD COLUMN "sourceId" TEXT;

-- CreateTable
CREATE TABLE "SourceRevenu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "frequence" TEXT NOT NULL,
    "mois" TEXT NOT NULL DEFAULT '',
    "versement" TEXT NOT NULL,
    "jour" INTEGER,
    "certitude" TEXT NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "SourceRevenu_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevenuRecu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "sourceId" TEXT,
    "moisOccurrence" TEXT,
    "date" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "note" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "RevenuRecu_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RevenuRecu_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceRevenu" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SourceRevenu_utilisateurId_idx" ON "SourceRevenu"("utilisateurId");

-- CreateIndex
CREATE INDEX "RevenuRecu_utilisateurId_date_idx" ON "RevenuRecu"("utilisateurId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenuRecu_sourceId_moisOccurrence_key" ON "RevenuRecu"("sourceId", "moisOccurrence");
