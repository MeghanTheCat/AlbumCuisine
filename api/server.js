const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '..', 'media', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'recipe-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accepter seulement les images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images sont acceptées!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..'))); // Servir les fichiers statiques depuis la racine

// Initialisation de la base de données
const dbPath = path.join(__dirname, '..', 'data', 'recettes.db');
const db = new sqlite3.Database(dbPath);

// Création des tables si elles n'existent pas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS recettes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titre VARCHAR(255) NOT NULL,
            description TEXT,
            categorie VARCHAR(50) NOT NULL CHECK(categorie IN ('cuisine', 'cocktails')),
            temps_preparation INTEGER,
            difficulte VARCHAR(20) DEFAULT 'Facile' CHECK(difficulte IN ('Facile', 'Moyen', 'Difficile')),
            ingredients TEXT, -- JSON string
            instructions TEXT, -- JSON string
            image_url VARCHAR(255), -- URL de l'image uploadée
            emoji VARCHAR(10) DEFAULT '🍽️',
            date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
            date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Vérifier si la colonne image_url existe, sinon l'ajouter
    db.all("PRAGMA table_info(recettes)", (err, columns) => {
        if (err) {
            console.error('Erreur lors de la vérification de la table:', err);
            return;
        }

        const hasImageUrl = columns.some(col => col.name === 'image_url');
        if (!hasImageUrl) {
            db.run("ALTER TABLE recettes ADD COLUMN image_url VARCHAR(255)", (err) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout de la colonne image_url:', err);
                } else {
                    console.log('Colonne image_url ajoutée avec succès');
                }
            });
        }
    });

    // Insertion de quelques recettes d'exemple
    const exemplesRecettes = [
        {
            titre: 'Risotto aux champignons',
            description: 'Un délicieux risotto crémeux aux champignons de saison, parfait pour un dîner réconfortant et savoureux.',
            categorie: 'cuisine',
            temps_preparation: 35,
            difficulte: 'Facile',
            emoji: '🥘',
            ingredients: JSON.stringify([
                '300g de riz Arborio',
                '500g de champignons mélangés',
                '1L de bouillon de légumes',
                '1 oignon',
                '100ml de vin blanc',
                '50g de parmesan',
                'Huile d\'olive'
            ]),
            instructions: JSON.stringify([
                'Faire chauffer le bouillon',
                'Faire revenir l\'oignon haché',
                'Ajouter le riz et nacrer 2 minutes',
                'Ajouter le vin blanc',
                'Incorporer le bouillon louche par louche',
                'Ajouter les champignons sautés',
                'Terminer avec le parmesan'
            ])
        },
        {
            titre: 'Mojito Classic',
            description: 'Le cocktail cubain traditionnel à base de rhum blanc, menthe fraîche et citron vert. Rafraîchissant et parfait pour l\'été.',
            categorie: 'cocktails',
            temps_preparation: 5,
            difficulte: 'Facile',
            emoji: '🍸',
            ingredients: JSON.stringify([
                '6cl de rhum blanc',
                '10 feuilles de menthe fraîche',
                '1/2 citron vert',
                '2 cuillères à café de sucre de canne',
                'Eau gazeuse',
                'Glaçons'
            ]),
            instructions: JSON.stringify([
                'Mettre la menthe et le sucre dans un verre',
                'Piler délicatement',
                'Ajouter le jus de citron vert',
                'Ajouter le rhum',
                'Remplir de glaçons',
                'Compléter avec l\'eau gazeuse',
                'Mélanger et décorer'
            ])
        }
    ];

    // Vérifier si des recettes existent déjà
    db.get("SELECT COUNT(*) as count FROM recettes", (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification:', err);
            return;
        }

        if (row.count === 0) {
            console.log('Insertion des recettes d\'exemple...');
            const stmt = db.prepare(`
                INSERT INTO recettes (titre, description, categorie, temps_preparation, difficulte, emoji, ingredients, instructions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            exemplesRecettes.forEach(recette => {
                stmt.run([
                    recette.titre,
                    recette.description,
                    recette.categorie,
                    recette.temps_preparation,
                    recette.difficulte,
                    recette.emoji,
                    recette.ingredients,
                    recette.instructions
                ]);
            });

            stmt.finalize();
            console.log('Recettes d\'exemple insérées avec succès !');
        }
    });
});

// Route pour l'upload d'images
app.post('/api/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        const imageUrl = `/media/uploads/${req.file.filename}`;
        res.json({
            success: true,
            imageUrl: imageUrl,
            message: 'Image uploadée avec succès'
        });
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
    }
});

// Route pour supprimer une image
app.delete('/api/delete-image', (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: 'URL d\'image requise' });
    }

    const imagePath = path.join(__dirname, '..', imageUrl);

    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error('Erreur lors de la suppression:', err);
            return res.status(500).json({ error: 'Erreur lors de la suppression de l\'image' });
        }

        res.json({ success: true, message: 'Image supprimée avec succès' });
    });
});

// Routes API existantes (modifiées pour supporter image_url)

// GET - Récupérer toutes les recettes
app.get('/api/recettes', (req, res) => {
    const { categorie, search } = req.query;

    let query = 'SELECT * FROM recettes';
    let params = [];
    let conditions = [];

    if (categorie && categorie !== 'all') {
        conditions.push('categorie = ?');
        params.push(categorie);
    }

    if (search) {
        conditions.push('(titre LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date_creation DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Parser les JSON strings
        const recettes = rows.map(row => ({
            ...row,
            ingredients: JSON.parse(row.ingredients || '[]'),
            instructions: JSON.parse(row.instructions || '[]')
        }));

        res.json(recettes);
    });
});

// GET - Récupérer une recette par ID
app.get('/api/recettes/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM recettes WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Recette non trouvée' });
            return;
        }

        const recette = {
            ...row,
            ingredients: JSON.parse(row.ingredients || '[]'),
            instructions: JSON.parse(row.instructions || '[]')
        };

        res.json(recette);
    });
});

// POST - Créer une nouvelle recette
app.post('/api/recettes', (req, res) => {
    const { titre, description, categorie, temps_preparation, difficulte, emoji, ingredients, instructions, image_url } = req.body;

    // Validation
    if (!titre || !categorie) {
        res.status(400).json({ error: 'Titre et catégorie sont requis' });
        return;
    }

    if (!['cuisine', 'cocktails'].includes(categorie)) {
        res.status(400).json({ error: 'Catégorie invalide' });
        return;
    }

    const query = `
        INSERT INTO recettes (titre, description, categorie, temps_preparation, difficulte, emoji, ingredients, instructions, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        titre,
        description || '',
        categorie,
        temps_preparation || 0,
        difficulte || 'Facile',
        emoji || (categorie === 'cocktails' ? '🍹' : '🍽️'),
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        image_url || null
    ];

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        res.status(201).json({
            id: this.lastID,
            message: 'Recette créée avec succès'
        });
    });
});

