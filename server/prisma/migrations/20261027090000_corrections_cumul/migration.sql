-- Solde réel déclaré à la fin d'un mois terminé : correction du cumul de mois en mois (lot 35).
-- CreateTable
CREATE TABLE "CorrectionCumul" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "solde" INTEGER NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "CorrectionCumul_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CorrectionCumul_utilisateurId_cle_key" ON "CorrectionCumul"("utilisateurId", "cle");
