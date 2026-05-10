import { useState, useEffect } from 'react';
import { LayoutDashboard, LogOut, Trash2, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import { useUIStore } from '../../store/useUIStore';
import { useNavigate, useLocation } from 'react-router-dom';

import { FlowSnykerLogo } from '../UI/FlowSnykerLogo';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { boards, deleteBoard } = useBoardStore();
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    const id = boardToDelete;
    setBoardToDelete(null);
    deleteBoard(id);
    if (location.pathname === `/board/${id}`) {
      navigate('/');
    }
  };

  return (
    <>
      {/* Botão flutuante na lateral esquerda — só aparece no mobile */}
      <button
        className={`mobile-fab ${isSidebarOpen ? 'hidden' : ''}`}
        onClick={toggleSidebar}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <header className="sidebar-header">
        <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <FlowSnykerLogo size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <h1>FlowSnyker</h1>
            <span>v1.0.0</span>
          </div>
        </div>
      </header>

      <nav className="sidebar-nav">
        <button className="sidebar-item dashboard-item" onClick={() => navigate('/')}>
          <LayoutDashboard size={20} /> Painel
        </button>

        <div className="sidebar-section">Seus Quadros</div>
        {boards.map((board) => (
          <div key={board._id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              className={`sidebar-item ${location.pathname === `/board/${board._id}` ? 'active' : ''}`}
              onClick={() => navigate(`/board/${board._id}`)}
              style={{ paddingRight: 40 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.title}</span>
            </button>
            <button 
              className="btn-icon" 
              style={{ position: 'absolute', right: 8, width: 28, height: 28 }}
              onClick={(e) => { e.stopPropagation(); setBoardToDelete(board._id); }}
              title="Apagar Quadro"
            >
              <Trash2 size={14} color="var(--text-muted)" />
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => {}}>
          {user?.avatar && !user.avatar.includes('ui-avatars') && !user.avatar.includes('dicebear') ? (
            <img src={user.avatar} alt={user.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="avatar-circle" style={{ width: 36, height: 36, fontSize: 14 }}>
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          )}
          <div className="sidebar-user-info" style={{ overflow: 'hidden' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</span>
            <small style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{user?.email}</small>
          </div>
          <button className="sidebar-logout-icon" onClick={(e) => { e.stopPropagation(); logout(); navigate('/login'); }} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {boardToDelete && (
        <div className="modal-overlay" onClick={() => setBoardToDelete(null)} style={{ zIndex: 99999 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Apagar Quadro</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Você tem certeza que deseja apagar este projeto? Todos os cards dentro dele serão perdidos.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setBoardToDelete(null)}>NÃO</button>
              <button className="btn btn-danger" onClick={handleDeleteBoard}>SIM</button>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
