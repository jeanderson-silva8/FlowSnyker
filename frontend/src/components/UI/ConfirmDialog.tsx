import { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function ConfirmDialog() {
  const { confirmDialog, closeConfirm } = useUIStore();

  // Fechar ao pressionar a tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmDialog) {
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, closeConfirm]);

  if (!confirmDialog) return null;

  const { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning', onConfirm, onCancel } = confirmDialog;

  const handleConfirm = () => {
    onConfirm();
    closeConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeConfirm();
  };

  // Ícone e estilo com base no tipo
  let IconComponent = HelpCircle;
  let iconColor = 'var(--text-primary)';
  let confirmBtnClass = 'btn-primary';

  if (type === 'danger') {
    IconComponent = Trash2;
    iconColor = 'var(--status-danger)';
    confirmBtnClass = 'btn'; // Usar classe básica e customizar inline ou usar var
  } else if (type === 'warning') {
    IconComponent = AlertTriangle;
    iconColor = 'var(--status-warning)';
  } else if (type === 'info') {
    IconComponent = Info;
    iconColor = 'var(--status-info)';
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={handleCancel}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '90%',
          padding: '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modal-entry 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        }}
      >
        {/* Botão fechar (X) */}
        <button
          className="btn-icon"
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: '28px',
            height: '28px',
            opacity: 0.6
          }}
        >
          <X size={16} />
        </button>

        {/* Círculo do Ícone */}
        <div 
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: `rgba(255, 255, 255, 0.02)`,
            border: `1px solid ${iconColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: iconColor,
            boxShadow: `0 0 20px ${iconColor}11`
          }}
        >
          <IconComponent size={28} />
        </div>

        {/* Título */}
        <h3 
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '10px',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>

        {/* Mensagem */}
        <p 
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
            maxWidth: '340px'
          }}
        >
          {message}
        </p>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleCancel}
            style={{ 
              flex: 1, 
              justifyContent: 'center',
              height: '42px',
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={confirmBtnClass} 
            onClick={handleConfirm}
            style={{ 
              flex: 1, 
              justifyContent: 'center',
              height: '42px',
              fontWeight: 600,
              backgroundColor: type === 'danger' ? 'var(--status-danger)' : 'var(--accent-primary)',
              color: '#fff',
              transition: 'transform 0.15s ease, filter 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
