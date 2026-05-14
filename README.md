# ⚡ FlowSnyker
**Plataforma Full-Stack B2B de Gestão Ágil e Kanban Colaborativo em Tempo Real.**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

🟢 **LIVE DEMO**: [Acesse o FlowSnyker Ao Vivo Aqui](#)

---

## 🛑 O Problema
Equipes de alta performance perdem o ritmo e sofrem com atrasos por causa de ferramentas de gestão engessadas, onde as atualizações precisam de recarregamentos constantes da página ("F5") e não refletem o status real de uma tarefa de forma instantânea. Além disso, plataformas tradicionais frequentemente negligenciam a estética e a fluidez, criando um ambiente de trabalho desmotivador.

## ✅ A Solução (FlowSnyker)
O FlowSnyker é uma plataforma de gestão Kanban construída para ser a espinha dorsal de equipes ágeis, focada em **sincronização instantânea e excelência visual**.

Ele resolve o problema do "delay de comunicação" utilizando **Socket.io (WebSockets)** para criar um fluxo de dados bidirecional. Quando um membro da equipe move um card para "Em Progresso", a tela de todos os outros colaboradores é atualizada em milissegundos. Tudo isso é envelopado na identidade visual **"Fire Flow"** — uma interface de luxo, hiper-responsiva, com Glassmorphism, dark mode refinado e animações de altíssima performance.

---

## 🧠 Maior Desafio Técnico Superado
Garantir a persistência da conexão em tempo real (WebSockets) numa arquitetura robusta, mantendo a reatividade no Frontend através de gerenciamento de estado complexo (Zustand + Dnd-Kit), sem sacrificar a segurança.

**Sincronização de Estado Desacoplada:** Ao utilizar o `dnd-kit` para a física de "arrastar e soltar", o frontend precisa fazer um "Optimistic Update" (atualizar a tela instantaneamente para o usuário que arrastou) enquanto o Socket.io se encarrega de sincronizar o estado no backend e notificar os outros usuários simultaneamente. Sincronizar o estado local (`Zustand`) com os eventos de broadcast do servidor evitou gargalos e o temido efeito "flicker" (piscar) nos cards durante a movimentação.

---

## 🔒 Arquitetura de Convites e Compartilhamento Seguro
No FlowSnyker, a colaboração em tempo real não compromete o isolamento de dados sensíveis. Para garantir isso, a arquitetura de compartilhamento segue um **Protocolo Estrito de Autorização**:

1. **Proteção de Link (Share Bypass Prevention):** O botão "Compartilhar" gera um acesso rápido via URL (Deep Link), mas **o link em si não concede permissão mágica**. Se um usuário não autorizado colar o link `/board/123` no navegador, o middleware do Node.js bloqueia o acesso via validação JWT combinada com a verificação de propriedade do quadro, retornando um erro `403 Forbidden` absoluto.
2. **Convite Autorizado (O Único Caminho):** A única forma de ingresso no Kanban é através da funcionalidade "Convidar". O sistema requer que um membro digite o e-mail do colaborador desejado. O Backend então faz um elo criptográfico no banco de dados, injetando o ID do usuário no array de `members` do quadro. 
3. **Fluxo de Acesso Controlado:** Se o colaborador clicar no link recebido sem estar logado, a plataforma intercepta a rota via `PrivateRoute` no React e exige o login (garantindo que ele não caia direto no quadro sem sessão). Após o login, a API valida em tempo real se aquele usuário recém-logado possui a credencial daquele `boardId`, concedendo então o acesso simultâneo ao WebSocket.

---

## ✨ Principais Funcionalidades
- **Kanban em Tempo Real (WebSockets):** Movimentação de cards sincronizada milissegundo a milissegundo entre múltiplos clientes conectados simultaneamente.
- **Sistema de Presença (Avatares Online):** Integração social indicando visualmente (com avatares dinâmicos e status verde) exatamente quem está operando o quadro naquele instante, prevenindo choques de edição.
- **Drag & Drop de Baixa Latência:** Física e animações de manipulação de cards extremamente fluidas construídas com `@dnd-kit/core`.
- **Dashboard Premium (Fire Flow):** UI de alta fidelidade com micro-interações, feedback visual tátil e painéis translúcidos (Glassmorphism) com reflexos controlados.
- **Autenticação Segura JWT:** Fluxo de login/cadastro encriptado (Bcrypt) que protege tanto rotas HTTP RESTful quanto o Handshake das conexões WebSocket.

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

## 🚀 Como Executar Localmente

### 1. Requisitos
- Node.js (v18+)
- MongoDB (Local ou URL do MongoDB Atlas)

### 2. Rodando o Backend
Abra um terminal na raiz do projeto:
```bash
cd backend
npm install
```
Crie um arquivo `.env` na pasta `backend` utilizando as referências de `.env.example`.
```bash
npm run dev
```
O servidor rodará em: `http://localhost:5000`

### 3. Rodando o Frontend
Em outro terminal, na raiz do projeto:
```bash
cd frontend
npm install
npm run dev
```
Acesse a aplicação em: `http://localhost:5173`

---

## 📂 Visão Geral da Estrutura
```text
├── backend/          # Node.js, Express, Controllers, Middlewares JWT, Socket.io Handlers
├── frontend/         # React, Vite, Componentes UI Glassmorphism, Zustand Store, Dnd-Kit
└── README.md         # Documentação Arquitetural
```

---

## 👑 Autor

**Jeanderson Silva** 🤓✍️

*Desenvolvedor Full-Stack | Engenheiro Frontend | Arquiteto de Software*

Construído desde o mapeamento de arquitetura de alta performance (WebSockets) até o refinamento extremo de UI/UX focado no cenário B2B de ferramentas de produtividade.

Sinta-se à vontade para auditar as configurações de rede, explorar a lógica de reatividade local do Zustand conectada aos Sockets ou testar a interatividade da aplicação!
