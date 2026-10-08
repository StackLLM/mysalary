-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "groupe" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT 'autre',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Categorie_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Charge" (
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
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Charge_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Charge_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ponctuel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "certitude" TEXT NOT NULL DEFAULT 'garanti',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Ponctuel_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ponctuel_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "creancier" TEXT NOT NULL DEFAULT '',
    "montantTotal" INTEGER NOT NULL,
    "mensualite" INTEGER NOT NULL,
    "premiereEcheance" TEXT NOT NULL,
    "note" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Dette_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaiementDette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "detteId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "note" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaiementDette_detteId_fkey" FOREIGN KEY ("detteId") REFERENCES "Dette" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_utilisateurId_libelle_key" ON "Categorie"("utilisateurId", "libelle");

-- CreateIndex
CREATE INDEX "Charge_utilisateurId_idx" ON "Charge"("utilisateurId");

-- CreateIndex
CREATE INDEX "Ponctuel_utilisateurId_date_idx" ON "Ponctuel"("utilisateurId", "date");

-- CreateIndex
CREATE INDEX "Dette_utilisateurId_idx" ON "Dette"("utilisateurId");

-- CreateIndex
CREATE INDEX "PaiementDette_utilisateurId_idx" ON "PaiementDette"("utilisateurId");
