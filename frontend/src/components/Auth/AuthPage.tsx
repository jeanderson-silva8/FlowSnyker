import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '../../store/useAuthStore';
import ParticleField from './ParticleField';
import GlassCard from '../UI/GlassCard';
import AnimatedInput from '../UI/AnimatedInput';
import GradientButton from '../UI/GradientButton';

import { FlowSnykerLogo } from '../UI/FlowSnykerLogo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, error, isLoading, isAuthenticated, clearError } = useAuthStore();

  // GSAP Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const particlePanelRef = useRef<HTMLDivElement>(null);
  const glassCardRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animation
  useEffect(() => {
    if (isAuthenticated) return; // Não animar se já autenticado
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. Particles fade in
      tl.fromTo(particlePanelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 });

      // 2. Glass card slide up
      tl.fromTo(glassCardRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.2);

      // 3. Logo slide in
      tl.fromTo(logoRef.current, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.4);

      // 4. Heading fade
      tl.fromTo(headingRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.5);

      // 5. Form fields stagger
      if (formRef.current) {
        const fields = formRef.current.querySelectorAll('.form-field');
        tl.fromTo(fields, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 }, 0.6);
      }

      // 6. Divider + footer
      tl.fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.0);

      // 7. Headline (left panel)
      tl.fromTo(headlineRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.4);
    }, containerRef);

    return () => ctx.revert();
  }, [isAuthenticated]);

  // Redirect DEPOIS de todos os hooks
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(email, password);
    } else {
      await register(name, email, password);
    }
  };

  const toggleMode = () => {
    clearError();
    setIsLogin(!isLogin);

    // Animate form fields on mode switch
    if (formRef.current) {
      const fields = formRef.current.querySelectorAll('.form-field');
      gsap.fromTo(fields, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out' });
    }
  };

  return (
    <div ref={containerRef} className="auth-split-layout">
      {/* LEFT PANEL — Particle Field */}
      <div className="auth-split-left">
        <div ref={particlePanelRef} className="auth-particle-container" style={{ opacity: 0 }}>
          <ParticleField />
        </div>

        {/* Headline overlay */}
        <div ref={headlineRef} className="auth-headline" style={{ opacity: 0 }}>
          <span className="auth-eyebrow">
            <span className="auth-eyebrow-dot" />
            Plataforma de gestão colaborativa
          </span>
          <p>
            A plataforma que transforma equipes em máquinas de alta performance —
            organização visual, colaboração em tempo real e fluxo sem fricção.
          </p>
          <ul className="auth-features">
            <li><span className="auth-feature-check">✓</span> Boards Kanban em tempo real</li>
            <li><span className="auth-feature-check">✓</span> Colaboração multiusuário sincronizada</li>
            <li><span className="auth-feature-check">✓</span> Interface premium, foco total</li>
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div className="auth-split-right">
        <GlassCard ref={glassCardRef} className="auth-glass-form" >
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
              <h1 className="auth-title">
                {isLogin ? 'Acesse sua área de trabalho' : 'Crie sua conta e colabore'}
              </h1>
            </div>

            {/* Error */}
            {error && <div className="auth-error">{error}</div>}

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="auth-premium-form">
              {!isLogin && (
                <div className="form-field">
                  <AnimatedInput
                    label="Nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-field">
                <AnimatedInput
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <AnimatedInput
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {isLogin && (
                  <div className="auth-forgot">
                    <a href="#">Esqueceu a senha?</a>
                  </div>
                )}
              </div>

              <div className="form-field">
                <GradientButton type="submit" isLoading={isLoading}>
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                </GradientButton>
              </div>
            </form>

            {/* Footer */}
            <div ref={footerRef} className="auth-switch-premium" style={{ opacity: 0 }}>
              {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
              <button onClick={toggleMode}>
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
