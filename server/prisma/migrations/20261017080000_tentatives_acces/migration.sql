-- Limites d'essais (connexion, mot de passe oublié, envois de liens) en base : partagées par toutes les instances (lot P2).
-- CreateTable
CREATE TABLE "TentativeAcces" (
    "cle" TEXT NOT NULL PRIMARY KEY,
    "nombre" INTEGER NOT NULL,
    "finFenetre" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TentativeAcces_finFenetre_idx" ON "TentativeAcces"("finFenetre");
