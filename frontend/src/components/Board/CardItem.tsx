import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types';
import { Trash2, GripVertical } from 'lucide-react';
import { getSocket } from '../../services/socket';
import { useBoardStore } from '../../store/useBoardStore';

export default function CardItem({ card, boardId }: { card: Card; boardId: string }) {
  const { removeCard } = useBoardStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeCard(card._id); // Optimistic UI update
    const socket = getSocket();
    socket?.emit('card:delete', { boardId, cardId: card._id, columnId: card.columnId });
  };

  return (
    <div ref={setNodeRef} style={style} className={`card ${isDragging ? 'dragging' : ''}`} {...attributes}>
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
        <span className={`card-priority ${card.priority}`}>{card.priority}</span>
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
