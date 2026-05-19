# FlowSnyker — Guia de Deploy

Stack: **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (database).

---

## 1. MongoDB Atlas

1. No painel do Atlas, vá em **Network Access** → **Add IP Address** → `0.0.0.0/0` (permite Render)
2. Copie sua connection string em **Database** → **Connect** → **Drivers**
3. Substitua `<password>` pela senha do usuário e adicione o nome do banco no path: `.../flowsnyker?retryWrites=true...`

## 2. Push do código pro GitHub

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/flowsnyker.git
git push -u origin main
```

## 3. Backend no Render

1. Acesse https://dashboard.render.com → **New +** → **Web Service**
2. Conecte o repositório do GitHub
3. O `render.yaml` já está em `backend/`, mas se preferir configurar manual:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Em **Environment**, adicione:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = sua string do Atlas
   - `JWT_SECRET` = gere com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `JWT_REFRESH_SECRET` = idem (outro valor)
   - `CLIENT_URL` = `https://SEU-APP.vercel.app` (preencha depois do passo 4 e atualize)
5. Deploy → anote a URL gerada (ex.: `https://flowsnyker-api.onrender.com`)

## 4. Frontend no Vercel

1. Acesse https://vercel.com/new → importe o repositório
2. **Root Directory**: `frontend`
3. **Framework Preset**: Vite (autodetectado)
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = `https://flowsnyker-api.onrender.com/api` (URL do Render + `/api`)
5. Deploy → anote a URL (ex.: `https://flow-snyker.vercel.app`)

## 5. Ajuste final do CORS

Volte no Render → seu serviço → **Environment** → edite `CLIENT_URL` com a URL do Vercel:
```
CLIENT_URL=https://flow-snyker.vercel.app
```
Suporta múltiplas origens separadas por vírgula:
```
CLIENT_URL=http://localhost:5173,https://flow-snyker.vercel.app
```
O Render redeploya automaticamente.

## 6. Teste

Abra a URL do Vercel, registre um usuário e crie um quadro. Se aparecer "Erro ao fazer login", abra o DevTools → Network — provavelmente é CORS ou `MONGODB_URI` errado.

---

## Notas

- **Free tier do Render dorme após ~15min sem requests** — primeira request depois disso demora ~30s pra acordar.
- **WebSocket (Socket.IO)** funciona no Render free.
- **Custom domain**: ambos suportam. Adicione no painel respectivo.
- **Logs**: Render → seu serviço → aba **Logs**. Vercel → projeto → **Deployments** → clique no deploy → **Function Logs**.
