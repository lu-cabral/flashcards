// Rota para editar grupo existente
app.put('/groups/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = req.body;
        await fs.writeFile(
            path.join(__dirname, 'groups', `${groupId}.json`),
            JSON.stringify(group, null, 2)
        );
        res.json(group);
    } catch (error) {
        console.error('Erro ao editar grupo:', error);
        res.status(500).json({ error: 'Erro ao editar grupo' });
    }
});
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Criar diretório de grupos se não existir
const groupsDir = path.join(__dirname, 'groups');
fs.mkdir(groupsDir, { recursive: true }).catch(console.error);

// Rota para obter a lista de grupos
app.get('/groups', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'groups'));
        const groups = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(__dirname, 'groups', file), 'utf-8');
                const group = JSON.parse(content);
                const groupPath = path.join(__dirname, 'flashcards', group.id.toString());
                try {
                    const files = await fs.readdir(groupPath);
                    // Filtra apenas arquivos .json para contar corretamente
                    const flashcardFiles = files.filter(f => f.endsWith('.json'));
                    group.cardCount = flashcardFiles.length;
                } catch (err) {
                    group.cardCount = 0;
                }
                groups.push(group);
            }
        }
        
        res.json(groups);
    } catch (error) {
        console.error('Erro ao ler grupos:', error);
        res.status(500).json({ error: 'Erro ao ler grupos' });
    }
});

// Rota para criar um novo grupo
app.post('/groups', async (req, res) => {
    try {
        const group = req.body;
        group.id = Date.now().toString();
        
        await fs.writeFile(
            path.join(__dirname, 'groups', `${group.id}.json`),
            JSON.stringify(group, null, 2)
        );
        
        // Criar diretório para os flashcards do grupo
        await fs.mkdir(path.join(__dirname, 'flashcards', group.id), { recursive: true });
        
        res.json(group);
    } catch (error) {
        console.error('Erro ao criar grupo:', error);
        res.status(500).json({ error: 'Erro ao criar grupo' });
    }
});

// Rota para obter a lista de flashcards de um grupo
app.get('/groups/:groupId/flashcards', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const files = await fs.readdir(path.join(__dirname, 'flashcards', groupId));
        res.json(files);
    } catch (error) {
        console.error('Erro ao ler diretório:', error);
        res.status(500).json({ error: 'Erro ao ler flashcards' });
    }
});

// Rota para obter um flashcard específico
app.get('/flashcards/:id', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'flashcards', req.params.id);
        const content = await fs.readFile(filePath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (error) {
        console.error('Erro ao ler flashcard:', error);
        res.status(404).json({ error: 'Flashcard não encontrado' });
    }
});

// Rota para salvar um novo flashcard em um grupo
app.post('/groups/:groupId/flashcards', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const flashcard = req.body;
        const fileName = `${flashcard.id}.json`;
        await fs.writeFile(
            path.join(__dirname, 'flashcards', groupId, fileName),
            JSON.stringify(flashcard, null, 2)
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar flashcard:', error);
        res.status(500).json({ error: 'Erro ao salvar flashcard' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});