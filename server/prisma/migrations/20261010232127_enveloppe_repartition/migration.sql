-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "frequence" TEXT NOT NULL DEFAULT 'mensuelle',
    "mois" TEXT NOT NULL DEFAULT '',
    "jour" INTEGER,
    "debut" TEXT NOT NULL,
    "fin" TEXT,
    "essentielle" BOOLEAN NOT NULL DEFAULT false,
    "repartition" TEXT NOT NULL DEFAULT 'jour',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Charge_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Charge_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Charge" ("categorieId", "creeLe", "debut", "essentielle", "fin", "frequence", "id", "jour", "libelle", "modifieLe", "mois", "montant", "nature", "utilisateurId") SELECT "categorieId", "creeLe", "debut", "essentielle", "fin", "frequence", "id", "jour", "libelle", "modifieLe", "mois", "montant", "nature", "utilisateurId" FROM "Charge";
DROP TABLE "Charge";
ALTER TABLE "new_Charge" RENAME TO "Charge";
CREATE INDEX "Charge_utilisateurId_idx" ON "Charge"("utilisateurId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
