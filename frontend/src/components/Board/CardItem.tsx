import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types';
import { Trash2, GripVertical } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { useBoardStore } from '../../store/useBoardStore';

import { useUIStore } from '../../store/useUIStore';

export default function CardItem({ card, boardId, onCardClick }: { card: Card; boardId: string; onCardClick: (card: Card) => void }) {
  const { removeCard } = useBoardStore();
  const { openConfirm } = useUIStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'pointer',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm({
      title: 'Excluir Card',
      message: `Tem certeza que deseja excluir o card "${card.title}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir Card',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => {
        removeCard(card._id); // Optimistic UI update
        const socket = getSocket();
        socket?.emit('card:delete', { boardId, cardId: card._id, columnId: card.columnId });
      }
    });
  };


  return (
    <div ref={setNodeRef} style={style} className={`card ${isDragging ? 'dragging' : ''}`} {...attributes} onClick={() => onCardClick(card)}>
      <span className="card-status-dot" aria-hidden="true" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {card.labels.length > 0 && (
            <div className="card-labels">
              {card.labels.map((l, i) => (
                <span key={i} className="card-label" style={{ background: `${l.color}22`, color: l.color }}>{l.text}</span>
              ))}
            </div>
          )}
          <h3 className="card-title" style={{ wordBreak: 'break-word' }}>{card.title}</h3>
          {card.description && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-word' }}>
              {card.description.substring(0, 80)}{card.description.length > 80 ? '...' : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button {...listeners} className="btn-icon" style={{ cursor: 'grab', width: 24, height: 24 }}><GripVertical size={14} /></button>
          <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="card-meta">
        <span className={`card-priority ${card.priority}`}>
          {card.priority === 'low' && 'Baixa'}
          {card.priority === 'medium' && 'Média'}
          {card.priority === 'high' && 'Alta'}
          {card.priority === 'urgent' && 'Urgente'}
        </span>
        {card.assignees.length > 0 && (
          <div className="card-assignees">
            {card.assignees.map((a) => (
              a.avatar && !a.avatar.includes('ui-avatars') && !a.avatar.includes('dicebear') ? (
                <img key={a._id} className="card-assignee" src={a.avatar} alt={a.name} title={a.name} style={{ objectFit: 'cover' }} />
              ) : (
                <div key={a._id} className="card-assignee avatar-circle" style={{ fontSize: 12 }} title={a.name}>
                  {a.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
