let currentTab = 'all';
let allRecipes = document.querySelectorAll('.recipe-card');

function switchTab(tab) {
    currentTab = tab;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Filter recipes
    filterRecipes();
}

function filterRecipes() {
    const searchTerm = document.querySelector('.search-bar').value.toLowerCase();

    allRecipes.forEach(card => {
        const category = card.dataset.category;
        const title = card.querySelector('.recipe-title').textContent.toLowerCase();
        const description = card.querySelector('.recipe-description').textContent.toLowerCase();

        const matchesTab = currentTab === 'all' || category === currentTab;
        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);

        if (matchesTab && matchesSearch) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.5s ease forwards';
        } else {
            card.style.display = 'none';
        }
    });

    // Show empty state if no recipes match
    checkEmptyState();
}

function searchRecipes(searchTerm) {
    filterRecipes();
}

function checkEmptyState() {
    const visibleRecipes = Array.from(allRecipes).filter(card =>
        card.style.display !== 'none'
    );

    const grid = document.getElementById('recipesGrid');
    let emptyState = document.querySelector('.empty-state');

    if (visibleRecipes.length === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                        <div class="empty-icon">🔍</div>
                        <h3>Aucune recette trouvée</h3>
                        <p>Essayez de modifier vos critères de recherche ou ajoutez de nouvelles recettes.</p>
                    `;
            grid.appendChild(emptyState);
        }
    } else {
        if (emptyState) {
            emptyState.remove();
        }
    }
}

function addRecipe() {
    alert('Fonctionnalité à implémenter : Formulaire d\'ajout de recette');
}

// Add click events to recipe cards
allRecipes.forEach(card => {
    card.addEventListener('click', function () {
        const title = this.querySelector('.recipe-title').textContent;
        alert(`Ouverture de la recette : ${title}\n(Fonctionnalité à implémenter)`);
    });
});