# Plano de Tarefas (task_plan.md) — Implementação da Recuperação de Senha

Este documento rastreia os objetivos e checklists para a implementação segura da recuperação de senha baseada em JWT Dinâmico e envio por Gmail SMTP (Nodemailer).

## Fases e Objetivos

### Fase 1: Implementação no Backend
- [x] Configurar chaves `EMAIL_USER` e `EMAIL_PASS` no `backend/.env` e no `.env.example`.
- [x] Criar o utilitário de envio de email `backend/src/utils/email.ts` usando Nodemailer para o Gmail SMTP.
- [x] Implementar os métodos `forgotPassword` e `resetPassword` em `backend/src/controllers/auth.controller.ts` utilizando assinatura de token dinâmica (`JWT_SECRET + user.password`).
- [x] Registrar as rotas `/forgot-password` e `/reset-password/:id/:token` em `backend/src/routes/auth.routes.ts`.

### Fase 2: Implementação no Frontend
- [x] Adicionar os métodos `forgotPassword` e `resetPassword` em `frontend/src/store/useAuthStore.ts`.
- [x] Ajustar a interface em `frontend/src/components/Auth/AuthPage.tsx` para comportar o formulário de "Esqueci minha senha" e links de transição.
- [x] Recriar a página `frontend/src/pages/ResetPasswordPage.tsx` para exibição e processamento do formulário de redefinição.
- [x] Inserir a rota `/reset-password/:id/:token` no `frontend/src/App.tsx`.
- [x] Restaurar as regras de estilos CSS de forgot password no `frontend/src/index.css`.

### Fase 3: Validação
- [x] Executar builds para certificar que os tipos compilam perfeitamente no backend e frontend.
- [x] Realizar teste manual completo de ponta a ponta (solicitar reset -> receber e-mail -> trocar senha -> login bem-sucedido).
