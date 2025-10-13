const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Criar diretórios necessários se não existirem
const groupsDir = path.join(__dirname, 'groups');
const flashcardsDir = path.join(__dirname, 'flashcards');

// Garante que os diretórios existam antes de iniciar o servidor
async function initializeDirs() {
    try {
        await fs.mkdir(groupsDir, { recursive: true });
        await fs.mkdir(flashcardsDir, { recursive: true });
        console.log('Diretórios inicializados com sucesso');
    } catch (error) {
        console.error('Erro ao criar diretórios:', error);
    }
}

// Inicializa os diretórios antes de configurar as rotas
initializeDirs();

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

// Rota para editar grupo existente
app.put('/groups/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = req.body;
        
        if (!group || !groupId) {
            return res.status(400).json({ error: 'Dados do grupo inválidos' });
        }

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
        const id = req.params.id;
        
        // Search for the flashcard in all group directories
        const groupDirs = await fs.readdir(flashcardsDir);
        for (const groupDir of groupDirs) {
            const groupPath = path.join(flashcardsDir, groupDir);
            const stats = await fs.stat(groupPath);
            if (!stats.isDirectory()) continue;
            
            const flashcardPath = path.join(groupPath, `${id}.json`);
            try {
                const content = await fs.readFile(flashcardPath, 'utf-8');
                return res.json(JSON.parse(content));
            } catch (e) {
                // Continue searching if not found in this group
                continue;
            }
        }
        // If we get here, the flashcard wasn't found in any group
        throw new Error('Flashcard not found');
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

// Rota para editar flashcard existente
app.put('/groups/:groupId/flashcards/:flashcardId', async (req, res) => {
    try {
        const { groupId, flashcardId } = req.params;
        const flashcard = req.body;
        await fs.writeFile(
            path.join(__dirname, 'flashcards', groupId, `${flashcardId}.json`),
            JSON.stringify(flashcard, null, 2)
        );
        res.json(flashcard);
    } catch (error) {
        console.error('Erro ao editar flashcard:', error);
        res.status(500).json({ error: 'Erro ao editar flashcard' });
    }
});

// Rota para excluir grupo
app.delete('/groups/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        // Excluir arquivo do grupo
        await fs.unlink(path.join(__dirname, 'groups', `${groupId}.json`));
        
        // Excluir pasta de flashcards do grupo
        const flashcardsDir = path.join(__dirname, 'flashcards', groupId);
        try {
            const files = await fs.readdir(flashcardsDir);
            // Excluir todos os flashcards do grupo
            for (const file of files) {
                await fs.unlink(path.join(flashcardsDir, file));
            }
            // Excluir o diretório vazio
            await fs.rmdir(flashcardsDir);
        } catch (err) {
            console.error('Erro ao excluir flashcards:', err);
            // Ignora erro se o diretório não existir
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir grupo:', error);
        res.status(500).json({ error: 'Erro ao excluir grupo' });
    }
});

// Rota para excluir flashcard
app.delete('/groups/:groupId/flashcards/:flashcardId', async (req, res) => {
    try {
        const { groupId, flashcardId } = req.params;
        await fs.unlink(path.join(__dirname, 'flashcards', groupId, `${flashcardId}.json`));
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir flashcard:', error);
        res.status(500).json({ error: 'Erro ao excluir flashcard' });
    }
});

// Verifica se a porta está disponível antes de iniciar o servidor
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`A porta ${PORT} já está em uso. Tente encerrar outros processos ou usar uma porta diferente.`);
    } else {
        console.error('Erro ao iniciar o servidor:', error);
    }
    process.exit(1);
});