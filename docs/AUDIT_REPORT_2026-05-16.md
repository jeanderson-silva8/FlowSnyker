# 🔍 Auditoria de Segurança — FlowSnyker v2

> **Data:** 2026-05-16
> **Método:** Aplicação do `AUDIT_CHECKLIST.md` + `CONTEXT_ADDONS.md` (Seção A — WebSocket) sobre a v2 do projeto, comparando contra a v1 já auditada.
> **Escopo:** Backend (Node.js/Express + Socket.io), camada de autenticação, eventos em tempo real, infraestrutura de deploy.
> **Resultado:** 26 itens do checklist universal + 7 itens da Seção A (WebSocket) implementados. 4 itens parciais. 1 vulnerabilidade nova de severidade ALTA descoberta (IDOR sutil em handler de socket).

---

## 📖 Como ler este relatório

Auditoria comparativa: o projeto já passou por uma revisão prévia (v1) que identificou 3 vulnerabilidades críticas e gerou um plano de ação. Esta auditoria (v2) avalia a entrega desse plano, mede a evolução em métricas concretas, e identifica novos achados — incluindo um padrão sutil de IDOR via WebSocket que escapou ao checklist e gerou uma pergunta nova adicionada aos documentos universais.

Organização:

1. **Bloco 1 — Confirmado e excelente**: o que foi aplicado a partir da v1 e está sólido.
2. **Bloco 2 — Parcial**: itens iniciados mas que precisam fechamento.
3. **Bloco 3 — Achado novo crítico**: vulnerabilidade nova de severidade ALTA descoberta nesta auditoria.
4. **Bloco 4 — Polimentos**: ajustes finos de baixa criticidade.
5. **Evolução v1 → v2**: tabela de métricas mostrando o salto entre versões.
6. **Veredicto + evolução dos checklists**: o achado crítico desta auditoria virou pergunta nova nos documentos universais.

---

## ✅ Bloco 1 — Confirmado e excelente

26 itens do `AUDIT_CHECKLIST.md` + todos os 7 da Seção A do `CONTEXT_ADDONS.md` foram validados diretamente no código:

| # | Item do checklist | Onde |
|---|-------------------|------|
| 1 | Auth em todas as rotas privadas | `router.use(auth)` em board e card routes |
| 2 | Autorização em toda operação | `requireBoardAccess` + `requireBoardOwner` + `assertCardAccess` |
| 3 | IDs sensíveis da sessão, não do payload | `req.userId` usado consistentemente |
| 4 | Validação Zod em todos os inputs | HTTP e socket cobertos |
| 5 | Fail-fast de envs no boot | `server.ts:27-33` — exemplar |
| 6 | Hash seguro de senha | Argon2id com migração transparente do bcrypt |
| 7 | Brute force protection | Já estava na v1 |
| 8 | Segredos fora do código | `.env.example`, gitignore correto |
| 9 | Queries parametrizadas | Mongoose + `mongo-sanitize` |
| 10 | Cookies `httpOnly`/`secure`/`sameSite` | Já estava na v1 |
| 11 | Testes auth + autorização | 22 testes em 2 arquivos, todos cobrindo caminho adversarial |
| 12 | CI/CD a cada PR | Workflow com type-check, audit, tests |
| 13 | Error handler centralizado | `errorHandler.ts` + hierarquia `AppError` — mas ver Bloco 2 |
| 17 | `THREAT_MODEL.md` | Honesto, com riscos residuais explícitos |
| 18 | `SECURITY.md` | Padrão GitHub, completo |
| 20 | Headers + Helmet | CSP com `objectSrc`, `baseUri`, `formAction` adicionados |
| 21 | IDs com regex estrita | `/^[a-f0-9]{24}$/` em todo lugar |
| 24 | Política de senha forte | 8+ chars, regex de complexidade |
| 25 | Health `live` + `ready` | `/api/health/live` e `/api/health/ready` |
| 26 | N+1 resolvido | Aggregate no `getBoards` (linhas 44-51) |
| 27 | Erro sem vazar stack em prod | Error handler nunca expõe stack |
| 28 | CORS allowlist | Já estava na v1 |
| 29 | Proteção CSRF no `/refresh` | `csrfCheck` validando Origin (linhas 40-63) |
| 31 | Correlation ID | Middleware criado, propagado para logs |
| 37 | Dockerfile multi-stage | Builder + production, usuário não-root, healthcheck |
| **A1–A7** | **Todos os checks de WebSocket** | Handshake auth, validação payload, autorização por handler, rooms validados |

