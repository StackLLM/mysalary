-- Enveloppe : le montant redevient le budget du mois ; l'utilisateur choisit combien ouvrir par semaine ou par jour.
ALTER TABLE "Charge" ADD COLUMN "rythme" INTEGER;
ALTER TABLE "Charge" ADD COLUMN "semaines" TEXT NOT NULL DEFAULT '';
-- Une enveloppe saisie « par semaine » ou « par jour » (ancien sens : montant additionné) garde ce montant comme rythme ;
-- son budget du mois devient ce que l'ancien calcul donnait sur un mois moyen (30,4 jours).
UPDATE "Charge" SET "rythme" = "montant", "montant" = CAST(ROUND("montant" * 365.0 / 12 / 7) AS INTEGER) WHERE "nature" = 'enveloppe' AND "unite" = 'semaine';
UPDATE "Charge" SET "rythme" = "montant", "montant" = CAST(ROUND("montant" * 365.0 / 12) AS INTEGER) WHERE "nature" = 'enveloppe' AND "unite" = 'jour';
