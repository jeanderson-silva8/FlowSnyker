# Análise Completa do Projeto FlowSnyker

O **FlowSnyker** é uma plataforma de gestão colaborativa visual (estilo Kanban) projetada com foco em tempo real, alta fidelidade visual e segurança fortificada.

Abaixo está o mapeamento detalhado da arquitetura e componentes principais do sistema.

---

## 1. Visão Geral da Arquitetura

O projeto adota uma arquitetura clássica Client-Server desacoplada:
- **Backend**: Servidor RESTful API em Node.js com Express e TypeScript. Comunicação em tempo real baseada em WebSockets (Socket.io). Banco de dados MongoDB gerenciado via Mongoose.
- **Frontend**: Aplicação React estruturada com Vite, TypeScript, Tailwind CSS e Zustand para gerenciamento de estado. Animações fluidas integradas com GSAP (GreenSock Animation Platform).

---

## 2. Estrutura do Backend (`/backend`)

O backend está organizado em pastas modulares sob `src/`:
- `controllers/`: Gerenciam a lógica de negócios e respostas HTTP.
  - [auth.controller.ts](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/backend/src/controllers/auth.controller.ts) — Gerencia cadastro, login, logout, renovação de tokens (refresh) e o fluxo obsoleto de recuperação de senha.
  - `board.controller.ts` — Lógica de criação, atualização, convite de membros e exclusão de quadros.
  - `card.controller.ts` — Lógica de CRUD para cartões nas colunas.
- `middleware/`: Filtros e interceptadores de requisições.
  - `auth.ts` — Validação do JWT Bearer token para rotas protegidas.
  - `rateLimiter.ts` — Limitação de requisições (Rate limiting) para evitar brute-force e abusos de API.
  - `validate.ts` — Validador de esquemas usando Zod antes de prosseguir nas rotas.
- `models/`: Definições dos modelos de dados do Mongoose (MongoDB).
  - [User.ts](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/backend/src/models/User.ts) — Modelo de Usuário contendo hash de senha, avatar e campos temporários para redefinição de senha.
  - `Board.ts` — Modelo de Quadro contendo colunas e membros.
  - `Card.ts` — Modelo de Cartão contendo descrição, etiquetas e prioridades.
  - `RefreshToken.ts` — Controle de rotação e segurança contra reutilização de tokens de sessão.
- `routes/`: Definição das rotas REST expostas pelo Express.
  - [auth.routes.ts](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/backend/src/routes/auth.routes.ts) — Endpoints públicos e privados de autenticação.
- `utils/`: Auxiliares de log, configuração de conexão e envio de emails.
  - [email.ts](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/backend/src/utils/email.ts) — Configurações SMTP (Gmail) e Resend para envio de e-mails de recuperação.

### Medidas de Segurança Identificadas no Backend:
1. **IAM e Sessões**: Utilização de JWT de vida curta (15 min) e Refresh Tokens rotativos armazenados em Cookies HttpOnly com proteção de rotação (se um token antigo é reutilizado, toda a família de tokens é revogada).
2. **Criptografia**: Hash de senhas gerenciado prioritariamente por **Argon2id**, com migração transparente caso o usuário ainda possua um hash antigo em bcrypt.
3. **Lockout**: Bloqueio temporário de conta (15 min) após 5 tentativas consecutivas falhas de login.
4. **Zod Validation**: Todos os payloads de entrada passam por validação estrita antes do tratamento.

---

## 3. Estrutura do Frontend (`/frontend`)

Desenvolvido com React + Vite, a interface foi desenhada com alto apelo visual (Glassmorphic) e interações dinâmicas:
- `src/components/`:
  - `Auth/` — Formulários de login e cadastro. [AuthPage.tsx](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/frontend/src/components/Auth/AuthPage.tsx) gerencia o estado e as animações de entrada.
  - `Board/` — Exibição visual de quadros, colunas e cartões. Possui drag and drop suave.
  - `UI/` — Componentes reaproveitáveis (botões de gradiente, cartões de vidro, inputs animados).
- `src/pages/`:
  - `DashboardPage.tsx` — Lista de quadros criados e compartilhados.
  - `BoardPage.tsx` — Visualização do quadro Kanban com as colunas.
  - [ResetPasswordPage.tsx](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/frontend/src/pages/ResetPasswordPage.tsx) — Página dedicada para digitar a nova senha vinda do link de redefinição.
- `src/store/`:
  - [useAuthStore.ts](file:///c:/Users/pedro/OneDrive/Área de Trabalho/FlowSnyker/frontend/src/store/useAuthStore.ts) — Gerencia o estado de autenticação global com Zustand.
  - `useBoardStore.ts` — Gerencia os boards e ações de WebSocket.

---

## 4. Análise de Dependências para Recuperação de Senha

O recurso de recuperação de senha necessita dos seguintes vínculos ativos:
1. **Envio de e-mails**: `nodemailer` e `resend` no backend. O arquivo `backend/src/utils/email.ts` serve exclusivamente a esse fim.
2. **Armazenamento de estado temporário**: O banco de dados do usuário possui os campos `resetPasswordToken` e `resetPasswordExpires`. No entanto, como a segurança do token usa uma assinatura dinâmica baseada na própria senha criptografada do usuário (`JWT_SECRET + user.password`), esses campos de token no banco são atualmente redundantes ou apenas legados, já que o JWT cuida do tempo de expiração e expira automaticamente se o usuário alterar a senha.
3. **Rotas dedicadas**: O endpoint `/forgot-password` e `/reset-password/:id/:token` no backend, e a página `/reset-password/:id/:token` no frontend.
