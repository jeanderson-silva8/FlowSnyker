import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, X, Edit2, Trash2 } from 'lucide-react';
import type { Column, Card } from '../../types';
import CardItem from './CardItem';
import { getSocket } from '../../services/socket';
import { useBoardStore } from '../../store/useBoardStore';
import { useUIStore } from '../../store/useUIStore';


const AVAILABLE_LABELS = [
  { text: 'UI/UX', color: '#CC5DE8' },
  { text: 'FEATURE', color: '#51CF66' },
  { text: 'FRONTEND', color: '#339AF0' },
  { text: 'CORE', color: '#FFA94D' },
  { text: 'QA', color: '#845EF7' },
  { text: 'SETUP', color: '#12B886' },
  { text: 'DEVOPS', color: '#868E96' }
];

export default function ColumnComponent({ column, cards, boardId, onCardClick }: { column: Column; cards: Card[]; boardId: string; onCardClick: (card: Card) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<{ text: string; color: string }[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [customLabelText, setCustomLabelText] = useState('');

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

  const { addCard, renameColumn, removeColumn } = useBoardStore();
  const { openConfirm } = useUIStore();

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


  const handleDeleteColumn = () => {
    setShowMenu(false);
    openConfirm({
      title: 'Excluir Coluna',
      message: `Tem certeza que deseja excluir a coluna "${column.title}" e todos os seus cards? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir Coluna',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        removeColumn(column._id);
        const socket = getSocket();
        socket?.emit('column:delete', { boardId, columnId: column._id });
      }
    });
  };


  const handleAddCustomLabel = () => {
    if (!customLabelText.trim()) return;
    const colors = ['#CC5DE8', '#51CF66', '#339AF0', '#FFA94D', '#845EF7', '#12B886', '#868E96', '#FF6B6B', '#F06595'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newLabel = {
      text: customLabelText.trim().toUpperCase(),
      color: randomColor
    };
    if (!selectedLabels.some((l) => l.text === newLabel.text)) {
      setSelectedLabels([...selectedLabels, newLabel]);
    }
    setCustomLabelText('');
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
      labels: selectedLabels,
      assignees: [],
      priority,
      dueDate: null,
      comments: [],
      order: cards.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const socket = getSocket();
    socket?.emit('card:create', { 
      boardId, 
      columnId: column._id, 
      title: newTitle.trim(), 
      description: newDescription.trim(),
      labels: selectedLabels,
      priority
    });
    setNewTitle('');
    setNewDescription('');
    setSelectedLabels([]);
    setPriority('medium');
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewTitle('');
    setNewDescription('');
    setSelectedLabels([]);
    setCustomLabelText('');
    setPriority('medium');
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
                onClick={handleDeleteColumn}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--status-danger)', fontSize: 13, cursor: 'pointer', borderRadius: 4, textAlign: 'left' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={14} /> Excluir Coluna
              </button>
            </div>
          )}
        </div>
      </div>
      <div ref={setNodeRef} className={`column-cards ${isOver ? 'drag-over' : ''}`}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.sort((a, b) => a.order - b.order).map((card) => (
            <CardItem key={card._id} card={card} boardId={boardId} onCardClick={onCardClick} />
          ))}
        </SortableContext>
      </div>
      {isAdding ? (
        <div className="add-card-form" style={{ background: 'rgba(20, 20, 20, 0.4)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 8 }}>
          <input className="input" style={{ marginBottom: 8 }} placeholder="Título do card..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical', marginBottom: 12 }} placeholder="Descrição do card..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          
          {/* Seletor de Rótulos / Destaques */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Destaques
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {AVAILABLE_LABELS.map((label) => {
                const isSelected = selectedLabels.some((l) => l.text === label.text);
                return (
                  <button
                    key={label.text}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedLabels(selectedLabels.filter((l) => l.text !== label.text));
                      } else {
                        setSelectedLabels([...selectedLabels, label]);
                      }
                    }}
                    style={{
                      background: isSelected ? `${label.color}33` : 'rgba(255,255,255,0.02)',
                      color: label.color,
                      border: `1px solid ${isSelected ? label.color : 'var(--border-subtle)'}`,
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isSelected ? 1 : 0.6
                    }}
                    onMouseOver={(e) => !isSelected && (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={(e) => !isSelected && (e.currentTarget.style.opacity = '0.6')}
                  >
                    {label.text}
                  </button>
                );
              })}
              
              {/* Rótulos customizados criados que não estão no AVAILABLE_LABELS */}
              {selectedLabels
                .filter((l) => !AVAILABLE_LABELS.some((al) => al.text === l.text))
                .map((label) => (
                  <button
                    key={label.text}
                    type="button"
                    onClick={() => setSelectedLabels(selectedLabels.filter((l) => l.text !== label.text))}
                    style={{
                      background: `${label.color}33`,
                      color: label.color,
                      border: `1px solid ${label.color}`,
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: 1
                    }}
                  >
                    {label.text}
                  </button>
                ))
              }
            </div>

            {/* Input de Novo Rótulo Customizado */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
              <input 
                className="input" 
                style={{ padding: '4px 8px', fontSize: 11, height: 26, width: 140 }} 
                placeholder="Novo destaque..." 
                value={customLabelText}
                onChange={(e) => setCustomLabelText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomLabel();
                  }
                }}
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ height: 26, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold' }}
                onClick={handleAddCustomLabel}
              >
                +
              </button>
            </div>
          </div>

          {/* Seletor de Prioridade */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Prioridade
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                const isSelected = priority === p;
                let color = 'var(--text-muted)';
                let activeBg = 'rgba(255,255,255,0.05)';
                let activeBorder = 'var(--border-subtle)';

                if (p === 'low') { color = 'var(--status-info)'; activeBg = 'rgba(59,130,246,0.15)'; activeBorder = 'var(--status-info)'; }
                if (p === 'medium') { color = 'var(--status-warning)'; activeBg = 'rgba(255,170,0,0.15)'; activeBorder = 'var(--status-warning)'; }
                if (p === 'high') { color = 'var(--status-danger)'; activeBg = 'rgba(255,71,87,0.15)'; activeBorder = 'var(--status-danger)'; }
                if (p === 'urgent') { color = '#FF4757'; activeBg = 'rgba(255,71,87,0.3)'; activeBorder = '#FF4757'; }

                const displayNames = {
                  low: 'Baixa',
                  medium: 'Média',
                  high: 'Alta',
                  urgent: 'Urgente'
                };

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      background: isSelected ? activeBg : 'rgba(255,255,255,0.02)',
                      color: isSelected ? color : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? activeBorder : 'var(--border-subtle)'}`,
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flex: 1
                    }}
                  >
                    {displayNames[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="add-card-actions">
            <button className="btn btn-primary btn-sm" onClick={handleAddCard}>Adicionar</button>
            <button className="btn-icon" onClick={handleCancelAdd}><X size={16} /></button>
          </div>
        </div>
      ) : (
        <button className="add-card-btn" onClick={() => setIsAdding(true)}><Plus size={14} /> Adicionar card</button>
      )}
    </div>
  );
}
