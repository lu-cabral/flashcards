console.log('Arquivo app.js carregado');

class FlashcardManager {
    constructor() {
        console.log('Inicializando FlashcardManager');
        this.groups = [];
        this.flashcards = [];
        this.allFlashcards = []; // Todos os flashcards de todos os grupos
        this.currentGroup = null;
        this.currentFlashcard = null;
        this.editingGroup = null;
        this.editingFlashcard = null;
        this.currentFilter = 'all';
        this.filteredFlashcards = [];
        this.initializeElements();
        this.bindEvents();
        this.loadGroups();
    }

    initializeElements() {
        console.log('Inicializando elementos');
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
        this.addReviewDateBtn = document.getElementById('addReviewDate');
        
        // Containers
        this.groupsList = document.getElementById('groupsList');
        this.flashcardsList = document.getElementById('flashcardsList');
        this.flashcardDisplay = document.getElementById('flashcardDisplay');
        
        // Outros elementos
        this.currentGroupName = document.getElementById('currentGroupName');
        this.reviewDatesContainer = document.getElementById('reviewDatesContainer');
    }

    bindEvents() {
        console.log('Configurando eventos');
        // Eventos dos modais
        console.log('Botão addFlashcard:', this.addFlashcardBtn);
        console.log('Botão addGroup:', this.addGroupBtn);
        this.addFlashcardBtn?.addEventListener('click', () => this.openModal('flashcard'));
        this.addGroupBtn?.addEventListener('click', () => this.openModal('group'));
        this.cancelFlashcardBtn?.addEventListener('click', () => this.closeModal('flashcard'));
        this.cancelGroupBtn?.addEventListener('click', () => this.closeModal('group'));
        this.backToGroupsBtn?.addEventListener('click', () => this.showGroups());
        
        // Eventos dos formulários
        this.flashcardForm?.addEventListener('submit', (e) => this.handleFlashcardSubmit(e));
        this.groupForm?.addEventListener('submit', (e) => this.handleGroupSubmit(e));

        // Eventos dos filtros
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', () => {
                console.log('Botão de filtro clicado:', button.dataset.filter);
                document.querySelectorAll('.filter-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.currentFilter = button.dataset.filter;
                
                // Atualizar tanto a lista de grupos quanto os flashcards
                this.updateGroupsList();
                this.filterFlashcards();
                
                console.log('Filtro aplicado:', this.currentFilter);
            });
        });
        
        // Eventos do botão de data de revisão
        if (this.addReviewDateBtn) {
            this.addReviewDateBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'date';
                input.className = 'review-date-input';
                this.reviewDatesContainer.appendChild(input);
            });
        }
    }

    async loadGroups() {
        console.log('Carregando grupos');
        try {
            const response = await fetch('/groups');
            console.log('Resposta do servidor:', response);
            if (!response.ok) {
                throw new Error('Erro ao carregar grupos do servidor');
            }
            const groupsData = await response.json();
            console.log('Grupos carregados:', groupsData);
            
            if (Array.isArray(groupsData)) {
                this.groups = groupsData;
                console.log('Grupos atribuídos:', this.groups);
                
                // Carrega os flashcards de todos os grupos
                this.allFlashcards = [];
                for (const group of this.groups) {
                    console.log(`Carregando flashcards do grupo ${group.id}`);
                    try {
                        const groupFlashcards = await this.loadGroupFlashcards(group.id);
                        console.log(`Flashcards carregados do grupo ${group.id}:`, groupFlashcards);
                        this.allFlashcards = [...this.allFlashcards, ...groupFlashcards];
                    } catch (err) {
                        console.error(`Erro ao carregar flashcards do grupo ${group.id}:`, err);
                    }
                }
                console.log('Total de flashcards carregados:', this.allFlashcards.length);
                
                // Primeiro atualiza a lista de grupos
                this.updateGroupsList();
                // Depois aplica o filtro aos flashcards
                this.filterFlashcards();
            } else {
                console.error('Resposta do servidor não é um array:', groupsData);
            }
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
        }
    }

    async loadGroupFlashcards(groupId) {
        console.log(`Iniciando carregamento de flashcards do grupo ${groupId}`);
        try {
            const response = await fetch(`/groups/${groupId}/flashcards`);
            console.log(`Resposta do servidor para grupo ${groupId}:`, response);
            if (!response.ok) {
                throw new Error(`Erro ao carregar flashcards do grupo ${groupId}`);
            }
            const files = await response.json();
            console.log(`Arquivos de flashcards do grupo ${groupId}:`, files);
            
            const flashcards = [];
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                const flashcardId = file.replace('.json', '');
                console.log(`Carregando flashcard ${flashcardId}`);
                const flashcardResponse = await fetch(`/flashcards/${flashcardId}`);
                if (!flashcardResponse.ok) {
                    console.error(`Erro ao carregar flashcard ${flashcardId}`);
                    continue;
                }
                const flashcard = await flashcardResponse.json();
                flashcard.groupId = groupId; // Adiciona o ID do grupo ao flashcard
                flashcards.push(flashcard);
            }
            
            console.log(`Flashcards carregados para o grupo ${groupId}:`, flashcards);
            return flashcards;
        } catch (error) {
            console.error(`Erro ao carregar flashcards do grupo ${groupId}:`, error);
            return [];
        }
    }

    async filterGroups() {
        if (this.currentGroupFilter === 'all') {
            this.filteredGroups = this.groups;
        } else {
            this.filteredGroups = this.groups.filter(group => {
                const flashcards = this.groupFlashcardsCache.get(group.id) || [];
                const today = new Date();
                const todayStr = this.normalizeDate(today);
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                return flashcards.some(flashcard => {
                    if (!flashcard.reviewDates || !flashcard.reviewDates.length) return false;

                    const dates = flashcard.reviewDates.map(d => this.normalizeDate(d)).sort();

                    switch (this.currentGroupFilter) {
                        case 'today':
                            return dates.some(date => date === todayStr);
                        case 'week':
                            return dates.some(date => 
                                date >= this.normalizeDate(weekStart) && 
                                date <= this.normalizeDate(weekEnd)
                            );
                        case 'month':
                            return dates.some(date => 
                                date >= this.normalizeDate(monthStart) && 
                                date <= this.normalizeDate(monthEnd)
                            );
                        case 'overdue':
                            return dates.some(date => {
                                const isOld = date < todayStr;
                                const hasFutureDate = dates.some(d => d >= todayStr);
                                return isOld && !hasFutureDate;
                            });
                        default:
                            return false;
                    }
                });
            });
        }

        this.updateGroupsList();
        this.updateGroupFilterCounts();
    }

    normalizeDate(date) {
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    updateGroupFilterCounts() {
        const counts = {
            all: this.groups.length,
            today: 0,
            week: 0,
            month: 0,
            overdue: 0
        };

        this.groups.forEach(group => {
            const flashcards = this.groupFlashcardsCache.get(group.id) || [];
            if (this.hasFlashcardsForFilter(flashcards, 'today')) counts.today++;
            if (this.hasFlashcardsForFilter(flashcards, 'week')) counts.week++;
            if (this.hasFlashcardsForFilter(flashcards, 'month')) counts.month++;
            if (this.hasFlashcardsForFilter(flashcards, 'overdue')) counts.overdue++;
        });

        document.querySelectorAll('#groupFilters .filter-button').forEach(button => {
            const countElement = button.querySelector('.count');
            if (countElement) {
                countElement.textContent = counts[button.dataset.filter] || 0;
            }
        });
    }

    hasFlashcardsForFilter(flashcards, filter) {
        const today = new Date();
        const todayStr = this.normalizeDate(today);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return flashcards.some(flashcard => {
            if (!flashcard.reviewDates || !flashcard.reviewDates.length) return false;
            const dates = flashcard.reviewDates.map(d => this.normalizeDate(d)).sort();

            switch (filter) {
                case 'today':
                    return dates.some(date => date === todayStr);
                case 'week':
                    return dates.some(date => 
                        date >= this.normalizeDate(weekStart) && 
                        date <= this.normalizeDate(weekEnd)
                    );
                case 'month':
                    return dates.some(date => 
                        date >= this.normalizeDate(monthStart) && 
                        date <= this.normalizeDate(monthEnd)
                    );
                case 'overdue':
                    return dates.some(date => {
                        const isOld = date < todayStr;
                        const hasFutureDate = dates.some(d => d >= todayStr);
                        return isOld && !hasFutureDate;
                    });
                default:
                    return false;
            }
        });
    }

    // Método removido pois estava duplicado

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
            this.editingFlashcard = null;
        } else {
            this.groupModal.classList.remove('active');
            this.groupForm.reset();
            this.editingGroup = null;
        }
    }

    async handleGroupSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('groupName').value;
        const description = document.getElementById('groupDescription').value;
        const colorInput = document.getElementById('groupColor');
        const color = colorInput && colorInput.value ? colorInput.value : '#4a90e2';

        let group, url, method;
        
        if (this.editingGroup) {
            const id = document.getElementById('groupId').value;
            group = {
                ...this.editingGroup,
                name,
                description,
                color,
                id
            };
            url = `/groups/${id}`;
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
            console.log('Salvando grupo:', group);
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(group)
            });
            
            if (response.ok) {
                const savedGroup = await response.json();
                console.log('Grupo salvo com sucesso:', savedGroup);
                
                if (this.editingGroup) {
                    // Atualiza o grupo existente
                    const idx = this.groups.findIndex(g => g.id === savedGroup.id);
                    if (idx !== -1) {
                        this.groups[idx] = savedGroup;
                    }
                } else {
                    // Adiciona o novo grupo
                    this.groups.push(savedGroup);
                }
                
                // Recarrega todos os grupos para garantir sincronização
                await this.loadGroups();
                this.closeModal('group');
            } else {
                const errorData = await response.json();
                console.error('Erro ao salvar grupo:', errorData);
                alert('Erro ao salvar grupo: ' + (errorData.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar grupo:', error);
            alert('Erro ao salvar grupo.');
        }
    }

    async handleFlashcardSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('flashcardTitle').value;
        const front = document.getElementById('flashcardFront').value;
        const back = document.getElementById('flashcardBack').value;
        
        const reviewDateInputs = document.querySelectorAll('.review-date-input');
        const reviewDates = Array.from(reviewDateInputs)
            .map(input => input.value)
            .filter(date => date && date.trim() !== '');
        
        console.log('Salvando datas:', reviewDates);

        let flashcard, url, method;
        
        if (this.editingFlashcard) {
            flashcard = {
                ...this.editingFlashcard,
                title,
                front,
                back,
                reviewDates
            };
            url = `/groups/${this.currentGroup.id}/flashcards/${flashcard.id}`;
            method = 'PUT';
        } else {
            flashcard = {
                id: Date.now().toString(),
                title,
                front,
                back,
                groupId: this.currentGroup.id,
                reviewDates,
                dateCreated: new Date().toISOString()
            };
            url = `/groups/${this.currentGroup.id}/flashcards`;
            method = 'POST';
        }

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flashcard)
            });
            
            if (response.ok) {
                if (this.editingFlashcard) {
                    const idx = this.flashcards.findIndex(f => f.id === flashcard.id);
                    if (idx !== -1) {
                        this.flashcards[idx] = flashcard;
                    }
                    // Atualizar também no array global
                    const globalIdx = this.allFlashcards.findIndex(f => f.id === flashcard.id);
                    if (globalIdx !== -1) {
                        this.allFlashcards[globalIdx] = flashcard;
                    }
                } else {
                    this.flashcards.push(flashcard);
                    // Adicionar também ao array global
                    this.allFlashcards.push(flashcard);
                    // Atualizar contagem do grupo
                    const groupIndex = this.groups.findIndex(g => g.id === this.currentGroup.id);
                    if (groupIndex !== -1) {
                        this.groups[groupIndex].cardCount = (this.groups[groupIndex].cardCount || 0) + 1;
                        this.updateGroupsList();
                    }
                }
                this.updateFlashcardsList();
                this.closeModal('flashcard');
            } else {
                alert('Erro ao salvar flashcard.');
            }
        } catch (error) {
            console.error('Erro ao salvar flashcard:', error);
            alert('Erro ao salvar flashcard.');
        }
    }

    openEditGroupModal(group) {
        this.editingGroup = group;
        this.groupModal.classList.add('active');
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupDescription').value = group.description || '';
        const colorInput = document.getElementById('groupColor');
        colorInput.value = group.color || '#4a90e2';
        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('groupId').value = group.id;
    }

    openEditFlashcardModal(flashcard) {
        this.editingFlashcard = flashcard;
        this.flashcardModal.classList.add('active');
        document.getElementById('flashcardTitle').value = flashcard.title;
        document.getElementById('flashcardFront').value = flashcard.front;
        document.getElementById('flashcardBack').value = flashcard.back;

        const container = document.getElementById('reviewDatesContainer');
        container.innerHTML = '';

        const createDateInput = (date = '') => {
            const wrapper = document.createElement('div');
            wrapper.className = 'review-date-wrapper';

            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'review-date-input';
            input.value = date;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-date-btn';
            removeBtn.title = 'Remover data';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => {
                wrapper.remove();
                if (container.children.length === 0) {
                    // Se removeu o último, adiciona um campo vazio
                    container.appendChild(createDateInput());
                }
            });

            wrapper.appendChild(input);
            wrapper.appendChild(removeBtn);
            return wrapper;
        };

        if (flashcard.reviewDates && flashcard.reviewDates.length) {
            flashcard.reviewDates.forEach(date => {
                container.appendChild(createDateInput(date));
            });
        } else {
            container.appendChild(createDateInput());
        }
    }

    updateGroupsList() {
        console.log('Atualizando lista de grupos');
        if (!this.groupsList) {
            console.error('Elemento groupsList não encontrado');
            return;
        }
        this.groupsList.innerHTML = '';
        console.log('Grupos disponíveis:', this.groups);
        
        // Adiciona mensagem se não houver grupos
        if (!this.groups || this.groups.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-folder-open"></i>
                <h3>Nenhum grupo encontrado</h3>
                <p>Clique em "Novo Grupo" para começar</p>
            `;
            this.groupsList.appendChild(emptyMessage);
            return;
        }
        
        // Lista todos os grupos
        this.groups.forEach(group => {
            console.log('Renderizando grupo:', group);
            // Conta os cartões do grupo
            const groupFlashcards = this.allFlashcards.filter(f => f.groupId === group.id);
            console.log(`Contando flashcards para grupo ${group.id}:`, {
                total: groupFlashcards.length,
                filtro: this.currentFilter,
                flashcardsDoGrupo: groupFlashcards
            });
            
            // Filtra os flashcards do grupo de acordo com o filtro atual
            const filteredCount = (() => {
                console.log('Calculando contagem filtrada para o grupo:', {
                    grupoId: group.id,
                    filtroAtual: this.currentFilter
                });
                
                if (this.currentFilter === 'all') {
                    console.log('Retornando contagem total:', groupFlashcards.length);
                    return groupFlashcards.length;
                }
                
                const today = new Date();
                const todayStr = this.normalizeDate(today);
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                console.log('Datas de referência:', {
                    hoje: todayStr,
                    inicioSemana: this.normalizeDate(weekStart),
                    fimSemana: this.normalizeDate(weekEnd),
                    inicioMes: this.normalizeDate(monthStart),
                    fimMes: this.normalizeDate(monthEnd)
                });

                const filteredCards = groupFlashcards.filter(flashcard => {
                    if (!flashcard.reviewDates || !flashcard.reviewDates.length) {
                        console.log(`Flashcard ${flashcard.id} sem datas de revisão`);
                        return false;
                    }
                    
                    const dates = flashcard.reviewDates.map(d => this.normalizeDate(d)).sort();
                    console.log(`Datas de revisão do flashcard ${flashcard.id}:`, dates);
                    
                    let matches = false;
                    switch (this.currentFilter) {
                        case 'today':
                            matches = dates.some(date => date === todayStr);
                            console.log(`Flashcard ${flashcard.id} para hoje:`, matches);
                            break;
                        case 'week':
                            matches = dates.some(date => 
                                date >= this.normalizeDate(weekStart) && 
                                date <= this.normalizeDate(weekEnd)
                            );
                            console.log(`Flashcard ${flashcard.id} para esta semana:`, matches);
                            break;
                        case 'month':
                            matches = dates.some(date => 
                                date >= this.normalizeDate(monthStart) && 
                                date <= this.normalizeDate(monthEnd)
                            );
                            console.log(`Flashcard ${flashcard.id} para este mês:`, matches);
                            break;
                        case 'overdue':
                            matches = dates.some(date => {
                                const isOld = date < todayStr;
                                const hasFutureDate = dates.some(d => d >= todayStr);
                                return isOld && !hasFutureDate;
                            });
                            console.log(`Flashcard ${flashcard.id} vencido:`, matches);
                            break;
                    }
                    return matches;
                });
                
                console.log(`Contagem final para grupo ${group.id}:`, filteredCards.length);
                return filteredCards.length;
            })();
                
            // Cria o elemento do grupo
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.style.borderTop = `8px solid ${group.color || '#4a90e2'}`;
            groupItem.innerHTML = `
                <i class="fas fa-folder" style="color:${group.color || '#4a90e2'}"></i>
                <h3>${group.name}</h3>
                ${group.description ? `<p>${group.description}</p>` : ''}
                <span class="card-count">${filteredCount} cards${this.currentFilter !== 'all' ? ' filtrados' : ''}</span>
                <div class="group-actions">
                    <button class="edit-group-btn" title="Editar Grupo"><i class="fas fa-edit"></i></button>
                    <button class="delete-group-btn" title="Excluir Grupo"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;

            // Adiciona eventos ao grupo
            groupItem.addEventListener('click', (e) => {
                // Evita abrir o grupo ao clicar nos botões
                if (e.target.closest('.edit-group-btn') || e.target.closest('.delete-group-btn')) {
                    return;
                }
                this.openGroup(group);
            });

            // Adiciona eventos aos botões
            groupItem.querySelector('.edit-group-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditGroupModal(group);
            });

            groupItem.querySelector('.delete-group-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir este grupo? Todos os flashcards serão removidos.')) {
                    this.deleteGroup(group.id);
                }
            });

            this.groupsList.appendChild(groupItem);
        });
    }

    updateFlashcardsList() {
        if (!this.flashcardsList) return;
        this.flashcardsList.innerHTML = '';
        
        const cardsToShow = this.currentFilter === 'all' ? 
            (this.currentGroup ? this.flashcards : []) : 
            (this.currentGroup ? this.filteredFlashcards.filter(f => f.groupId === this.currentGroup.id) : []);
        cardsToShow.forEach(flashcard => {
            const flashcardElement = document.createElement('div');
            flashcardElement.className = 'flashcard-item';
            
            const color = this.currentGroup && this.currentGroup.color ? this.currentGroup.color : '#4a90e2';
            flashcardElement.style.borderTop = `8px solid ${color}`;
            
            flashcardElement.innerHTML = `
                <div class="flashcard-front">
                    <div class="flashcard-actions">
                        <button class="edit-flashcard-btn" title="Editar Flashcard"><i class="fas fa-edit"></i></button>
                        <button class="delete-flashcard-btn" title="Excluir Flashcard"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="flashcard-content">${flashcard.front}</div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-content">${flashcard.back}</div>
                </div>
            `;

            flashcardElement.addEventListener('click', (e) => {
                if (!e.target.closest('.flashcard-actions')) {
                    flashcardElement.classList.toggle('flipped');
                }
            });

            flashcardElement.querySelector('.edit-flashcard-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditFlashcardModal(flashcard);
            });

            flashcardElement.querySelector('.delete-flashcard-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir este flashcard?')) {
                    this.deleteFlashcard(flashcard.id);
                }
            });

            this.flashcardsList.appendChild(flashcardElement);
        });
    }

    openGroup(group) {
        this.currentGroup = group;
        this.groupsList.style.display = 'none';
        document.getElementById('flashcardsContainer').style.display = 'block';
        this.flashcardDisplay.style.display = 'none';
        this.addGroupBtn.style.display = 'none';
        this.addFlashcardBtn.style.display = 'flex';
        this.backToGroupsBtn.style.display = 'flex';
        this.currentGroupName.textContent = group.name;
        
        console.log('Abrindo grupo:', group);
        console.log('Mantendo filtro atual:', this.currentFilter);
        
        // Filtrar flashcards do grupo atual do conjunto global
        this.flashcards = this.allFlashcards.filter(f => f.groupId === group.id);
        console.log('Flashcards do grupo:', this.flashcards);
        
        // Garantir que o botão do filtro atual permaneça ativo
        document.querySelectorAll('.filter-button').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === this.currentFilter);
        });
        
        // Atualizar a lista de flashcards
        this.filterFlashcards();
        
        // Garantir que os filtros estejam visíveis
        document.getElementById('filters').style.display = 'flex';
    }

    showGroups() {
        this.currentGroup = null;
        if (this.groupsList) {
            this.groupsList.style.display = 'grid';
        }
        const flashcardsContainer = document.getElementById('flashcardsContainer');
        if (flashcardsContainer) {
            flashcardsContainer.style.display = 'none';
        }
        if (this.flashcardDisplay) {
            this.flashcardDisplay.style.display = 'none';
        }
        if (this.addGroupBtn) {
            this.addGroupBtn.style.display = 'flex';
        }
        if (this.addFlashcardBtn) {
            this.addFlashcardBtn.style.display = 'none';
        }
        if (this.backToGroupsBtn) {
            this.backToGroupsBtn.style.display = 'none';
        }
        if (this.currentGroupName) {
            this.currentGroupName.textContent = '';
        }
        // Atualiza a lista de grupos ao voltar
        this.updateGroupsList();
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

    filterFlashcards() {
        console.log('Método filterFlashcards chamado');
        console.log('Grupo atual:', this.currentGroup);
        console.log('Filtro atual:', this.currentFilter);
        console.log('Todos os flashcards:', this.allFlashcards);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        console.log('Data atual (today):', today.toLocaleDateString());
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Função auxiliar para normalizar uma data para comparação
        const normalizeDate = (date) => {
            // Se a data já estiver no formato YYYY-MM-DD, retorna ela mesma
            if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return date;
            }
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Função auxiliar para verificar se uma data está dentro de um intervalo
        const isDateInRange = (date, start, end) => {
            const normalizedDate = normalizeDate(date);
            return normalizedDate >= normalizeDate(start) && normalizedDate <= normalizeDate(end);
        };

            // Adiciona um log para depuração
        console.log('Iniciando filtragem de flashcards');
        
        const flashcardsToFilter = this.currentGroup ? this.flashcards : [];
        this.filteredFlashcards = flashcardsToFilter.filter(flashcard => {
            if (!flashcard.reviewDates || !flashcard.reviewDates.length) {
                console.log('Flashcard sem datas de revisão:', flashcard);
                return this.currentFilter === 'all';
            }

            // Converte todas as datas de string para objetos Date normalizados
            console.log('ReviewDates originais:', flashcard.reviewDates);
            const dates = flashcard.reviewDates
                .map(d => {
                    const normalized = normalizeDate(d);
                    console.log(`Normalizando data ${d} para ${normalized}`);
                    return normalized;
                })
                .sort();
            
            console.log('Datas normalizadas:', dates);
            console.log('Filtro atual:', this.currentFilter);
            
            switch(this.currentFilter) {
                case 'all':
                    return true;
                case 'today':
                    console.log('Verificando cartões para hoje');
                    const todayStr = normalizeDate(today);
                    console.log('Data de hoje normalizada:', todayStr);
                    const isToday = dates.some(date => {
                        const normalizedDate = normalizeDate(date);
                        console.log('Comparando data:', normalizedDate, 'com hoje:', todayStr);
                        const isMatch = normalizedDate === todayStr;
                        console.log('É igual?', isMatch);
                        return isMatch;
                    });
                    return isToday;
                case 'week':
                    return dates.some(date => date >= normalizeDate(weekStart) && date <= normalizeDate(weekEnd));
                case 'month':
                    return dates.some(date => date >= normalizeDate(monthStart) && date <= normalizeDate(monthEnd));
                case 'overdue':
                    console.log('Verificando cartões vencidos');
                    const normalizedToday = normalizeDate(today);
                    return dates.some(date => {
                        console.log('Verificando data:', date, 'contra hoje:', normalizedToday);
                        // Um cartão está vencido se sua data de revisão é anterior à data atual
                        // e não tem uma data de revisão futura
                        const isOld = date < normalizedToday;
                        const hasFutureDate = dates.some(d => d >= normalizedToday);
                        if (isOld && !hasFutureDate) {
                            console.log('Cartão vencido encontrado. Data:', date);
                        }
                        return isOld && !hasFutureDate;
                    });
                default:
                    return true;
            }
        });

        // Atualiza os contadores
        const counts = {
            all: this.allFlashcards.length,
            today: 0,
            week: 0,
            month: 0,
            overdue: 0
        };

        this.allFlashcards.forEach(flashcard => {
            if (!flashcard.reviewDates || !flashcard.reviewDates.length) return;

            const dates = flashcard.reviewDates.map(d => normalizeDate(d));
            const todayStr = normalizeDate(today);
            const weekStartStr = normalizeDate(weekStart);
            const weekEndStr = normalizeDate(weekEnd);
            const monthStartStr = normalizeDate(monthStart);
            const monthEndStr = normalizeDate(monthEnd);
            
            // Um flashcard pode contar em múltiplas categorias
            if (dates.some(date => date === todayStr)) {
                counts.today++;
            }
            
            if (dates.some(date => date >= weekStartStr && date <= weekEndStr)) {
                counts.week++;
            }
            
            if (dates.some(date => date >= monthStartStr && date <= monthEndStr)) {
                counts.month++;
            }
            
            if (dates.some(date => date < todayStr)) {
                counts.overdue++;
            }
        });

        document.querySelectorAll('.filter-button').forEach(button => {
            const countElement = button.querySelector('.count');
            if (countElement) {
                countElement.textContent = counts[button.dataset.filter] || 0;
            }
        });

        this.updateFlashcardsList();
    }

    async deleteGroup(groupId) {
        try {
            const response = await fetch(`/groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.groups = this.groups.filter(g => g.id !== groupId);
                this.updateGroupsList();
                if (this.currentGroup && this.currentGroup.id === groupId) {
                    this.flashcardsList.innerHTML = '';
                    this.currentGroup = null;
                    this.showGroups();
                }
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao excluir grupo.');
            }
        } catch (error) {
            console.error('Erro ao excluir grupo:', error);
            alert('Erro ao excluir grupo.');
        }
    }

    async deleteFlashcard(flashcardId) {
        if (!this.currentGroup) {
            alert('Nenhum grupo selecionado.');
            return;
        }

        console.log('Excluindo flashcard:', flashcardId, 'do grupo:', this.currentGroup.id);

        try {
            const response = await fetch(`/groups/${this.currentGroup.id}/flashcards/${flashcardId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.flashcards = this.flashcards.filter(f => f.id !== flashcardId);
                // Também remover do array global de flashcards
                this.allFlashcards = this.allFlashcards.filter(f => f.id !== flashcardId);
                this.updateFlashcardsList();
                const groupIndex = this.groups.findIndex(g => g.id === this.currentGroup.id);
                if (groupIndex !== -1) {
                    this.groups[groupIndex].cardCount = (this.groups[groupIndex].cardCount || 1) - 1;
                    this.updateGroupsList();
                }
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao excluir flashcard.');
            }
        } catch (error) {
            console.error('Erro ao excluir flashcard:', error);
            alert('Erro ao excluir flashcard.');
        }
    }
}

// Inicializar o gerenciador de flashcards quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardManager();
});