-- CreateTable
CREATE TABLE "CompteEpargne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "solde" INTEGER NOT NULL,
    "auLe" TEXT NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "CompteEpargne_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MouvementEpargne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "objectifId" TEXT,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MouvementEpargne_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MouvementEpargne_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteEpargne" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MouvementEpargne_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objectif" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "montantCible" INTEGER NOT NULL,
    "montantInitial" INTEGER NOT NULL DEFAULT 0,
    "dateCible" TEXT,
    "priorite" INTEGER NOT NULL,
    "versementMensuel" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "realiseLe" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Objectif_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MouvementEpargne_utilisateurId_date_idx" ON "MouvementEpargne"("utilisateurId", "date");
