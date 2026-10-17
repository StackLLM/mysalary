-- Acceptation des conditions d'utilisation et de la politique de confidentialité (lot P3).
-- Aucune donnée modifiée : les comptes existants restent sans acceptation enregistrée.
ALTER TABLE "Utilisateur" ADD COLUMN "conditionsAccepteesLe" DATETIME;
ALTER TABLE "Utilisateur" ADD COLUMN "conditionsVersion" TEXT;
