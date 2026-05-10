import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBoardStore } from '../store/useBoardStore';
import { useSocket } from '../hooks/useSocket';
import BoardView from '../components/Board/BoardView';
import OnlineAvatars from '../components/Presence/OnlineAvatars';
import InviteModal from '../components/Presence/InviteModal';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentBoard, fetchBoard, isLoading } = useBoardStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useSocket(id);

  useEffect(() => {
    if (id) fetchBoard(id);
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado com sucesso!', {
      style: {
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-active)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        fontSize: '13px',
        fontWeight: 500,
      },
      iconTheme: {
        primary: 'var(--status-success)',
        secondary: 'var(--bg-primary)',
      },
      duration: 3000,
    });
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="topbar">
          <div className="skeleton" style={{ width: 200, height: 28 }} />
        </div>
        <div style={{ display: 'flex', gap: 16, padding: 20, flex: 1 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: 300, height: '80%', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn-icon" onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
          <h1 className="topbar-title">{currentBoard?.title || 'Quadro'}</h1>
          <span className="topbar-badge" style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
            {currentBoard?.columns.length || 0} colunas
          </span>
        </div>
        <div className="topbar-right">
          <OnlineAvatars />
          <button className="btn btn-secondary btn-sm" onClick={() => setIsInviteModalOpen(true)} aria-label="Convidar membros">
            <UserPlus size={14} /> <span>Convidar</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleShare}>
            <Share2 size={14} />
          </button>
        </div>
      </div>

      <BoardView />
      
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
}
