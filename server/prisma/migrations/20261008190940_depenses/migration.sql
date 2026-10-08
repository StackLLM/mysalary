-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "categorieId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "chargeId" TEXT,
    "echeance" TEXT,
    "ponctuelId" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Depense_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Depense_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Depense_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Depense_ponctuelId_fkey" FOREIGN KEY ("ponctuelId") REFERENCES "Ponctuel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Depense_utilisateurId_date_idx" ON "Depense"("utilisateurId", "date");
