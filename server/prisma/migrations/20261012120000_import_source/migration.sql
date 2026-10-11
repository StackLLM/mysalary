-- Import de l'ancienne app à l'onboarding : fichier brut archivé et décision de chaque ligne proposée.
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fichierBrut" TEXT NOT NULL,
    "analyse" TEXT NOT NULL,
    "importeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportSource_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ImportSource_utilisateurId_key" ON "ImportSource"("utilisateurId");
