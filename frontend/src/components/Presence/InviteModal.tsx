import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    // Simulando o envio do convite
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Convite simulado enviado para ${email}`, {
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
        duration: 4000,
      });
      setEmail('');
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={18} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="auth-brand-icon" style={{ width: 32, height: 32 }}>
            <Mail size={16} />
          </div>
          Convidar Membro
        </h2>
        
        <p style={{ marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          Envie um convite para colaborar neste quadro do FlowSnyker.
        </p>

        <form onSubmit={handleInvite} className="auth-premium-form">
          <div className="animated-input-group">
            <label className="animated-input-label">E-mail do colaborador</label>
            <input
              type="email"
              className="animated-input"
              placeholder="exemplo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="gradient-btn-premium"
              style={{ width: 'auto', height: 40, padding: '0 24px', borderRadius: 'var(--radius-md)' }}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <div className="gradient-btn-spinner" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', width: 16, height: 16 }} />
              ) : (
                'Enviar Convite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
