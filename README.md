# ⚡ FlowSnyker
**Plataforma Full-Stack B2B de Gestão Ágil e Kanban Colaborativo em Tempo Real.**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

![CI](https://github.com/jeanderson-silva8/FlowSnyker/actions/workflows/ci.yml/badge.svg)

🟢 **LIVE DEMO**: [Acesse o FlowSnyker Ao Vivo Aqui](#)
🛡️ **Auditoria Enterprise:** [Veja a Auditoria de Segurança Aplicada a Este Projeto](docs/AUDIT_REPORT_2026-05-16.md)

---

## 🛑 O Problema

Equipes de alta performance perdem o ritmo e sofrem com atrasos por causa de ferramentas de gestão engessadas, onde as atualizações precisam de recarregamentos constantes da página ("F5") e não refletem o status real de uma tarefa de forma instantânea. Além disso, plataformas tradicionais frequentemente negligenciam a estética e a fluidez, criando um ambiente de trabalho desmotivador.

## ✅ A Solução (FlowSnyker)

O FlowSnyker é uma plataforma de gestão Kanban construída para ser a espinha dorsal de equipes ágeis, focada em **sincronização instantânea e excelência visual**.

Ele resolve o problema do "delay de comunicação" utilizando **Socket.io (WebSockets)** para criar um fluxo de dados bidirecional. Quando um membro da equipe move um card para "Em Progresso", a tela de todos os outros colaboradores é atualizada em milissegundos. Tudo isso é envelopado na identidade visual **"Fire Flow"** — uma interface de luxo, hiper-responsiva, com Glassmorphism, dark mode refinado e animações de altíssima performance.

---

## 🧠 Maior Desafio Técnico Superado

Garantir a persistência da conexão em tempo real (WebSockets) numa arquitetura robusta, mantendo a reatividade no Frontend através de gerenciamento de estado complexo (Zustand + Dnd-Kit), sem sacrificar a segurança.

**Sincronização de Estado Desacoplada:** Ao utilizar o `dnd-kit` para a física de "arrastar e soltar", o frontend precisa fazer um "Optimistic Update" (atualizar a tela instantaneamente para o usuário que arrastou) enquanto o Socket.io se encarrega de sincronizar o estado no backend e notificar os outros usuários simultaneamente. Sincronizar o estado local (`Zustand`) com os eventos de broadcast do servidor evitou gargalos e o temido efeito "flicker" (piscar) nos cards 
durante a movimentação.

---

## 📐 Decisões Arquiteturais (Trade-offs)

- **JWT em vez de sessão server-side**: escolhido para escalabilidade horizontal (sem sticky session). Trade-off: revogação não é instantânea (mitigado com access token curto de 15min + refresh rotativo com detecção de reuso).
- **MongoDB em vez de PostgreSQL**: dados não-relacionais (boards são objetos auto-contidos). Trade-off: transações multi-documento mais limitadas (não usadas no escopo atual).
- **Socket.io em vez de WebSocket nativo**: fallback automático para polling e reconnect built-in. Trade-off: payload ligeiramente maior.
- **Argon2id em vez de bcrypt**: padrão moderno (OWASP 2024+). Trade-off: dependência native (`@node-rs/argon2`). Mantemos compatibilidade retroativa com bcrypt para usuários existentes via migração transparente no login.
- **WAF custom no Express em vez de Cloudflare**: zero custo, controle total sobre regras. Trade-off: cobre menos vetores que solução comercial; planejado migrar quando o projeto escalar.

---

## 🧪 Testes

```bash
cd backend
npm test          # Roda 20+ testes (auth, autorização, Argon2id)
npm run type-check  # Type-check completo sem emitir
```

**Cobertura de testes estratégicos:**
- Registro, login, lockout, refresh rotation, reuse detection
- Autorização de board (membro vs não-membro vs owner)
- Criação de card com validação de membership
- Migração Argon2id

---

<a id="seg-camadas"></a>
## 🔒 Segurança — camadas e status

> *Tabela scannável: o que existe em cada camada, com âncora no código. Para o **encadeamento** específico de auth + sockets (como `socket.userId` no handshake e validação por handler trabalham juntos contra IDOR via WebSocket), ver a seção [Arquitetura de Auth + WebSocket](#arq-auth-ws) abaixo.*

| Camada | Implementação | Status |
|--------|---------------|:------:|
| **Hash de senha** | Argon2id (OWASP) com migração transparente de bcrypt | ✅ |
| **Tokens** | JWT curto (15m) + Refresh rotation + Detecção de reuso | ✅ |
| **Cookies** | HttpOnly, Secure, SameSite=Strict | ✅ |
| **Autorização** | Middleware centralizado por board em TODAS as rotas e sockets | ✅ |
| **Validação** | Zod em HTTP e WebSocket | ✅ |
| **WAF** | Custom middleware: XSS, SQLi, path traversal, scanner block | ✅ |
| **Headers** | Helmet + CSP + HSTS + referrer-policy | ✅ |
| **Rate limiting** | 100/min geral + 5/min auth + Account lockout (15 min) | ✅ |
| **CSRF** | Origin validation no refresh | ✅ |
| **Logging** | Estruturado com redação de dados sensíveis + Correlation ID | ✅ |

**O que NÃO está implementado (transparência):**
- MFA/2FA
- Audit log persistente (logs vão para stdout)
- Encryption at rest customizado (usa MongoDB Atlas default)

> Para reportar vulnerabilidades, veja [SECURITY.md](SECURITY.md).
> Para detalhes técnicos, veja [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

---

## ✨ Principais Funcionalidades

- **Kanban em Tempo Real (WebSockets):** Movimentação de cards sincronizada milissegundo a milissegundo entre múltiplos clientes conectados simultaneamente.
- **Sistema de Presença (Avatares Online):** Integração social indicando visualmente (com avatares dinâmicos e status verde) exatamente quem está operando o quadro naquele instante, prevenindo choques de edição.
- **Drag & Drop de Baixa Latência:** Física e animações de manipulação de cards extremamente fluidas construídas com `@dnd-kit/core`.
- **Dashboard Premium (Fire Flow):** UI de alta fidelidade com micro-interações, feedback visual tátil e painéis translúcidos (Glassmorphism) com reflexos controlados.
- **Autenticação Segura JWT:** Fluxo de login/cadastro com hash **Argon2id** (padrão OWASP) e refresh token rotation com detecção de reuso. Protege rotas HTTP e WebSocket handshake.

---

<a id="arq-auth-ws"></a>
## 🔒 Arquitetura de Auth + WebSocket — como o fluxo resiste a IDOR, spoofing de identidade e bypass de convite (o porquê e o encadeamento)

> *Deep-dive narrativo: por que cada peça existe e como elas se encadeiam. A tabela [Segurança — camadas e status](#seg-camadas) acima lista o **que** existe; esta seção explica **por que** assim — especialmente sobre o vetor mais sutil de IDOR via WebSocket que a auditoria v2 identificou.*

No FlowSnyker, a colaboração em tempo real exige cuidado redobrado: cada movimentação de card pode envolver 3 superfícies diferentes (HTTP, handshake de socket, evento de socket subsequente) e o atacante precisa ser bloqueado nas três. Por isso a arquitetura segue um protocolo de auth em **6 etapas encadeadas**:

1. **Hash de senha resistente:** Argon2id (padrão OWASP 2024+) com `memoryCost`/`timeCost` calibrados; migração transparente de bcrypt no primeiro login pós-deploy. Brute force offline contra dump de senha custa caro o suficiente pra não compensar.
2. **JWT curto + Refresh Token Rotation com detecção de reuso:** access token de 15min vive em memória React (não `localStorage`). Cada refresh consome o token atual e emite um novo na mesma `familyId`. Se um refresh já revogado for tentado de novo (= sinal de roubo de cookie), **toda a família é revogada** e o usuário precisa relogar. Account lockout adicional após 5 tentativas de login/15min.
3. **Cookie de refresh blindado:** `httpOnly` + `secure` (prod) + `sameSite=strict` + `path=/auth` + `maxAge=7d`. Não acessível via JS; não enviado em cross-site; escopado só à rota `/auth`. Combinado com validação de `Origin` no `/refresh`, fecha CSRF.
4. **Autorização granular em TODA rota HTTP:** `requireBoardAccess` middleware valida membership do `boardId` ANTES de qualquer operação. Link `/board/123` colado no navegador por usuário não-autorizado retorna `403 Forbidden`. Link em si **não concede permissão mágica** — JWT + membership são revalidados a cada request.
5. **Handshake de socket autenticado (e imutável):** quando o cliente conecta no `io.connection`, o middleware `io.use(authenticateSocket)` valida o JWT e seta `socket.userId = decoded.userId` UMA ÚNICA VEZ. **Esse `socket.userId` é IMUTÁVEL após o handshake** — auditoria v2 identificou que o handler `presenceEvents.ts` antigo aceitava `user._id` do payload e sobrescrevia `socket.userId`, permitindo IDOR via WebSocket onde atacante se passava por terceiros. **Correção aplicada:** `socket.userId` só é setado no handshake; nunca sobrescrito por payload de cliente em handler subsequente. Dados adicionais do usuário (nome, avatar) são buscados do banco usando o `userId` do handshake — nunca aceitos do cliente.
6. **Autorização em cada event handler de socket:** mesmo que o socket esteja autenticado, cada evento (`card:move`, `board:join`, etc.) revalida que `socket.userId` tem acesso ao `boardId` do payload. Autenticar UMA VEZ no handshake **não é suficiente** — handler deve sempre verificar autorização ao recurso específico que está sendo manipulado.

**Convite como único caminho de ingresso:** a única forma de virar membro de um board é via "Convidar" — um membro existente digita o email do colaborador, backend valida que o convidador é membro (via `requireBoardAccess`), busca o usuário convidado pelo email, e adiciona o `userId` ao array `members` do board. Acesso revogável a qualquer momento removendo o ID do array; toda operação subsequente revalida membership via middleware.

**Fluxo de acesso controlado no frontend:** se o colaborador clicar num link de board sem estar logado, `PrivateRoute` no React intercepta e exige login antes. Após autenticar, API valida em tempo real se o `userId` recém-autenticado tem credencial pro `boardId` — só então o socket abre com `socket.userId` correto.

> **Lição meta (auditoria v2):** autorização correta em ESTRUTURA (item A3 — room control) não basta. Precisa também garantir que a FONTE DE VERDADE da identidade vem do handshake autenticado, não do payload do evento. Auditoria FlowSnyker v2 originou os itens **3B** e **A2B** do checklist universal exatamente por causa desse vetor sutil.

---

## 🛠️ Stack Tecnológico & Arquitetura

### 1. Frontend (SPA)
- **Framework:** React 19 + Vite.
- **Gerenciamento de Estado:** Zustand (para performance superior em tempo real sem o boilerplate exagerado do Redux).
- **Estilização & UI:** CSS Vanilla Modular ("Fire Flow" Design System), animações com Framer Motion/GSAP e ícones Lucide.
- **Comunicação:** `socket.io-client` para fluxos bidirecionais contínuos e `axios` interceptors para requisições HTTP e refresh tokens.

### 2. Backend (Servidor de Tempo Real)
- **Motor Lógico:** Node.js + Express.
- **WebSockets:** Socket.io implementado com o conceito de salas (Rooms) vinculadas ao `boardId`, garantindo que os eventos de drag & drop só sejam despachados para os clientes autorizados daquele quadro específico.
- **Defesa Perimetral:** `helmet`, `express-rate-limit`, e CORS estrito alinhado com variáveis de ambiente.

### 3. Banco de Dados
- **MongoDB Atlas:** Cluster em nuvem para armazenamento NoSQL altamente escalável.
- **Mongoose ORM:** Esquemas de dados (Schemas) garantindo a tipagem em tempo de execução e relacionamentos otimizados via `.populate()`.

---

## 📂 Visão Geral da Estrutura

```text
├── backend/          # Node.js, Express, Controllers, Middlewares JWT, Socket.io Handlers
├── frontend/         # React, Vite, Componentes UI Glassmorphism, Zustand Store, Dnd-Kit
├── docs/             # API.md, THREAT_MODEL.md
├── SECURITY.md       # Política de segurança e disclosure
└── README.md         # Documentação Arquitetural
```
---

## 👑 Autor

**Jeanderson Silva** 🤓✍️

*Desenvolvedor Full-Stack | Engenheiro Frontend | Arquiteto de Software*

Construído desde o mapeamento de arquitetura de alta performance (WebSockets) até o refinamento extremo de UI/UX focado no cenário B2B de ferramentas de produtividade.

Sinta-se à vontade para auditar as configurações de rede, explorar a lógica de reatividade local do Zustand conectada aos Sockets ou testar a interatividade da aplicação!
