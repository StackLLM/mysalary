-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prenom" TEXT NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'MAD',
    "onboardingEtape" INTEGER NOT NULL DEFAULT 0,
    "onboardingTermine" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Reglages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "modePeriode" TEXT NOT NULL DEFAULT 'cyclePaie',
    "debutSemaine" INTEGER NOT NULL DEFAULT 1,
    "reportHebdo" BOOLEAN NOT NULL DEFAULT false,
    "animations" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Reglages_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reglages_utilisateurId_key" ON "Reglages"("utilisateurId");