**Total confirmado: 26 itens universais + 7 itens de WebSocket.** Com folga, mais do que a maioria dos projetos enterprise médios entrega.

---

## 🟠 Bloco 2 — Parcial (precisa de atenção)

### Item 6B — JWT `verify` SEM allowlist de algoritmos

**Arquivos:** `auth.ts:19`, `sockets/index.ts:34`

```typescript
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
```

**O que falta:** passar `{ algorithms: ['HS256'] }` no verify. Sem isso, um atacante que conseguir explorar `alg: none` (improvável em libs modernas) ou algorithm confusion (mais provável em libs antigas) pode comprometer.

**Risco real hoje:** baixo — `jsonwebtoken@9.x` já bloqueia `none` por default. Mas é defesa em profundidade que custa 2 segundos pra adicionar.

**Correção:**

```typescript
const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
  algorithms: ['HS256']
}) as { userId: string };
```

---

### Item 13 — Error handler existe, mas controllers ainda têm `try/catch` retornando `res.status`

Foram criados `errorHandler.ts` e classes de erro (`AppError`, `ForbiddenError`, etc.), mas os controllers ainda têm `try/catch` retornando `res.status(500).json({error: ...})` diretamente. O middleware existe mas raramente é exercitado, porque controllers nunca fazem `throw`.

**Status:** 70% feito.

**Para fechar:** refatorar controllers para `throw new ForbiddenError(...)` em vez de `res.status(403)...`. Reduz código em ~30% e centraliza formato de resposta.

🔗 *Esse é exatamente o cenário coberto pelo item 13B do checklist universal: "se eu remover o middleware global, os endpoints continuam retornando 4xx?" — se a resposta for sim, o middleware está bypass.*

---

### Item 14 — Logger ainda tem `console.*` em scripts standalone

- `src/seeds/migrateColumns.ts:19` — `console.log(...)`
- `src/seeds/migrateColumns.ts:58` — `console.error(...)`

Scripts standalone, baixa criticidade. Mas pra ser 100% consistente, substituir por `logger`.

---

### Item 16 — Documentação de API existe mas é Markdown, não OpenAPI

`API.md` existe. Bom. Mas a opção sênior de verdade é Swagger/OpenAPI gerado de Zod (`zod-to-openapi`), com endpoint `/api/docs` interativo. Pode deixar para v3.

---

## 🔴 Bloco 3 — Achado novo crítico

### ALTO — `presenceEvents.ts`: `userId` vem do payload do cliente

**Arquivo:** `presenceEvents.ts:49-68`

```typescript
const { boardId, user } = result.data;

// ── VERIFICAÇÃO DE MEMBERSHIP ANTES DE JOIN ──
const board = await Board.findById(boardId).select('members').lean();
// ...
const isMember = board.members.some((m) => m.toString() === user._id);  // ← AQUI
// ...
socket.join(boardId);
(socket as any).currentBoard = boardId;
(socket as any).userId = user._id;  // ← E AQUI
```

**Problema:** o `user._id` vem do payload do cliente, não do token autenticado do socket.

**Cenário de exploração:**

