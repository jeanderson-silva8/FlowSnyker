import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Clock, Users } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';

export default function DashboardPage() {
  const { boards, fetchBoards, createBoard, isLoading } = useBoardStore();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const board = await createBoard(title.trim());
    setTitle('');
    setShowCreate(false);
    navigate(`/board/${board._id}`);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Seus Quadros</h1>
        <p style={{ marginTop: 4 }}>Gerencie seus projetos e colabore em tempo real</p>
      </div>

      <div className="dashboard-grid">
        {boards.map((board) => (
          <div key={board._id} className="board-card" onClick={() => navigate(`/board/${board._id}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(255, 58, 58, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LayoutGrid size={16} color="var(--accent-primary)" />
              </div>
              <h3 className="board-card-title" style={{ margin: 0 }}>{board.title}</h3>
            </div>
            <p>{board.columns?.length || 0} colunas • {board.cardCount || 0} cards</p>
            <div className="board-card-meta">
              <span style={{ display: 'flex', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatDate(board.updatedAt)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {board.members.length}</span>
              </span>
              <div className="board-card-members">
                {board.members.slice(0, 3).map((m) => (
                  <div key={m._id} className="board-card-member" title={m.name}>
                    {m.name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="create-board-card" onClick={() => setShowCreate(true)}>
          <Plus size={24} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Criar Novo Quadro</span>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Criar Novo Quadro</h2>
            <input className="input" placeholder="Nome do quadro..." value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Criar Quadro</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && boards.length === 0 && (
        <div className="dashboard-grid" style={{ marginTop: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      )}
    </div>
  );
}
