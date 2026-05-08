import { create } from 'zustand';
import api from '../services/api';
import type { Board, Card, Column } from '../types';

type BoardState = {
  boards: Board[];
  currentBoard: Board | null;
  cards: Card[];
  isLoading: boolean;
  fetchBoards: () => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<Board>;
  deleteBoard: (id: string) => Promise<void>;
  setCurrentBoard: (board: Board | null) => void;
  addCard: (card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
  moveCard: (cardId: string, toColumnId: string, newOrder: number) => void;
  setCards: (cards: Card[]) => void;
  addColumn: (column: Column) => void;
  renameColumn: (columnId: string, title: string) => void;
  removeColumn: (columnId: string) => void;
  clearColumn: (columnId: string) => void;
};

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  currentBoard: null,
  cards: [],
  isLoading: false,

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/boards');
      set({ boards: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchBoard: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/boards/${id}`);
      set({ currentBoard: data.board, cards: data.cards, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createBoard: async (title) => {
    const { data } = await api.post('/boards', { title });
    set((s) => ({ boards: [data, ...s.boards] }));
    return data;
  },

  deleteBoard: async (id) => {
    await api.delete(`/boards/${id}`);
    set((s) => ({ boards: s.boards.filter((b) => b._id !== id) }));
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  addCard: (card) => set((s) => {
    // Remove temp cards that match the incoming real card to prevent duplicates during optimistic updates
    const filteredCards = s.cards.filter(
      (c) => !(c._id.startsWith('temp-') && c.title === card.title && c.columnId === card.columnId)
    );
    return { cards: [...filteredCards, card] };
  }),

  updateCard: (cardId, updates) =>
    set((s) => ({
      cards: s.cards.map((c) => (c._id === cardId ? { ...c, ...updates } : c)),
    })),

  removeCard: (cardId) =>
    set((s) => ({ cards: s.cards.filter((c) => c._id !== cardId) })),

  moveCard: (cardId, toColumnId, newOrder) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c._id === cardId ? { ...c, columnId: toColumnId, order: newOrder } : c
      ),
    })),

  setCards: (cards) => set({ cards }),

  addColumn: (column) =>
    set((s) => {
      if (!s.currentBoard) return s;
      return {
        currentBoard: { ...s.currentBoard, columns: [...s.currentBoard.columns, column] },
      };
    }),

  renameColumn: (columnId, title) =>
    set((s) => {
      if (!s.currentBoard) return s;
      return {
        currentBoard: {
          ...s.currentBoard,
          columns: s.currentBoard.columns.map((c) => (c._id === columnId ? { ...c, title } : c)),
        },
      };
    }),

  removeColumn: (columnId) =>
    set((s) => {
      if (!s.currentBoard) return s;
      return {
        currentBoard: {
          ...s.currentBoard,
          columns: s.currentBoard.columns.filter((c) => c._id !== columnId),
        },
        cards: s.cards.filter((c) => c.columnId !== columnId),
      };
    }),

  clearColumn: (columnId) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.columnId !== columnId),
    })),
}));