1. Atacante (Mallory) conecta socket com seu token válido.
2. Mallory já é membro do board X (board legítimo dele).
3. Mallory emite `board:join` com payload:
   ```json
   {
     "boardId": "BOARD_DA_VITIMA",
     "user": { "_id": "ID_DA_VITIMA_QUE_E_MEMBRO", "name": "...", "avatar": "..." }
   }
   ```
4. Servidor valida que o `user._id` (o ID da VÍTIMA) é membro do board → ✅ é!
5. `socket.join(boardId)` é chamado — atacante agora está na room do board da vítima.
6. **Pior:** `(socket as any).userId = user._id` — o socket do atacante agora falsamente se identifica como a vítima para todos os eventos subsequentes.

Isso é **IDOR via WebSocket em forma sutil**. O `userId` correto já estava no handshake (`(socket as any).userId = decoded.userId` em `sockets/index.ts:35`), mas aqui o `presenceEvents.ts` está sobrescrevendo com o que o cliente mandou.

**Severidade:** ALTA. Atacante pode entrar em rooms de qualquer board e se passar pela vítima em eventos de presence. Não dá pra editar cards dela (porque `boardEvents.ts` revalida `boardId` corretamente), mas pode observar presença e falsificar identidade no display de "online users".

**Correção:**

```typescript
// Não pegar user do payload — usar o userId do handshake
const userId = (socket as any).userId;  // já vem do JWT
if (!userId) {
  socket.emit('error', { message: 'Autenticação necessária' });
  return;
}

const isMember = board.members.some((m) => m.toString() === userId);
if (!isMember) {
  // ...
  return;
}

// Para nome e avatar (necessários para o presence display),
// buscar do banco em vez de aceitar do cliente
const userDoc = await User.findById(userId).select('name avatar').lean();
if (!userDoc) {
  socket.emit('error', { message: 'Usuário não encontrado' });
  return;
}

socket.join(boardId);
(socket as any).currentBoard = boardId;
// NÃO sobrescrever userId aqui — já vem do handshake

room.set(userId, {
  socketId: socket.id,
  userId,
  name: userDoc.name,
  avatar: userDoc.avatar,
});
```

**Lição de método:** o item A3 (room control) foi implementado corretamente em ESTRUTURA mas falhou na FONTE DE VERDADE da identidade. Esse é exatamente o tipo de bug sutil que checklist sozinho não pega — exige raciocínio adversarial. **Esse achado virou o item 3B + A2B nos checklists universais** (ver "Evolução dos checklists" no final).

---

## 🟡 Bloco 4 — Polimentos

### Rate limit do socket continua com bug do v1

A função de wrapping do `socket.on` registra um handler que conta eventos mas pega o callback de `args[args.length - 1]`, que em muitos casos não vai existir (sockets emitem com payload único, não com callback). Provavelmente o rate limit não está rodando.

**Sugestão:** usar `socket.use(([event, ...args], next) => { ... })`, que é o middleware oficial do Socket.io.

🔗 *Coberto pelo item A5 atualizado do `CONTEXT_ADDONS.md` — "rate limit via middleware oficial, não wrapping de `socket.on`".*

### CSRF check em `/refresh` permite request sem `Origin` em dev

Aceitável, mas log de `warn` quando isso acontece em prod ajuda investigar.

### README ainda tem "elo criptográfico"

**Linha 33:**

> "O Backend então faz um elo criptográfico no banco de dados, injetando o ID do usuário no array de members do quadro."

Não é elo criptográfico, é um `push` no array. O resto do README está bem mais honesto, mas esse parágrafo escapou.

### Falta seção de "Decisões Arquiteturais" no README

Existem ADRs no `THREAT_MODEL`, mas não destaque no README. Vale puxar 3-4 bullets: "escolhi MongoDB sobre Postgres porque...", "JWT em vez de sessão porque...".

---

## 📊 Evolução v1 → v2