// PUT - Modifier une recette
app.put('/api/recettes/:id', (req, res) => {
    const { id } = req.params;
    const { titre, description, categorie, temps_preparation, difficulte, emoji, ingredients, instructions, image_url } = req.body;

    // Validation
    if (!titre || !categorie) {
        res.status(400).json({ error: 'Titre et catégorie sont requis' });
        return;
    }

    const query = `
        UPDATE recettes 
        SET titre = ?, description = ?, categorie = ?, temps_preparation = ?, 
            difficulte = ?, emoji = ?, ingredients = ?, instructions = ?, image_url = ?,
            date_modification = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const params = [
        titre,
        description || '',
        categorie,
        temps_preparation || 0,
        difficulte || 'Facile',
        emoji || '🍽️',
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        image_url || null,
        id
    ];

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (this.changes === 0) {
            res.status(404).json({ error: 'Recette non trouvée' });
            return;
        }

        res.json({ message: 'Recette modifiée avec succès' });
    });
});

// DELETE - Supprimer une recette
app.delete('/api/recettes/:id', (req, res) => {
    const { id } = req.params;

    // D'abord récupérer l'image pour la supprimer
    db.get('SELECT image_url FROM recettes WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Supprimer la recette
        db.run('DELETE FROM recettes WHERE id = ?', [id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (this.changes === 0) {
                res.status(404).json({ error: 'Recette non trouvée' });
                return;
            }

            // Supprimer l'image si elle existe
            if (row && row.image_url) {
                const imagePath = path.join(__dirname, '..', row.image_url);
                fs.unlink(imagePath, (err) => {
                    if (err) console.error('Erreur suppression image:', err);
                });
            }

            res.json({ message: 'Recette supprimée avec succès' });
        });
    });
});

// Route pour servir le frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Base de données SQLite: ${dbPath}`);
    console.log(`🌐 Interface web: http://localhost:${PORT}`);
    console.log(`📸 Dossier uploads: ${uploadsDir}`);
});

// Fermeture propre de la base de données
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la DB:', err.message);
        } else {
            console.log('✅ Base de données fermée proprement.');
        }
        process.exit(0);
    });
});