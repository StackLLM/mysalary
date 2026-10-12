-- AlterTable : aucune donnée modifiée ; les adresses existantes restent à vérifier.
ALTER TABLE "Utilisateur" ADD COLUMN "emailVerifieLe" DATETIME;

-- CreateTable
CREATE TABLE "JetonEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" DATETIME NOT NULL,
    CONSTRAINT "JetonEmail_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JetonEmail_utilisateurId_idx" ON "JetonEmail"("utilisateurId");