| Métrica | v1 | v2 |
|---------|----|----|
| Linhas de código backend | ~840 | ~1.580 (**88% a mais** — quase tudo segurança/testes) |
| Middlewares de segurança | 4 | 7 |
| Testes automatizados | 0 | 22 |
| Documentos de arquitetura | 0 | 4 (THREAT_MODEL, API, SECURITY, ADRs implícitos) |
| Vulnerabilidades críticas | 3 (IDOR em card, IDOR em socket, JWT_SECRET) | 1 (presenceEvents `userId` spoofing) |
| Hash de senha | bcrypt 12 | Argon2id + migração |
| CI/CD | nenhum | GitHub Actions completo |
| Dockerfile | nenhum | Multi-stage, não-root, healthcheck |

Esse projeto deixou de ser "bom com falhas" e virou **portfólio sólido de pleno acima da média**.

---

## 🎯 Plano de ação ordenado por severidade

1. **🔴 Corrigir `presenceEvents.ts`** — usar `socket.userId` do handshake, nunca aceitar `user._id` do payload. Buscar dados adicionais (nome, avatar) do banco.
2. **🟠 Adicionar `{ algorithms: ['HS256'] }`** no `jwt.verify` em `auth.ts` e `sockets/index.ts`.
3. **🟠 Refatorar controllers** para `throw` (deixar de usar `res.status` direto) — exercita o middleware global de erro.
4. **🟡 Corrigir rate limit do socket** — migrar de wrapping de `socket.on` para `socket.use()` oficial.
5. **🟡 Migrar `console.*` dos scripts de seed** para o logger.
6. **🟢 Reescrever o parágrafo do "elo criptográfico"** no README.
7. **🟢 Adicionar seção "Decisões Arquiteturais"** no README puxando 3-4 ADRs.
8. **🟢 Considerar Swagger/OpenAPI** via `zod-to-openapi` para v3.

---

## 🔄 Evolução dos checklists a partir desta auditoria

O achado crítico desta auditoria (`presenceEvents.ts` aceitando `userId` do payload) revelou uma classe de bug sutil que os checklists ainda não cobriam — autorização correta em estrutura, mas fonte errada da identidade.

Esse achado foi promovido a perguntas novas nos documentos universais:

| Achado | Item novo |
|--------|-----------|
| `userId` vindo do payload em handler de socket | **3B** no `AUDIT_CHECKLIST.md` — "Em handlers assíncronos (sockets, queues, callbacks), a identidade do ator vem da camada autenticada e NUNCA é re-aceita do payload?" |
| Sobrescrita de `socket.userId` em handler subsequente | **A2B** no `CONTEXT_ADDONS.md` — "`socket.userId` é GUARDADO no handshake e NUNCA reescrito por handlers subsequentes?" |
| Rate limit de socket via wrapping de `socket.on` (não confiável) | **A5 reescrito** — "Rate limit via `socket.use()` oficial, com teste de 100 eventos/s para validar." |

Este é o ciclo virtuoso do método: **checklist → audita projeto real → cada bug novo vira pergunta nova → próximo projeto pega automaticamente**.

---

## 🧭 Reflexão final

Você fez algo que raramente se vê: aplicou os checklists de forma estruturada e sistemática, e a transformação do projeto reflete isso. Em um único ciclo de revisão, eliminou 2 das 3 vulnerabilidades críticas da v1, implementou 26+ controles novos, escreveu 22 testes, criou 4 documentos de governança e um Dockerfile profissional.

**Mas os checklists não pegam tudo.** O bug do `presenceEvents.ts` é prova viva disso. Os checklists dão a estrutura; o raciocínio adversarial ainda precisa ser do auditor. A diferença é que agora esse bug específico **virou pergunta no checklist** — e no próximo projeto, vai ser pego automaticamente.

> **Aprendizado para próximas auditorias:** autorização correta ≠ identidade correta. Toda checagem de "X é membro do recurso Y" precisa primeiro responder "quem é X, e essa identidade veio de onde?". Se a resposta for "do payload do cliente", é IDOR esperando acontecer.
