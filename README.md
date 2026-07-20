# SupportCue

An AI-powered, multi-tenant customer support platform. Companies upload their documentation, and an embeddable chat widget answers customer questions from it — escalating to a human agent when the AI can't help.

Built on the MERN stack with a Gemini-backed RAG pipeline and real-time Socket.IO messaging.

## Features

- **RAG-grounded AI replies** — PDFs are chunked, embedded via Gemini, and retrieved with MongoDB Atlas Vector Search (with an in-memory cosine-similarity fallback) so answers cite the company's own docs instead of hallucinating.
- **Multi-tenant by design** — every document, chunk, chat, and session is scoped to a `companyId`.
- **Embeddable widget** — a single `<script>` tag drops the chat onto any external site; widget routes run open CORS with their own rate limit, separate from the dashboard API.
- **Human escalation** — conversations hand off from AI to a live agent over Socket.IO, with room and notification handling.
- **Role-based dashboards** — separate views for superusers, company admins, and support agents.
- **Email notifications** — agent invitations and escalation alerts via SMTP.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui (Radix) |
| Backend | Node.js, Express 4, Socket.IO |
| Database | MongoDB (Mongoose), Atlas Vector Search |
| AI | Google Gemini 2.5 Flash + Gemini embeddings |
| Auth | JWT, bcrypt |

## Project Structure

```
backend/
  server.js              Express + Socket.IO entry point
  src/
    config/              DB connection, env loading
    controllers/         Route handlers (auth, chat, company, KB, ...)
    models/              Mongoose schemas
    routes/              Express routers
    services/            Gemini, embeddings, RAG, PDF parsing, email
    socket/              Socket.IO handlers (messages, rooms, escalation)
    scripts/             Superuser seeding
frontend/
  src/
    components/          Dashboards, chat panel, embeddable widget UI
    pages/               Home, Dashboard, CompanySetup
    api/                 Axios client
  public/widget.js       Standalone embed script
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB database (Atlas recommended — required for vector search)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Backend

```bash
cd backend
npm install
cp env.example .env    # then fill in your values
npm run dev
```

Runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

Runs on `http://localhost:5173`.

### Seed a superuser

```bash
cd backend
npm run seed:superuser
```

> **Change the default credentials** in `src/scripts/seedSuperuser.js` before running this, and rotate them immediately after first login.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing dashboard JWTs |
| `WIDGET_SECRET` | Secret for widget session tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CORS_ORIGIN` | Comma-separated allowed dashboard origins |
| `FRONTEND_URL` | Public frontend URL (used in emails) |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials for outbound email |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SOCKET_URL` | Backend base URL (no trailing slash) |

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Vector Search Setup

For production, create an Atlas Search index named `vector_index` on the `documentchunks` collection, indexing the `embedding` field with `companyId` as a filter field. Without it, the app falls back to in-memory cosine similarity, which is capped at 500 chunks per query and will not scale.

## Embedding the Widget

```html
<script src="https://your-backend.example.com/widget.js" data-company-id="YOUR_COMPANY_ID"></script>
```

## License

MIT
