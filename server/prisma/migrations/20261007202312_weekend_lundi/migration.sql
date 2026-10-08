-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContratSalaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "moisEffet" TEXT NOT NULL,
    "montantNet" INTEGER NOT NULL,
    "jourHabituel" INTEGER NOT NULL,
    "regleJourNonOuvre" TEXT NOT NULL DEFAULT 'apres',
    "financeMoisSuivant" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ContratSalaire_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContratSalaire" ("creeLe", "financeMoisSuivant", "id", "jourHabituel", "modifieLe", "moisEffet", "montantNet", "regleJourNonOuvre", "utilisateurId") SELECT "creeLe", "financeMoisSuivant", "id", "jourHabituel", "modifieLe", "moisEffet", "montantNet", "regleJourNonOuvre", "utilisateurId" FROM "ContratSalaire";
DROP TABLE "ContratSalaire";
ALTER TABLE "new_ContratSalaire" RENAME TO "ContratSalaire";
CREATE UNIQUE INDEX "ContratSalaire_utilisateurId_moisEffet_key" ON "ContratSalaire"("utilisateurId", "moisEffet");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
