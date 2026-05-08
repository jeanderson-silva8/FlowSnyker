import mongoose from 'mongoose';
import Board from '../models/Board';
import Card from '../models/Card';

/**
 * Cria um board de demonstração completo para um novo usuário.
 * Inclui 4 colunas e cards distribuídos como exemplo de um projeto real.
 */
export async function seedDemoBoard(userId: mongoose.Types.ObjectId): Promise<void> {
  try {
    // IDs das colunas
    const colBacklog = new mongoose.Types.ObjectId().toString();
    const colProgress = new mongoose.Types.ObjectId().toString();
    const colReview = new mongoose.Types.ObjectId().toString();
    const colDone = new mongoose.Types.ObjectId().toString();

    // Criar o Board de demonstração
    const board = await Board.create({
      title: '🚀 Projeto Demo — Meu Primeiro Board',
      owner: userId,
      members: [userId],
      columns: [
        { _id: colBacklog, title: '📋 Tarefas', order: 0 },
        { _id: colProgress, title: '🔨 Em Progresso', order: 1 },
        { _id: colReview, title: '👀 Revisão', order: 2 },
        { _id: colDone, title: '✅ Concluído', order: 3 },
      ],
    });

    // Cards de demonstração distribuídos nas colunas
    const demoCards = [
      // === BACKLOG ===
      {
        boardId: board._id,
        columnId: colBacklog,
        title: 'Implementar modo escuro',
        description: 'Adicionar toggle de tema claro/escuro no header. Usar CSS variables para trocar as cores globalmente.',
        labels: [
          { text: 'UI/UX', color: '#6C5CE7' },
          { text: 'Feature', color: '#00B894' },
        ],
        assignees: [userId],
        priority: 'medium' as const,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias
        order: 0,
      },
      {
        boardId: board._id,
        columnId: colBacklog,
        title: 'Integrar notificações push',
        description: 'Configurar Web Push API para notificar usuários sobre atualizações nos boards em tempo real.',
        labels: [
          { text: 'Backend', color: '#E17055' },
          { text: 'Feature', color: '#00B894' },
        ],
        assignees: [],
        priority: 'low' as const,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        order: 1,
      },
      {
        boardId: board._id,
        columnId: colBacklog,
        title: 'Adicionar filtro de cards por prioridade',
        description: 'Criar dropdown no toolbar do board que filtra cards exibidos por nível de prioridade (baixa, média, alta, urgente).',
        labels: [
          { text: 'UI/UX', color: '#6C5CE7' },
        ],
        assignees: [userId],
        priority: 'low' as const,
        dueDate: null,
        order: 2,
      },

      // === EM PROGRESSO ===
      {
        boardId: board._id,
        columnId: colProgress,
        title: 'Desenvolver sistema de drag & drop',
        description: 'Implementar arrastar e soltar cards entre colunas usando @dnd-kit. Sincronizar a nova posição com o backend via Socket.io.',
        labels: [
          { text: 'Frontend', color: '#0984E3' },
          { text: 'Core', color: '#FDCB6E' },
        ],
        assignees: [userId],
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
        order: 0,
      },
      {
        boardId: board._id,
        columnId: colProgress,
        title: 'Criar API de autenticação JWT',
        description: 'Endpoints de registro, login, refresh token e logout. Usar bcrypt para hash de senha e cookies httpOnly para refresh token.',
        labels: [
          { text: 'Backend', color: '#E17055' },
          { text: 'Segurança', color: '#D63031' },
        ],
        assignees: [userId],
        priority: 'urgent' as const,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        order: 1,
      },

      // === REVISÃO ===
      {
        boardId: board._id,
        columnId: colReview,
        title: 'Validar responsividade mobile',
        description: 'Testar todas as telas em dispositivos de 320px a 768px. Ajustar sidebar para comportamento de drawer no mobile.',
        labels: [
          { text: 'QA', color: '#A29BFE' },
          { text: 'UI/UX', color: '#6C5CE7' },
        ],
        assignees: [userId],
        priority: 'medium' as const,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        order: 0,
      },
      {
        boardId: board._id,
        columnId: colReview,
        title: 'Code review — Modelo de dados MongoDB',
        description: 'Revisar os schemas de Board, Card e User. Verificar índices, validações e populate references antes do deploy.',
        labels: [
          { text: 'Backend', color: '#E17055' },
          { text: 'Review', color: '#FDCB6E' },
        ],
        assignees: [],
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        order: 1,
      },

      // === CONCLUÍDO ===
      {
        boardId: board._id,
        columnId: colDone,
        title: 'Configurar ambiente de desenvolvimento',
        description: 'Inicializar projeto com Vite + React + TypeScript no frontend e Express + MongoDB no backend. Configurar ESLint e variáveis de ambiente.',
        labels: [
          { text: 'Setup', color: '#00CEC9' },
          { text: 'DevOps', color: '#636E72' },
        ],
        assignees: [userId],
        priority: 'high' as const,
        dueDate: null,
        order: 0,
      },
      {
        boardId: board._id,
        columnId: colDone,
        title: 'Design do layout principal',
        description: 'Criar wireframe e implementar layout com sidebar fixa, header com avatar do usuário e área principal de conteúdo dinâmico.',
        labels: [
          { text: 'UI/UX', color: '#6C5CE7' },
          { text: 'Design', color: '#E84393' },
        ],
        assignees: [userId],
        priority: 'medium' as const,
        dueDate: null,
        order: 1,
      },
      {
        boardId: board._id,
        columnId: colDone,
        title: 'Implementar página de login/registro',
        description: 'Tela de autenticação com formulário de login e registro, validação com Zod, feedback visual de erro e loading state.',
        labels: [
          { text: 'Frontend', color: '#0984E3' },
          { text: 'Auth', color: '#D63031' },
        ],
        assignees: [userId],
        priority: 'high' as const,
        dueDate: null,
        order: 2,
      },
    ];

    await Card.insertMany(demoCards);

    console.log(`✅ Board de demonstração criado para o usuário ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao criar board de demonstração:', error);
    // Não lança o erro para não bloquear o registro do usuário
  }
}
