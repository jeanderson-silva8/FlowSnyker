import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, X, Edit2, Eraser } from 'lucide-react';
import type { Column, Card } from '../../types';
import CardItem from './CardItem';
import { getSocket } from '../../services/socket';
import { useBoardStore } from '../../store/useBoardStore';

export default function ColumnComponent({ column, cards, boardId }: { column: Column; cards: Card[]; boardId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
    data: { type: 'column', column },
  });

  const { addCard, renameColumn, clearColumn } = useBoardStore();

  const handleRenameSubmit = () => {
    if (editedTitle.trim() && editedTitle !== column.title) {
      renameColumn(column._id, editedTitle.trim());
      const socket = getSocket();
      socket?.emit('column:rename', { boardId, columnId: column._id, title: editedTitle.trim() });
    } else {
      setEditedTitle(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleClearColumn = () => {
    if (window.confirm('Tem certeza que deseja apagar todos os cards desta coluna? Esta ação não pode ser desfeita.')) {
      clearColumn(column._id);
      const socket = getSocket();
      socket?.emit('column:clear', { boardId, columnId: column._id });
    }
    setShowMenu(false);
  };

  const handleAddCard = () => {
    if (!newTitle.trim()) return;
    
    // Optimistic UI Update
    const tempId = `temp-${Date.now()}`;
    addCard({
      _id: tempId,
      boardId,
      columnId: column._id,
      title: newTitle.trim(),
      description: newDescription.trim(),
      labels: [],
      assignees: [],
      priority: 'medium',
      dueDate: null,
      comments: [],
      order: cards.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const socket = getSocket();
    socket?.emit('card:create', { boardId, columnId: column._id, title: newTitle.trim(), description: newDescription.trim() });
    setNewTitle('');
    setNewDescription('');
    setIsAdding(false);
  };

  const cardIds = cards.map((c) => c._id);

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-header-left" style={{ flex: 1, overflow: 'hidden' }}>
          {isEditingTitle ? (
            <input 
              className="input" 
              style={{ padding: '4px 8px', height: 'auto', fontSize: 14, fontWeight: 600 }}
              value={editedTitle} 
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
            />
          ) : (
            <h2 className="column-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{column.title}</h2>
          )}
          {!isEditingTitle && <span className="column-count">{cards.length}</span>}
        </div>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', top: 32, right: 0, width: 180, background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)', padding: 6, zIndex: 100
            }}>
              <button 
                onClick={() => { setIsEditingTitle(true); setShowMenu(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', borderRadius: 4, textAlign: 'left' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Edit2 size={14} /> Renomear Coluna
              </button>
              <button 
                onClick={handleClearColumn}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--status-danger)', fontSize: 13, cursor: 'pointer', borderRadius: 4, textAlign: 'left' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Eraser size={14} /> Limpar Coluna
              </button>
            </div>
          )}
        </div>
      </div>
      <div ref={setNodeRef} className={`column-cards ${isOver ? 'drag-over' : ''}`}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.sort((a, b) => a.order - b.order).map((card) => (
            <CardItem key={card._id} card={card} boardId={boardId} />
          ))}
        </SortableContext>
      </div>
      {isAdding ? (
        <div className="add-card-form">
          <input className="input" style={{ marginBottom: 8 }} placeholder="Título do card..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical' }} placeholder="Descrição do card..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); } }} />
          <div className="add-card-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddCard}>Adicionar</button>
            <button className="btn-icon" onClick={() => { setIsAdding(false); setNewTitle(''); setNewDescription(''); }}><X size={16} /></button>
          </div>
        </div>
      ) : (
        <button className="add-card-btn" onClick={() => setIsAdding(true)}><Plus size={14} /> Adicionar card</button>
      )}
    </div>
  );
}
