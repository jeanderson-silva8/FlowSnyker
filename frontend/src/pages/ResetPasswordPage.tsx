import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import ParticleField from '../components/Auth/ParticleField';
import GlassCard from '../components/UI/GlassCard';
import AnimatedInput from '../components/UI/AnimatedInput';
import GradientButton from '../components/UI/GradientButton';
import { FlowSnykerLogo } from '../components/UI/FlowSnykerLogo';

export default function ResetPasswordPage() {
  const { id, token } = useParams<{ id: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { resetPassword, error, isLoading, successMessage, clearError, clearSuccess } = useAuthStore();

  // GSAP Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const particlePanelRef = useRef<HTMLDivElement>(null);
  const glassCardRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpar erros ao montar
  useEffect(() => {
    clearError();
    clearSuccess();
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(particlePanelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      tl.fromTo(glassCardRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.2);
      tl.fromTo(logoRef.current, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.4);
      tl.fromTo(headingRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.5);

      if (formRef.current) {
        const fields = formRef.current.querySelectorAll('.form-field');
        tl.fromTo(fields, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 }, 0.6);
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setLocalError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (!id || !token) {
      setLocalError('Link de recuperação inválido.');
      return;
    }

    const success = await resetPassword(id, token, password);
    if (success) {
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  return (
    <div ref={containerRef} className="auth-split-layout">
      {/* LEFT PANEL — Particle Field */}
      <div className="auth-split-left">
        <div ref={particlePanelRef} className="auth-particle-container" style={{ opacity: 0 }}>
          <ParticleField />
        </div>
      </div>

      {/* RIGHT PANEL — Reset Form */}
      <div className="auth-split-right">
        <GlassCard ref={glassCardRef} className="auth-glass-form">
          <div className="auth-form-inner">
            {/* Logo */}
            <div ref={logoRef} className="auth-brand" style={{ opacity: 0 }}>
              <div className="auth-brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                <FlowSnykerLogo size={36} />
              </div>
              <span className="auth-brand-name">FlowSnyker</span>
            </div>

            {/* Heading */}
            <div ref={headingRef} style={{ opacity: 0 }}>
              <h1 className="auth-title">Redefinir sua senha</h1>
              <p className="auth-subtitle">
                Insira sua nova senha abaixo. Ela deve ter pelo menos 8 caracteres.
              </p>
            </div>

            {/* Error */}
            {(error || localError) && (
              <div className="auth-error">{localError || error}</div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="auth-success">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3 4.3L6.5 11.1L2.7 7.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {successMessage}
              </div>
            )}

            {/* Form */}
            {!successMessage && (
              <form ref={formRef} onSubmit={handleSubmit} className="auth-premium-form">
                <div className="form-field">
                  <AnimatedInput
                    label="Nova Senha"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-field">
                  <AnimatedInput
                    label="Confirmar Nova Senha"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-field">
                  <GradientButton type="submit" isLoading={isLoading}>
                    Redefinir Senha
                  </GradientButton>
                </div>
              </form>
            )}

            {/* Footer — Voltar ao Login */}
            <div className="auth-switch-premium">
              <button onClick={() => navigate('/login')}>
                ← Voltar ao login
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
