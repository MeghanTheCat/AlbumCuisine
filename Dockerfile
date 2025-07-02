# Utiliser l'image officielle Node.js LTS
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package.json ./

# Installer les dépendances et recompiler sqlite3
RUN npm install --production && npm rebuild sqlite3

# Créer l'utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S recettes -u 1001

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p media/uploads api && \
    chown -R recettes:nodejs /app

# Copier le code source
COPY --chown=recettes:nodejs . .

# Exposer le port
EXPOSE 3000

# Changer vers l'utilisateur non-root
USER recettes

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Commande de démarrage avec debug complet
CMD ["sh", "-c", "echo 'Contenu racine:' && ls -la && echo 'Contenu api:' && ls -la api/ && echo 'Recherche server.js:' && find . -name 'server.js' && node api/server.js"]