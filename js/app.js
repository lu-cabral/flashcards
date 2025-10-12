class FlashcardManager {
    openEditGroupModal(group) {
        this.editingGroup = group;
        this.groupModal.classList.add('active');
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupDescription').value = group.description || '';
        document.getElementById('groupColor').value = group.color || '#4a90e2';
    }
    constructor() {
        this.groups = [];
        this.flashcards = [];
        this.currentGroup = null;
        this.currentFlashcard = null;
        this.initializeElements();
        this.bindEvents();
        this.loadGroups();
    }

    initializeElements() {
        // Modais
        this.flashcardModal = document.getElementById('flashcardModal');
        this.groupModal = document.getElementById('groupModal');
        
        // Formulários
        this.flashcardForm = document.getElementById('flashcardForm');
        this.groupForm = document.getElementById('groupForm');
        
        // Botões
        this.addFlashcardBtn = document.getElementById('addFlashcard');
        this.addGroupBtn = document.getElementById('addGroup');
        this.cancelFlashcardBtn = document.getElementById('cancelButton');
        this.cancelGroupBtn = document.getElementById('cancelGroupButton');
        this.backToGroupsBtn = document.getElementById('backToGroups');
        
        // Containers
        this.groupsList = document.getElementById('groupsList');
        this.flashcardsList = document.getElementById('flashcardsList');
        this.flashcardDisplay = document.getElementById('flashcardDisplay');
        
        // Outros elementos
        this.currentGroupName = document.getElementById('currentGroupName');
    }

    bindEvents() {
        this.addFlashcardBtn.addEventListener('click', () => this.openModal('flashcard'));
        this.addGroupBtn.addEventListener('click', () => this.openModal('group'));
        this.cancelFlashcardBtn.addEventListener('click', () => this.closeModal('flashcard'));
        this.cancelGroupBtn.addEventListener('click', () => this.closeModal('group'));
        this.backToGroupsBtn.addEventListener('click', () => this.showGroups());
        
        this.flashcardForm.addEventListener('submit', (e) => this.handleFlashcardSubmit(e));
        this.groupForm.addEventListener('submit', (e) => this.handleGroupSubmit(e));
    }

    async loadGroups() {
        try {
            const response = await fetch('/groups');
            this.groups = await response.json();
            this.updateGroupsList();
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
        }
    }

    async loadGroupFlashcards(groupId) {
        try {
            const response = await fetch(`/groups/${groupId}/flashcards`);
            const files = await response.json();
            
            this.flashcards = [];
            for (const file of files) {
                const flashcardResponse = await fetch(`/flashcards/${groupId}/${file}`);
                const flashcard = await flashcardResponse.json();
                this.flashcards.push(flashcard);
            }
            
            this.updateFlashcardsList();
        } catch (error) {
            console.error('Erro ao carregar flashcards:', error);
        }
    }

    openModal(type) {
        if (type === 'flashcard') {
            this.flashcardModal.classList.add('active');
        } else {
            this.groupModal.classList.add('active');
        }
    }

    closeModal(type) {
        if (type === 'flashcard') {
            this.flashcardModal.classList.remove('active');
            this.flashcardForm.reset();
        } else {
            this.groupModal.classList.remove('active');
            this.groupForm.reset();
        }
    }

    async handleGroupSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('groupName').value;
        const description = document.getElementById('groupDescription').value;
        const color = document.getElementById('groupColor').value;
        let group;
        let url;
        let method;
        if (this.editingGroup) {
            group = {
                ...this.editingGroup,
                name,
                description,
                color
            };
            url = `/groups/${group.id}`;
            method = 'PUT';
        } else {
            group = {
                name,
                description,
                color,
                dateCreated: new Date().toISOString()
            };
            url = '/groups';
            method = 'POST';
        }
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(group)
            });
            const savedGroup = await response.json();
            if (this.editingGroup) {
                // Atualiza grupo na lista
                const idx = this.groups.findIndex(g => g.id === savedGroup.id);
                if (idx !== -1) this.groups[idx] = savedGroup;
            } else {
                this.groups.push(savedGroup);
            }
            this.updateGroupsList();
            this.closeModal('group');
            this.editingGroup = null;
        } catch (error) {
            console.error('Erro ao salvar grupo:', error);
        }
    }

    async handleFlashcardSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('flashcardTitle').value;
        const front = document.getElementById('flashcardFront').value;
        const back = document.getElementById('flashcardBack').value;
        
        const flashcard = {
            id: Date.now(),
            title,
            front,
            back,
            groupId: this.currentGroup.id,
            dateCreated: new Date().toISOString()
        };

        try {
            const response = await fetch(`/groups/${this.currentGroup.id}/flashcards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flashcard)
            });

            if (response.ok) {
                this.flashcards.push(flashcard);
                this.updateFlashcardsList();
                this.closeModal('flashcard');
            }
        } catch (error) {
            console.error('Erro ao salvar flashcard:', error);
        }
    }

    updateGroupsList() {
        this.groupsList.innerHTML = '';
        
        this.groups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'group-item';
            groupElement.style.borderTop = `8px solid ${group.color || '#4a90e2'}`;
            groupElement.innerHTML = `
                <i class="fas fa-folder" style="color:${group.color || '#4a90e2'}"></i>
                <h3>${group.name}</h3>
                <p>${group.description || 'Sem descrição'}</p>
                <span class="card-count">${group.cardCount || 0} cards</span>
                <button class="edit-group-btn" title="Editar Grupo" style="position:absolute;left:10px;bottom:10px;background:transparent;border:none;cursor:pointer;font-size:14px;color:${group.color || '#4a90e2'};padding:2px 6px;border-radius:6px;"><i class="fas fa-edit"></i></button>
            `;
            groupElement.addEventListener('click', (e) => {
                // Evita abrir o grupo ao clicar no botão de editar
                if (e.target.closest('.edit-group-btn')) return;
                this.openGroup(group);
            });
            groupElement.querySelector('.edit-group-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditGroupModal(group);
            });
            this.groupsList.appendChild(groupElement);
        });
    }

    updateFlashcardsList() {
        this.flashcardsList.innerHTML = '';
        
        this.flashcards.forEach(flashcard => {
            const flashcardElement = document.createElement('div');
            flashcardElement.className = 'flashcard-item';
            // cor do grupo
            const color = this.currentGroup && this.currentGroup.color ? this.currentGroup.color : '#4a90e2';
            flashcardElement.style.borderTop = `8px solid ${color}`;
            flashcardElement.innerHTML = `
                <div class="flashcard-front">
                    <div class="flashcard-title">${flashcard.title}</div>
                    <div class="flashcard-content">${flashcard.front}</div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-title">${flashcard.title}</div>
                    <div class="flashcard-content">${flashcard.back}</div>
                </div>
            `;
            flashcardElement.addEventListener('click', () => {
                flashcardElement.classList.toggle('flipped');
            });
            this.flashcardsList.appendChild(flashcardElement);
        });
    }

    openGroup(group) {
        this.currentGroup = group;
        this.groupsList.style.display = 'none';
        this.flashcardsList.style.display = 'grid';
        this.addGroupBtn.style.display = 'none';
        this.addFlashcardBtn.style.display = 'flex';
        this.backToGroupsBtn.style.display = 'flex';
        this.currentGroupName.textContent = group.name;
        
        this.loadGroupFlashcards(group.id);
    }

    showGroups() {
        this.currentGroup = null;
        this.groupsList.style.display = 'grid';
        this.flashcardsList.style.display = 'none';
        this.flashcardDisplay.style.display = 'none';
        this.addGroupBtn.style.display = 'flex';
        this.addFlashcardBtn.style.display = 'none';
        this.backToGroupsBtn.style.display = 'none';
        this.currentGroupName.textContent = '';
    }

    displayFlashcard(flashcard) {
        this.currentFlashcard = flashcard;
        this.flashcardDisplay.style.display = 'block';
        
        const flashcardElement = document.createElement('div');
        flashcardElement.className = 'flashcard';
        flashcardElement.innerHTML = `
            <div class="flashcard-front">
                <h3>${flashcard.title}</h3>
                <p>${flashcard.front}</p>
            </div>
            <div class="flashcard-back">
                <h3>${flashcard.title}</h3>
                <p>${flashcard.back}</p>
            </div>
        `;
        
        flashcardElement.addEventListener('click', () => {
            flashcardElement.classList.toggle('flipped');
        });

        this.flashcardDisplay.innerHTML = '';
        this.flashcardDisplay.appendChild(flashcardElement);
    }
}

// Inicializar o gerenciador de flashcards quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardManager();
});