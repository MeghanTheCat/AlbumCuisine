class RecettesApp {
    constructor() {
        this.apiUrl = '/api/recettes';
        this.currentTab = 'all';
        this.recettes = [];
        this.currentImageUrl = null;
        this.ingredientsList = [];
        this.instructionsList = [];
        this.init();
    }

    async init() {
        await this.loadRecettes();
        this.setupEventListeners();
        this.renderRecettes();
    }

    setupEventListeners() {
        // Onglets de navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab') || 'all';
                this.switchTab(tab, e.target);
            });
        });

        // Barre de recherche
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
            searchBar.addEventListener('input', (e) => {
                this.searchRecettes(e.target.value);
            });
        }

        // Bouton d'ajout
        const addBtn = document.querySelector('.add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showEnhancedAddRecipeForm();
            });
        }
    }

    async loadRecettes(categorie = 'all', search = '') {
        try {
            const params = new URLSearchParams();
            if (categorie !== 'all') params.append('categorie', categorie);
            if (search) params.append('search', search);

            const url = `${this.apiUrl}${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            this.recettes = await response.json();
            this.renderRecettes();
        } catch (error) {
            console.error('Erreur lors du chargement des recettes:', error);
            this.showError('Erreur lors du chargement des recettes. Vérifiez que le serveur est démarré.');
        }
    }

    renderRecettes() {
        const grid = document.getElementById('recipesGrid');
        if (!grid) return;

        if (this.recettes.length === 0) {
            this.showEmptyState(grid);
            return;
        }

        grid.innerHTML = this.recettes.map(recette => this.createRecipeCard(recette)).join('');

        // Ajouter les événements de clic
        grid.querySelectorAll('.recipe-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.showRecipeDetail(this.recettes[index]);
            });
        });
    }

    createRecipeCard(recette) {
        // Déterminer si la recette a une image
        const hasImage = recette.image_url && recette.image_url.trim() !== '';

        if (hasImage) {
            // Carte avec image en arrière-plan
            return `
            <div class="recipe-card has-image" data-category="${recette.categorie}" data-id="${recette.id}">
                <div class="recipe-image has-image">
                    <img src="${recette.image_url}" alt="${recette.titre}">
                    <div class="recipe-image-overlay">
                        <h3 class="recipe-title">${recette.titre}</h3>
                    </div>
                </div>
                <div class="recipe-content">
                    <p class="recipe-description">${this.truncateDescription(recette.description, 120)}</p>
                    <div class="recipe-meta">
                        <div class="recipe-time">⏱️ ${recette.temps_preparation} min</div>
                        <div class="recipe-difficulty">${recette.difficulte}</div>
                    </div>
                </div>
            </div>
        `;
        } else {
            // Carte avec emoji et même structure que les cartes avec image
            return `
            <div class="recipe-card" data-category="${recette.categorie}" data-id="${recette.id}">
                <div class="recipe-image">
                    <span style="position: relative; z-index: 2; font-size: 3rem;">${recette.emoji}</span>
                    <div class="recipe-image-overlay">
                        <h3 class="recipe-title">${recette.titre}</h3>
                    </div>
                </div>
                <div class="recipe-content">
                    <p class="recipe-description">${this.truncateDescription(recette.description, 120)}</p>
                    <div class="recipe-meta">
                        <div class="recipe-time">⏱️ ${recette.temps_preparation} min</div>
                        <div class="recipe-difficulty">${recette.difficulte}</div>
                    </div>
                </div>
            </div>
        `;
        }
    }

    truncateDescription(description, maxLength) {
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength).trim() + '...';
    }

    switchTab(tab, buttonElement) {
        this.currentTab = tab;

        // Mettre à jour l'interface
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');

        // Recharger les recettes avec le nouveau filtre
        const searchValue = document.querySelector('.search-bar').value || '';
        this.loadRecettes(tab, searchValue);
    }

    searchRecettes(searchTerm) {
        this.loadRecettes(this.currentTab, searchTerm);
    }

    showEmptyState(container) {
        const categoryText = this.currentTab === 'all' ? 'recettes' :
            this.currentTab === 'cuisine' ? 'recettes de cuisine' : 'cocktails';

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Aucune ${categoryText} trouvée</h3>
                <p>Essayez de modifier vos critères de recherche ou ajoutez de nouvelles recettes.</p>
            </div>
        `;
    }

    showError(message) {
        const grid = document.getElementById('recipesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Erreur</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">Réessayer</button>
                </div>
            `;
        }
    }

    async showRecipeDetail(recette) {
        const modal = this.createDetailModal(recette);
        document.body.appendChild(modal);

        // Ajouter les classes pour les effets visuels
        document.body.classList.add('modal-open');

        // Fermeture du modal
        const closeBtn = modal.querySelector('.modal-close, .modal-close-banner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal);
            });
        }

        // Fermeture en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    closeModal(modal) {
        if (modal && modal.parentNode) {
            // Animation de fermeture
            modal.style.opacity = '0';

            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                this.removeModalEffects();
            }, 300);
        } else {
            this.removeModalEffects();
        }
    }

    createDetailModal(recette) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        // Créer le bandeau d'image si une image existe
        const imageBanner = recette.image_url ? `
            <div class="recipe-image-banner">
                <img src="${recette.image_url}" alt="${recette.titre}" class="banner-image">
                <div class="banner-overlay">
                    <h2>${recette.emoji} ${recette.titre}</h2>
                </div>
            </div>
        ` : `
            <div class="modal-header">
                <h2>${recette.emoji} ${recette.titre}</h2>
                <button class="modal-close">✕</button>
            </div>
        `;

        modal.innerHTML = `
            <div class="modal-content recipe-detail-modal">
                ${imageBanner}
                ${recette.image_url ? '<button class="modal-close-banner">✕</button>' : ''}
                <div class="modal-body">
                    <div class="recipe-meta-detail">
                        <span class="time">⏱️ ${recette.temps_preparation} min</span>
                        <span class="difficulty">${recette.difficulte}</span>
                        <span class="category">${recette.categorie === 'cuisine' ? '🍽️ Cuisine' : '🍹 Cocktails'}</span>
                    </div>
                    <p class="recipe-description-detail">${recette.description}</p>
                    
                    <div class="ingredients-section">
                        <h3>Ingrédients</h3>
                        <ul class="ingredients-list">
                            ${recette.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="instructions-section">
                        <h3>Instructions</h3>
                        <ol class="instructions-list">
                            ${recette.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                        </ol>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="edit-btn" onclick="app.editRecipe(${recette.id})">
                            ✏️ Modifier
                        </button>
                        <button class="delete-btn" onclick="app.deleteRecipe(${recette.id})">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    showEnhancedAddRecipeForm() {
        this.resetFormData();
        const formModal = this.createEnhancedRecipeForm();
        document.body.appendChild(formModal);

        // Ajouter les classes pour les effets visuels
        document.body.classList.add('modal-open');

        this.setupFormEventListeners();
    }

    createEnhancedRecipeForm(recette = null) {
        const isEdit = recette !== null;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        if (isEdit) {
            this.ingredientsList = [...recette.ingredients];
            this.instructionsList = [...recette.instructions];
            this.currentImageUrl = recette.image_url;
        }

        modal.innerHTML = `
            <div class="modal-content enhanced-form-modal">
                <div class="enhanced-recipe-form">
                    <div class="form-header">
                        <h2>${isEdit ? '✏️ Modifier la recette' : '➕ Nouvelle recette'}</h2>
                        <p>${isEdit ? 'Modifiez les détails de votre recette' : 'Créez une nouvelle recette délicieuse'}</p>
                        <button class="modal-close">✕</button>
                    </div>
                    
                    <form class="enhanced-form" id="recipeForm">
                        <div class="form-layout">
                            <!-- Colonne gauche -->
                            <div class="form-left">
                                <!-- Titre -->
                                <div class="enhanced-form-group">
                                    <label for="titre">
                                        Titre de la recette <span class="required-asterisk">*</span>
                                    </label>
                                    <input type="text" id="titre" name="titre" class="enhanced-input" 
                                           placeholder="Ex: Risotto aux champignons" required 
                                           value="${isEdit ? recette.titre : ''}">
                                    <div class="validation-message" id="titre-validation"></div>
                                </div>

                                <!-- Description -->
                                <div class="enhanced-form-group">
                                    <label for="description">
                                        Description 
                                        <span class="tooltip" data-tooltip="Une courte description qui apparaîtra sur la carte">ℹ️</span>
                                    </label>
                                    <textarea id="description" name="description" class="enhanced-textarea" 
                                              placeholder="Décrivez votre recette en quelques mots..." 
                                              maxlength="200" rows="3">${isEdit ? recette.description : ''}</textarea>
                                    <div class="char-counter">
                                        <span id="description-count">0</span>/200 caractères
                                    </div>
                                </div>

                                <!-- Informations de base -->
                                <div class="inline-group">
                                    <div class="enhanced-form-group">
                                        <label for="categorie">
                                            Catégorie <span class="required-asterisk">*</span>
                                        </label>
                                        <select id="categorie" name="categorie" class="enhanced-select" required>
                                            <option value="">Choisir une catégorie</option>
                                            <option value="cuisine" ${isEdit && recette.categorie === 'cuisine' ? 'selected' : ''}>🍽️ Cuisine</option>
                                            <option value="cocktails" ${isEdit && recette.categorie === 'cocktails' ? 'selected' : ''}>🍹 Cocktails</option>
                                        </select>
                                    </div>
                                    
                                    <div class="enhanced-form-group">
                                        <label for="temps_preparation">Temps (min)</label>
                                        <input type="number" id="temps_preparation" name="temps_preparation" 
                                               class="enhanced-input" min="1" max="1440" 
                                               placeholder="30" value="${isEdit ? recette.temps_preparation : ''}">
                                    </div>
                                    
                                    <div class="enhanced-form-group">
                                        <label for="difficulte">Difficulté</label>
                                        <select id="difficulte" name="difficulte" class="enhanced-select">
                                            <option value="Facile" ${isEdit && recette.difficulte === 'Facile' ? 'selected' : ''}>😊 Facile</option>
                                            <option value="Moyen" ${isEdit && recette.difficulte === 'Moyen' ? 'selected' : ''}>😐 Moyen</option>
                                            <option value="Difficile" ${isEdit && recette.difficulte === 'Difficile' ? 'selected' : ''}>😅 Difficile</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Emoji et Image -->
                                <div class="inline-group">
                                    <div class="enhanced-form-group emoji-field">
                                        <label for="emoji">Emoji représentatif</label>
                                        <div class="emoji-input-wrapper">
                                            <input type="text" id="emoji" name="emoji" class="enhanced-input emoji-input" 
                                                   maxlength="2" placeholder="🍽️" value="${isEdit ? recette.emoji : ''}">
                                            <button type="button" class="emoji-picker-btn" id="emojiPickerBtn">
                                                😀
                                            </button>
                                        </div>
                                        <div class="emoji-picker" id="emojiPicker">
                                            ${this.createEmojiPicker()}
                                        </div>
                                    </div>
                                </div>

                                <!-- Upload d'image -->
                                <div class="enhanced-form-group">
                                    <label>Photo de la recette</label>
                                    <div class="image-upload-section" id="imageUpload">
                                        <div class="upload-icon">📸</div>
                                        <div class="upload-text">Cliquez ou glissez votre image ici</div>
                                        <div class="upload-hint">JPG, PNG, WEBP - Max 5MB</div>
                                        <input type="file" class="hidden-file-input" id="imageInput" accept="image/*">
                                        <div class="upload-progress" id="uploadProgress">
                                            <div class="progress-bar" id="progressBar"></div>
                                        </div>
                                    </div>
                                    ${this.currentImageUrl ? this.createImagePreview(this.currentImageUrl) : ''}
                                </div>
                            </div>

                            <!-- Colonne droite -->
                            <div class="form-right">
                                <!-- Ingrédients -->
                                <div class="list-section">
                                    <h3>🥄 Ingrédients</h3>
                                    <div class="list-input-group">
                                        <input type="text" id="ingredientInput" class="enhanced-input list-input" 
                                               placeholder="Ex: 300g de riz Arborio">
                                        <button type="button" class="add-item-btn" id="addIngredientBtn">Ajouter</button>
                                    </div>
                                    <ul class="items-list" id="ingredientsList">
                                        ${this.renderIngredientsList()}
                                    </ul>
                                </div>

                                <!-- Instructions -->
                                <div class="list-section">
                                    <h3>📋 Instructions</h3>
                                    <div class="list-input-group">
                                        <textarea id="instructionInput" class="enhanced-textarea list-input" 
                                                  placeholder="Ex: Faire chauffer le bouillon de légumes" rows="2"></textarea>
                                        <button type="button" class="add-item-btn" id="addInstructionBtn">Ajouter</button>
                                    </div>
                                    <ul class="items-list" id="instructionsList">
                                        ${this.renderInstructionsList()}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="enhanced-form-actions">
                            <button type="button" class="enhanced-cancel-btn" id="cancelBtn">
                                ❌ Annuler
                            </button>
                            <button type="submit" class="enhanced-submit-btn" id="submitBtn">
                                ${isEdit ? '💾 Modifier la recette' : '✨ Créer la recette'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        return modal;
    }

    createEmojiPicker() {
        const emojiCategories = {
            cuisine: ['🍽️', '🥘', '🍳', '🥗', '🍝', '🍕', '🍰', '🧁', '🥙', '🌮', '🍜', '🍲', '🥟', '🍱', '🍙', '🍘'],
            cocktails: ['🍸', '🍹', '🥃', '🍷', '🍾', '🥂', '🍺', '🍻', '🧉', '☕', '🍵', '🥤', '🧊', '🍋', '🍊', '🍓'],
            fruits: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍑', '🍒', '🥭', '🍍', '🥥', '🥝', '🍅'],
            autres: ['😋', '😍', '🤤', '👨‍🍳', '👩‍🍳', '🔥', '⭐', '💖', '✨', '🎉', '🏆', '👌', '💯', '🥇', '🌟', '❤️']
        };

        let html = '<div class="emoji-categories">';
        Object.keys(emojiCategories).forEach(category => {
            html += `<button type="button" class="emoji-category-btn" data-category="${category}">${category}</button>`;
        });
        html += '</div><div class="emoji-grid" id="emojiGrid">';

        // Afficher la catégorie cuisine par défaut
        emojiCategories.cuisine.forEach(emoji => {
            html += `<button type="button" class="emoji-option" data-emoji="${emoji}">${emoji}</button>`;
        });

        html += '</div>';
        return html;
    }

    createImagePreview(imageUrl) {
        return `
            <div class="image-preview" id="imagePreview">
                <img src="${imageUrl}" alt="Aperçu" class="preview-image">
                <div class="image-actions">
                    <button type="button" class="image-action-btn remove-image-btn" id="removeImageBtn">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    renderIngredientsList() {
        return this.ingredientsList.map((ingredient, index) => `
            <li class="list-item">
                <span class="item-number">${index + 1}</span>
                <span class="item-text">${ingredient}</span>
                <button type="button" class="remove-item-btn" onclick="app.removeIngredient(${index})">×</button>
            </li>
        `).join('');
    }

    renderInstructionsList() {
        return this.instructionsList.map((instruction, index) => `
            <li class="list-item">
                <span class="item-number">${index + 1}</span>
                <span class="item-text">${instruction}</span>
                <button type="button" class="remove-item-btn" onclick="app.removeInstruction(${index})">×</button>
            </li>
        `).join('');
    }

    setupFormEventListeners() {
        const modal = document.querySelector('.enhanced-form-modal');
        if (!modal) return;

        // Fermeture modal avec nettoyage complet
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEnhancedForm();
            });
        }

        const cancelBtn = modal.querySelector('#cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeEnhancedForm();
            });
        }

        // Fermeture en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEnhancedForm();
            }
        });

        // Empêcher la fermeture en cliquant sur le contenu du modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Compteur de caractères pour la description
        const descInput = modal.querySelector('#description');
        const charCounter = modal.querySelector('#description-count');

        if (descInput && charCounter) {
            const updateCounter = () => {
                const count = descInput.value.length;
                charCounter.textContent = count;
                charCounter.parentElement.className = 'char-counter' +
                    (count > 180 ? ' warning' : '') +
                    (count > 200 ? ' error' : '');
            };

            descInput.addEventListener('input', updateCounter);
            updateCounter(); // Initial count
        }

        // Validation en temps réel
        this.setupFormValidation(modal);

        // Emoji picker
        this.setupEmojiPicker(modal);

        // Upload d'image
        this.setupImageUpload(modal);

        // Gestion des listes
        this.setupListManagement(modal);

        // Soumission du formulaire
        modal.querySelector('#recipeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });
    }

    setupFormValidation(modal) {
        const inputs = modal.querySelectorAll('.enhanced-input, .enhanced-textarea, .enhanced-select');

        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    this.validateField(input);
                }
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let message = '';

        switch (fieldName) {
            case 'titre':
                isValid = value.length >= 3 && value.length <= 100;
                message = isValid ? '' : 'Le titre doit contenir entre 3 et 100 caractères';
                break;
            case 'description':
                isValid = value.length <= 200;
                message = isValid ? '' : 'La description ne peut pas dépasser 200 caractères';
                break;
            case 'categorie':
                isValid = ['cuisine', 'cocktails'].includes(value);
                message = isValid ? '' : 'Veuillez sélectionner une catégorie valide';
                break;
            case 'temps_preparation':
                const temps = parseInt(value);
                isValid = !value || (temps > 0 && temps <= 1440);
                message = isValid ? '' : 'Le temps doit être entre 1 et 1440 minutes';
                break;
        }

        // Appliquer les classes de validation
        field.classList.toggle('valid', isValid && value);
        field.classList.toggle('invalid', !isValid);

        // Afficher le message
        const validationDiv = document.getElementById(`${fieldName}-validation`);
        if (validationDiv) {
            validationDiv.textContent = message;
            validationDiv.className = `validation-message ${isValid ? 'success' : 'error'}`;
        }

        return isValid;
    }

    setupEmojiPicker(modal) {
        const emojiBtn = modal.querySelector('#emojiPickerBtn');
        const emojiPicker = modal.querySelector('#emojiPicker');
        const emojiInput = modal.querySelector('#emoji');

        if (!emojiBtn || !emojiPicker) return;

        emojiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            emojiPicker.classList.toggle('show');
        });

        // Catégories d'emojis
        const emojiCategories = {
            cuisine: ['🍽️', '🥘', '🍳', '🥗', '🍝', '🍕', '🍰', '🧁', '🥙', '🌮', '🍜', '🍲', '🥟', '🍱', '🍙', '🍘'],
            cocktails: ['🍸', '🍹', '🥃', '🍷', '🍾', '🥂', '🍺', '🍻', '🧉', '☕', '🍵', '🥤', '🧊', '🍋', '🍊', '🍓'],
            fruits: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍑', '🍒', '🥭', '🍍', '🥥', '🥝', '🍅'],
            autres: ['😋', '😍', '🤤', '👨‍🍳', '👩‍🍳', '🔥', '⭐', '💖', '✨', '🎉', '🏆', '👌', '💯', '🥇', '🌟', '❤️']
        };

        // Boutons de catégorie
        modal.querySelectorAll('.emoji-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                const emojiGrid = modal.querySelector('#emojiGrid');

                // Mettre à jour la catégorie active
                modal.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Afficher les emojis de la catégorie
                emojiGrid.innerHTML = emojiCategories[category].map(emoji =>
                    `<button type="button" class="emoji-option" data-emoji="${emoji}">${emoji}</button>`
                ).join('');

                // Ajouter les événements aux nouveaux boutons
                emojiGrid.querySelectorAll('.emoji-option').forEach(emojiBtn => {
                    emojiBtn.addEventListener('click', () => {
                        emojiInput.value = emojiBtn.dataset.emoji;
                        emojiPicker.classList.remove('show');
                    });
                });
            });
        });

        // Événements pour les emojis par défaut
        modal.querySelectorAll('.emoji-option').forEach(emojiOption => {
            emojiOption.addEventListener('click', () => {
                emojiInput.value = emojiOption.dataset.emoji;
                emojiPicker.classList.remove('show');
            });
        });

        // Fermer le picker en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
                emojiPicker.classList.remove('show');
            }
        });
    }

    setupImageUpload(modal) {
        const uploadSection = modal.querySelector('#imageUpload');
        const fileInput = modal.querySelector('#imageInput');
        const progressDiv = modal.querySelector('#uploadProgress');
        const progressBar = modal.querySelector('#progressBar');

        if (!uploadSection || !fileInput) return;

        // Clic sur la zone d'upload
        uploadSection.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag & Drop
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('dragover');
        });

        uploadSection.addEventListener('dragleave', () => {
            uploadSection.classList.remove('dragover');
        });

        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0], progressDiv, progressBar);
            }
        });

        // Sélection de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0], progressDiv, progressBar);
            }
        });

        // Supprimer image existante
        const removeBtn = modal.querySelector('#removeImageBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeCurrentImage();
            });
        }
    }

    async handleImageUpload(file, progressDiv, progressBar) {
        // Validation du fichier
        if (!file.type.startsWith('image/')) {
            this.showNotification('Veuillez sélectionner une image valide', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('L\'image ne doit pas dépasser 5MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            progressDiv.classList.add('show');
            progressBar.style.width = '0%';

            // Simulation de progression
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) {
                    clearInterval(progressInterval);
                    progress = 90;
                }
                progressBar.style.width = progress + '%';
            }, 200);

            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            progressBar.style.width = '100%';

            if (!response.ok) {
                throw new Error('Erreur lors de l\'upload');
            }

            const result = await response.json();
            this.currentImageUrl = result.imageUrl;

            // Afficher la prévisualisation
            this.showImagePreview(result.imageUrl);
            this.showNotification('Image uploadée avec succès !', 'success');

        } catch (error) {
            console.error('Erreur upload:', error);
            this.showNotification('Erreur lors de l\'upload de l\'image', 'error');
        } finally {
            setTimeout(() => {
                progressDiv.classList.remove('show');
                progressBar.style.width = '0%';
            }, 1000);
        }
    }

    showImagePreview(imageUrl) {
        const uploadSection = document.querySelector('#imageUpload');
        const existingPreview = document.querySelector('#imagePreview');

        if (existingPreview) {
            existingPreview.remove();
        }

        const previewHtml = this.createImagePreview(imageUrl);
        uploadSection.insertAdjacentHTML('afterend', previewHtml);

        // Ajouter l'événement de suppression
        const removeBtn = document.querySelector('#removeImageBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeCurrentImage();
            });
        }
    }

    removeCurrentImage() {
        this.currentImageUrl = null;
        const preview = document.querySelector('#imagePreview');
        if (preview) {
            preview.remove();
        }
        this.showNotification('Image supprimée', 'info');
    }

    setupListManagement(modal) {
        // Ingrédients
        const ingredientInput = modal.querySelector('#ingredientInput');
        const addIngredientBtn = modal.querySelector('#addIngredientBtn');

        addIngredientBtn.addEventListener('click', () => {
            this.addIngredient(ingredientInput.value.trim());
            ingredientInput.value = '';
        });

        ingredientInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addIngredient(ingredientInput.value.trim());
                ingredientInput.value = '';
            }
        });

        // Instructions
        const instructionInput = modal.querySelector('#instructionInput');
        const addInstructionBtn = modal.querySelector('#addInstructionBtn');

        addInstructionBtn.addEventListener('click', () => {
            this.addInstruction(instructionInput.value.trim());
            instructionInput.value = '';
        });

        instructionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.addInstruction(instructionInput.value.trim());
                instructionInput.value = '';
            }
        });
    }

    addIngredient(ingredient) {
        if (!ingredient) return;

        this.ingredientsList.push(ingredient);
        this.updateIngredientsList();
    }

    removeIngredient(index) {
        this.ingredientsList.splice(index, 1);
        this.updateIngredientsList();
    }

    updateIngredientsList() {
        const listContainer = document.querySelector('#ingredientsList');
        if (listContainer) {
            listContainer.innerHTML = this.renderIngredientsList();
        }
    }

    addInstruction(instruction) {
        if (!instruction) return;

        this.instructionsList.push(instruction);
        this.updateInstructionsList();
    }

    removeInstruction(index) {
        this.instructionsList.splice(index, 1);
        this.updateInstructionsList();
    }

    updateInstructionsList() {
        const listContainer = document.querySelector('#instructionsList');
        if (listContainer) {
            listContainer.innerHTML = this.renderInstructionsList();
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('#submitBtn');

        // Validation complète
        if (!this.validateForm(form)) {
            this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
            return;
        }

        // Désactiver le bouton et afficher le loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const formData = this.getEnhancedFormData(form);
            const isEdit = form.closest('.modal-content').querySelector('h2').textContent.includes('Modifier');
            const recetteId = isEdit ? this.currentEditId : null;

            const response = await fetch(
                isEdit ? `${this.apiUrl}/${recetteId}` : this.apiUrl,
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                }
            );

            if (!response.ok) {
                throw new Error('Erreur lors de la sauvegarde');
            }

            // Succès
            this.closeEnhancedForm();
            await this.loadRecettes(this.currentTab);
            this.showNotification(
                isEdit ? 'Recette modifiée avec succès !' : 'Recette créée avec succès !',
                'success'
            );

        } catch (error) {
            console.error('Erreur:', error);
            this.showNotification('Erreur lors de la sauvegarde de la recette', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        // Valider les champs requis
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Valider les listes
        if (this.ingredientsList.length === 0) {
            this.showNotification('Veuillez ajouter au moins un ingrédient', 'error');
            isValid = false;
        }

        if (this.instructionsList.length === 0) {
            this.showNotification('Veuillez ajouter au moins une instruction', 'error');
            isValid = false;
        }

        return isValid;
    }

    getEnhancedFormData(form) {
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (key === 'temps_preparation') {
                data[key] = parseInt(value) || 0;
            } else {
                data[key] = value;
            }
        }

        // Ajouter les listes et l'image
        data.ingredients = this.ingredientsList;
        data.instructions = this.instructionsList;
        data.image_url = this.currentImageUrl;

        return data;
    }

    closeEnhancedForm() {
        const modal = document.querySelector('.enhanced-form-modal');
        if (modal) {
            // Animation de fermeture
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';

            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                // S'assurer que le blur est retiré
                this.removeModalEffects();
            }, 300);
        } else {
            // Forcer le nettoyage même si le modal n'est pas trouvé
            this.removeModalEffects();
        }
        this.resetFormData();
    }

    removeModalEffects() {
        // Supprimer tous les overlays de modal restants
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });

        // Rétablir le scroll et supprimer les effets de blur
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');

        // Au cas où il y aurait des styles inline parasites
        const mainContent = document.querySelector('body');
        if (mainContent) {
            mainContent.style.filter = '';
            mainContent.style.pointerEvents = '';
        }
    }

    resetFormData() {
        this.currentImageUrl = null;
        this.ingredientsList = [];
        this.instructionsList = [];
        this.currentEditId = null;
    }

    async editRecipe(id) {
        try {
            const response = await fetch(`${this.apiUrl}/${id}`);
            if (!response.ok) {
                throw new Error('Recette non trouvée');
            }

            const recette = await response.json();
            this.currentEditId = id;

            // Fermer le modal de détail proprement
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                this.closeModal(existingModal);
            }

            // Attendre un peu avant d'ouvrir le nouveau modal
            setTimeout(() => {
                // Ouvrir le formulaire d'édition
                const formModal = this.createEnhancedRecipeForm(recette);
                document.body.appendChild(formModal);
                document.body.classList.add('modal-open');
                this.setupFormEventListeners();
            }, 350);

        } catch (error) {
            console.error('Erreur:', error);
            this.showNotification('Erreur lors du chargement de la recette', 'error');
        }
    }

    async deleteRecipe(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Fermer le modal proprement et recharger les recettes
            const modal = document.querySelector('.modal-overlay');
            if (modal) {
                this.closeModal(modal);
            }

            await this.loadRecettes(this.currentTab);
            this.showNotification('Recette supprimée avec succès !', 'success');
        } catch (error) {
            console.error('Erreur:', error);
            this.showNotification('Erreur lors de la suppression de la recette', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);

        // Suppression automatique
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialisation de l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation de l\'application...');
    app = new RecettesApp();
});

// Fonctions globales pour compatibilité (si nécessaire)
function switchTab(tab) {
    if (app) {
        app.switchTab(tab);
    }
}

function addRecipe() {
    if (app) {
        app.showEnhancedAddRecipeForm();
    }
}

function searchRecipes(searchTerm) {
    if (app) {
        app.searchRecettes(searchTerm);
    }
}