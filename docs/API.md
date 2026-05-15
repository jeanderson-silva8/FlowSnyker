# FlowSnyker API — Documentação

## Base URL

```
Produção: https://flowsnyker-api.onrender.com
Local:    http://localhost:5000
```

## Autenticação

Todas as rotas (exceto auth) requerem o header:
```
Authorization: Bearer <access_token>
```

O access token tem validade curta (~15 min). Use `/api/auth/refresh` para renovar via cookie HttpOnly.

---

## Endpoints

### Auth (`/api/auth`)

| Método | Rota | Autenticação | Rate Limit | Descrição |
|--------|------|:---:|:---:|-----------|
| POST | `/register` | ❌ | 5/min | Criar conta |
| POST | `/login` | ❌ | 5/min | Login |
| POST | `/refresh` | Cookie | ❌ | Renovar access token |
| GET | `/me` | ✅ Bearer | ❌ | Dados do usuário logado |
| POST | `/logout` | Cookie | ❌ | Invalidar refresh token |
| POST | `/forgot-password` | ❌ | 5/min | Solicitar reset de senha |
| POST | `/reset-password/:token` | ❌ | 5/min | Redefinir senha |

#### POST `/register`
```json
// Request Body
{
  "name": "João Silva",          // 2-50 chars
  "email": "joao@email.com",
  "password": "MinhaSenh4"       // 8+ chars, 1 maiúscula, 1 minúscula, 1 número
}

// Response 201
{
  "user": { "_id": "...", "name": "...", "email": "...", "avatar": "..." },
  "accessToken": "eyJ..."
}

// Response 400
{ "error": "Este email já está em uso" }
```

#### POST `/login`
```json
// Request Body
{ "email": "joao@email.com", "password": "MinhaSenh4" }

// Response 200
{ "user": { ... }, "accessToken": "eyJ..." }

// Response 401 — Credenciais inválidas
// Response 423 — Conta bloqueada (após 5 tentativas falhas)
```

#### POST `/refresh`
```
Cookie: refreshToken=<family>.<secret>
Header: Origin: https://seu-frontend.com (obrigatório em produção)

// Response 200
{ "accessToken": "eyJ...", "user": { ... } }

// Response 401 — Token ausente, inválido, expirado ou reuso detectado
```

---

### Boards (`/api/boards`)

| Método | Rota | Autorização | Descrição |
|--------|------|-------------|-----------|
| POST | `/` | Autenticado | Criar board |
| GET | `/` | Autenticado | Listar boards do usuário |
| GET | `/:id` | Membro do board | Ver board + cards |
| PUT | `/:id` | Owner do board | Atualizar board |
| DELETE | `/:id` | Owner do board | Deletar board + cards |
| POST | `/:id/invite` | Membro do board | Convidar membro |

#### POST `/`
```json
// Request
{ "title": "Sprint 23" }  // 1-100 chars

// Response 201
{ "_id": "...", "title": "Sprint 23", "owner": {...}, "members": [...], "columns": [...] }
```

#### POST `/:id/invite`
```json
// Request
{ "email": "colega@email.com" }

// Response 200 — Board atualizado com novo membro
// Response 403 — Acesso negado (não é membro)
// Response 404 — Usuário não encontrado
```

---

### Cards (`/api/cards`)

| Método | Rota | Autorização | Descrição |
|--------|------|-------------|-----------|
| POST | `/` | Membro do board | Criar card |
| PUT | `/:id` | Membro do board (do card) | Atualizar card |
| PATCH | `/:id/move` | Membro do board (do card) | Mover card |
| DELETE | `/:id` | Membro do board (do card) | Deletar card |

#### POST `/`
```json
{
  "boardId": "60f...",      // ObjectId válido
  "columnId": "60f...",
  "title": "Implementar login",  // 1-200 chars
  "description": "...",          // max 2000 chars (opcional)
  "labels": [{ "text": "Bug", "color": "red" }],  // opcional
  "priority": "high"            // low | medium | high | urgent (opcional)
}
```

---

### Health (`/api/health`)

| Rota | Descrição |
|------|-----------|
| GET `/api/health/live` | Processo vivo |
| GET `/api/health/ready` | Processo + DB conectado |
| GET `/api/health` | Legacy (retrocompatível) |

---

## WebSocket Events

### Conexão
```javascript
const socket = io(API_URL, {
  auth: { token: accessToken }  // JWT Bearer token
});
```

### Presença
| Evento | Direção | Payload | Descrição |
|--------|---------|---------|-----------|
| `board:join` | Client → Server | `{ boardId, user: { _id, name, avatar } }` | Entrar na room (valida membership) |
| `board:leave` | Client → Server | `{ boardId }` | Sair da room |
| `presence:update` | Server → Client | `{ users: [...] }` | Lista de usuários online |

### Cards
| Evento | Direção | Payload |
|--------|---------|---------|
| `card:create` | Client → Server | `{ boardId, columnId, title, description?, labels?, priority? }` |
| `card:created` | Server → Room | `{ card, columnId }` |
| `card:move` | Client → Server | `{ boardId, cardId, fromColumnId, toColumnId, newOrder }` |
| `card:moved` | Server → Room | `{ cardId, fromColumnId, toColumnId, newOrder, movedBy }` |
| `card:update` | Client → Server | `{ boardId, cardId, updates }` |
| `card:updated` | Server → Room | `{ cardId, card }` |
| `card:delete` | Client → Server | `{ boardId, cardId, columnId }` |
| `card:deleted` | Server → Room | `{ cardId, columnId }` |

### Colunas
| Evento | Direção | Payload |
|--------|---------|---------|
| `column:create` | Client → Server | `{ boardId, column: { _id, title, order } }` |
| `column:rename` | Client → Server | `{ boardId, columnId, title }` |
| `column:delete` | Client → Server | `{ boardId, columnId }` |

> **Todos os eventos de socket validam:**
> 1. Payload com Zod (formato correto)
> 2. Membership no board (autorização)

---

## Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Dados inválidos / malformados |
| 401 | Token ausente, inválido ou expirado |
| 403 | Acesso negado (não é membro/owner) |
| 404 | Recurso não encontrado |
| 423 | Conta bloqueada (lockout) |
| 429 | Muitas requisições (rate limit) |
| 500 | Erro interno (mensagem genérica, sem stack trace) |
