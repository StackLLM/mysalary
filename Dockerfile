# MySalary en images Docker (docs/prod.md § 8.8) : deux images, `api` et `web`, assemblées par docker-compose.yml.
#   docker compose up --build  →  http://127.0.0.1:8080

# --- Dépendances : installées une fois, partagées par les deux étapes suivantes. ---
FROM node:22-bookworm-slim AS dependances
WORKDIR /app
# Prisma a besoin d'OpenSSL pour son moteur de requêtes.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/moteur/package.json packages/moteur/
COPY packages/partage/package.json packages/partage/
COPY server/package.json server/
COPY ui/package.json ui/
# Le schéma doit être là : le script `postinstall` du serveur génère le client Prisma.
COPY server/prisma server/prisma
RUN npm ci

# --- Interface : build Vite, servi ensuite par nginx. ---
FROM dependances AS construction-ui
COPY tsconfig.base.json ./
COPY packages packages
COPY ui ui
RUN npm run build -w ui

FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construction-ui /app/ui/dist /usr/share/nginx/html
EXPOSE 8080

# --- API : Fastify lancé par tsx (les paquets partagés sont livrés en TypeScript). ---
FROM dependances AS api
ENV NODE_ENV=production \
    HOTE=0.0.0.0 \
    PORT=3010 \
    DATABASE_URL=file:/data/mysalary.db
COPY tsconfig.base.json ./
COPY packages packages
COPY server server
# La base vit dans un volume : elle survit à la recréation du conteneur.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3010/api/v1/sante').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Les migrations s'appliquent avant chaque démarrage ; `migrate deploy` ne touche qu'aux migrations en attente.
CMD ["sh", "-c", "npx prisma migrate deploy --schema server/prisma/schema.prisma && npm run start -w server"]
