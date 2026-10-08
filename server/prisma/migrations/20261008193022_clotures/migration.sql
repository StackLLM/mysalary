-- CreateTable
CREATE TABLE "ClotureMois" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "instantane" TEXT NOT NULL,
    "forcee" BOOLEAN NOT NULL DEFAULT false,
    "nonConfirmees" INTEGER NOT NULL DEFAULT 0,
    "clotureLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClotureMois_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalCloture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "nonConfirmees" INTEGER NOT NULL DEFAULT 0,
    "le" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalCloture_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClotureMois_utilisateurId_cle_key" ON "ClotureMois"("utilisateurId", "cle");

-- CreateIndex
CREATE INDEX "JournalCloture_utilisateurId_cle_idx" ON "JournalCloture"("utilisateurId", "cle");
