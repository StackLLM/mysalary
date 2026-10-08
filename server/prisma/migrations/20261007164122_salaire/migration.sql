-- CreateTable
CREATE TABLE "ContratSalaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "moisEffet" TEXT NOT NULL,
    "montantNet" INTEGER NOT NULL,
    "jourHabituel" INTEGER NOT NULL,
    "regleJourNonOuvre" TEXT NOT NULL DEFAULT 'avant',
    "financeMoisSuivant" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ContratSalaire_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "moisFinance" TEXT NOT NULL,
    "dateReelle" TEXT,
    "datePrevue" TEXT,
    "recueLe" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Paie_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LignePaie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paieId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "certitude" TEXT NOT NULL,
    "montantPrevu" INTEGER,
    "montantRecu" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LignePaie_paieId_fkey" FOREIGN KEY ("paieId") REFERENCES "Paie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContratSalaire_utilisateurId_moisEffet_key" ON "ContratSalaire"("utilisateurId", "moisEffet");

-- CreateIndex
CREATE UNIQUE INDEX "Paie_utilisateurId_moisFinance_key" ON "Paie"("utilisateurId", "moisFinance");

-- CreateIndex
CREATE INDEX "LignePaie_utilisateurId_idx" ON "LignePaie"("utilisateurId");
