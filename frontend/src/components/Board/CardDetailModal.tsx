import { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, Tag, Users, Clock, AlignLeft } from 'lucide-react';
import type { Card, Column } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';
import { getSocket } from '../../services/socket';

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
  columns: Column[];
}

const AVAILABLE_LABELS = [
  { text: 'UI/UX', color: '#CC5DE8' },
  { text: 'FEATURE', color: '#51CF66' },
  { text: 'FRONTEND', color: '#339AF0' },
  { text: 'CORE', color: '#FFA94D' },
  { text: 'QA', color: '#845EF7' },
  { text: 'SETUP', color: '#12B886' },
  { text: 'DEVOPS', color: '#868E96' }
];

export default function CardDetailModal({ card, onClose, columns }: CardDetailModalProps) {
  const { currentBoard, updateCard } = useBoardStore();
  const boardMembers = currentBoard?.members || [];

  // Estados locais para edição das informações
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [labels, setLabels] = useState<{ text: string; color: string }[]>([]);
  const [assignees, setAssignees] = useState<{ _id: string; name: string; email: string; avatar: string }[]>([]);
  const [customLabelText, setCustomLabelText] = useState('');

  // Sincronizar estados locais com o card aberto
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setPriority(card.priority || 'medium');
      setLabels(card.labels || []);
      setAssignees(card.assignees || []);
      
      if (card.dueDate) {
        try {
          const date = new Date(card.dueDate);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          setDueDate(`${yyyy}-${mm}-${dd}`);
        } catch {
          setDueDate(null);
        }
      } else {
        setDueDate(null);
      }
    }
  }, [card]);

  if (!card) return null;

  // Encontra a coluna atual para exibir seu título
  const currentColumn = columns.find((col) => col._id === card.columnId);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleAddCustomLabel = () => {
    if (!customLabelText.trim()) return;
    const colors = ['#CC5DE8', '#51CF66', '#339AF0', '#FFA94D', '#845EF7', '#12B886', '#868E96', '#FF6B6B', '#F06595'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newLabel = {
      text: customLabelText.trim().toUpperCase(),
      color: randomColor
    };
    if (!labels.some((l) => l.text === newLabel.text)) {
      setLabels([...labels, newLabel]);
    }
    setCustomLabelText('');
  };

  const handleSave = () => {
    const formattedDueDate = dueDate ? new Date(dueDate).toISOString() : null;

    // Atualização otimista no estado global
    updateCard(card._id, {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: formattedDueDate,
      labels,
      assignees
    });

    // Enviar evento de atualização via Socket para sincronização em tempo real
    const socket = getSocket();
    socket?.emit('card:update', {
      boardId: card.boardId,
      cardId: card._id,
      updates: {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: formattedDueDate,
        labels,
        assignees: assignees.map((a) => a._id)
      }
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '90%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Botão de Fechar */}
        <button
          className="btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={18} />
        </button>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 24, paddingRight: 24 }}>
          <span 
            style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)', 
              fontFamily: 'var(--font-mono)', 
              background: 'var(--bg-hover)', 
              padding: '2px 8px', 
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {currentColumn ? currentColumn.title : 'Coluna desconhecida'}
          </span>
          <div style={{ marginTop: 12 }}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do card..."
              style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                background: 'transparent', 
                border: 'none', 
                borderBottom: '1px solid var(--border-subtle)', 
                borderRadius: 0, 
                padding: '4px 0 8px 0', 
                width: '100%' 
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Seção Grid de Metadados rápidos */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16,
            background: 'var(--bg-primary)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Prioridade */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                <AlertTriangle size={12} /> Prioridade
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {displayNames[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data de Vencimento */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                <Calendar size={12} /> Vencimento
              </div>
              <input
                type="date"
                className="input"
                value={dueDate || ''}
                onChange={(e) => setDueDate(e.target.value || null)}
                style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
              />
            </div>
          </div>

          {/* Rótulos / Labels */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
              <Tag size={14} /> Rótulos
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {AVAILABLE_LABELS.map((label) => {
                const isSelected = labels.some((l) => l.text === label.text);
                return (
                  <button
                    key={label.text}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setLabels(labels.filter((l) => l.text !== label.text));
                      } else {
                        setLabels([...labels, label]);
                      }
                    }}
                    style={{
                      background: isSelected ? `${label.color}33` : 'rgba(255,255,255,0.02)',
                      color: label.color,
                      border: `1px solid ${isSelected ? label.color : 'var(--border-subtle)'}`,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isSelected ? 1 : 0.6
                    }}
                  >
                    {label.text}
                  </button>
                );
              })}

              {/* Rótulos customizados */}
              {labels
                .filter((l) => !AVAILABLE_LABELS.some((al) => al.text === l.text))
                .map((label) => (
                  <button
                    key={label.text}
                    type="button"
                    onClick={() => setLabels(labels.filter((l) => l.text !== label.text))}
                    style={{
                      background: `${label.color}33`,
                      color: label.color,
                      border: `1px solid ${label.color}`,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {label.text}
                  </button>
                ))
              }
            </div>

            {/* Input de Rótulo Customizado */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                style={{ height: 26, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}
                onClick={handleAddCustomLabel}
              >
                +
              </button>
            </div>
          </div>

          {/* Responsáveis / Assignees */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
              <Users size={14} /> Responsáveis
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {boardMembers.length > 0 ? (
                boardMembers.map((member) => {
                  const isAssigned = assignees.some((a) => a._id === member._id);
                  return (
                    <div 
                      key={member._id} 
                      onClick={() => {
                        if (isAssigned) {
                          setAssignees(assignees.filter((a) => a._id !== member._id));
                        } else {
                          setAssignees([...assignees, member]);
                        }
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isAssigned ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isAssigned ? 'var(--accent-glow)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {member.avatar && !member.avatar.includes('ui-avatars') && !member.avatar.includes('dicebear') ? (
                        <img src={member.avatar} alt={member.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar-circle" style={{ width: 24, height: 24, fontSize: 10 }}>
                          {member.name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: isAssigned ? 'white' : 'var(--text-primary)' }}>{member.name}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isAssigned} 
                        readOnly 
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} 
                      />
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum membro no quadro.</div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
              <AlignLeft size={14} /> Descrição
            </div>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição detalhada para este card..."
              style={{ 
                minHeight: '120px', 
                resize: 'vertical', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)'
              }}
            />
          </div>

          {/* Rodapé / Metadados */}
          <div style={{ 
            marginTop: 10, 
            paddingTop: 16, 
            borderTop: '1px solid var(--border-subtle)', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 16, 
            justifyContent: 'space-between', 
            fontSize: '11px', 
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Criado em: {formatDateTime(card.createdAt)}
            </span>
            <span>
              Atualizado em: {formatDateTime(card.updatedAt)}
            </span>
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSave}
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
