-- « Pas ce mois-ci » : versement mensuel d'un objectif non attendu pour un mois budgétaire (lot 36).
-- CreateTable
CREATE TABLE "VersementSaute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "objectifId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersementSaute_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VersementSaute_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objectif" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VersementSaute_utilisateurId_objectifId_cle_key" ON "VersementSaute"("utilisateurId", "objectifId", "cle");
