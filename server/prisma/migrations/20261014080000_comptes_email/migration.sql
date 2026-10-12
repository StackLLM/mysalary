-- AlterTable : les comptes existants gardent leurs données ; leur e-mail est donné à l'activation (npm run compte:activer).
ALTER TABLE "Utilisateur" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateTable
CREATE TABLE "JetonMotDePasse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" DATETIME NOT NULL,
    CONSTRAINT "JetonMotDePasse_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JetonMotDePasse_utilisateurId_idx" ON "JetonMotDePasse"("utilisateurId");
