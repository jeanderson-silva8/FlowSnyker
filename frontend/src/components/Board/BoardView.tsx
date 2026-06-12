import { useState, useCallback } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';
import { getSocket } from '../../services/socket';
import ColumnComponent from './ColumnComponent';
import CardDetailModal from './CardDetailModal';
import type { Card } from '../../types';

export default function BoardView() {
  const { currentBoard, cards, moveCard, addColumn } = useBoardStore();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedDetailCard, setSelectedDetailCard] = useState<Card | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c._id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || !currentBoard) return;

    const draggedCard = cards.find((c) => c._id === active.id);
    if (!draggedCard) return;

    let toColumnId: string;
    let newOrder: number;

    const overColumn = currentBoard.columns.find((col) => col._id === over.id);
    if (overColumn) {
      toColumnId = overColumn._id;
      newOrder = cards.filter((c) => c.columnId === toColumnId).length;
    } else {
      const overCard = cards.find((c) => c._id === over.id);
      if (!overCard) return;
      toColumnId = overCard.columnId;
      newOrder = overCard.order;
    }

    if (draggedCard.columnId === toColumnId && draggedCard.order === newOrder) return;

    moveCard(draggedCard._id, toColumnId, newOrder);
    const socket = getSocket();
    socket?.emit('card:move', {
      boardId: currentBoard._id,
      cardId: draggedCard._id,
      fromColumnId: draggedCard.columnId,
      toColumnId,
      newOrder,
    });
  }, [cards, currentBoard, moveCard]);

  const handleAddColumn = () => {
    if (!newColumnTitle.trim() || !currentBoard) return;
    const column = { _id: Date.now().toString(), title: newColumnTitle.trim(), order: currentBoard.columns.length };
    addColumn(column);
    const socket = getSocket();
    socket?.emit('column:create', { boardId: currentBoard._id, column });
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  if (!currentBoard) return null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="board-container">
          {currentBoard.columns.sort((a, b) => a.order - b.order).map((column) => (
            <ColumnComponent key={column._id} column={column} cards={cards.filter((c) => c.columnId === column._id)} boardId={currentBoard._id} onCardClick={setSelectedDetailCard} />
          ))}
          {isAddingColumn ? (
            <div className="column" style={{ padding: 16 }}>
              <input className="input" placeholder="Nome da coluna..." value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} autoFocus />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddColumn}>Criar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsAddingColumn(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="add-column" onClick={() => setIsAddingColumn(true)}><Plus size={16} /> Nova Coluna</button>
          )}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="drag-overlay-card">
              {activeCard.labels.length > 0 && (
                <div className="card-labels">
                  {activeCard.labels.map((l, i) => (
                    <span key={i} className="card-label" style={{ background: `${l.color}22`, color: l.color }}>{l.text}</span>
                  ))}
                </div>
              )}
              <h3 className="card-title">{activeCard.title}</h3>
              <div className="card-meta">
                <span className={`card-priority ${activeCard.priority}`}>
                  {activeCard.priority === 'low' && 'Baixa'}
                  {activeCard.priority === 'medium' && 'Média'}
                  {activeCard.priority === 'high' && 'Alta'}
                  {activeCard.priority === 'urgent' && 'Urgente'}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <CardDetailModal
        card={selectedDetailCard}
        onClose={() => setSelectedDetailCard(null)}
        columns={currentBoard.columns}
      />
    </>
  );
}
