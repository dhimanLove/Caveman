<div align="center">

# Caveman

<img src="https://github.com/dhimanLove/Caveman/blob/main/public/logo-256.png" alt="Caveman">

</div>

**TL;DR:** AI Provider (Required) is a full‑stack, TypeScript‑based AI documentation generator that scans GitHub repositories, extracts their stack, and produces production‑ready README files using Groq. It runs on TanStack Start, React 19, Tailwind CSS v4, and Firebase, and can be deployed to any Vite‑compatible host.

> Full‑stack AI documentation generator and repository dependency visualizer built with TanStack Start, React 19, and Tailwind CSS v4.

![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=flat-square)

---

## Installation

**TL;DR:** Install dependencies with `npm` or `bun`, set required environment variables, and start the dev server.

1. **Prerequisites**  
   - Node 20+ (or Bun 1.0+)  
   - GitHub personal access token with `repo` scope (for private repos)  
   - Groq API key (`GENERATIVE_KEY`)  
   - Firebase project with Firestore and Authentication enabled

2. **Clone the repo**  
   ```bash
   git clone https://github.com/dhimanLove/Caveman.git
   cd Caveman
   ```

3. **Install dependencies**  
   ```bash
   # Using npm
   npm install

   # Or using Bun
   bun install
   ```

4. **Configure environment**  
   Create a `.env` file at the project root with the following keys:

   ```dotenv
   GITHUB_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXX
   GROQ_API_KEY=sk-XXXXXXXXXXXXXXXXXXXX
   FIREBASE_PROJECT_ID=your-firebase-project
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   > **Security note:** Never commit `.env` to source control. The repository already contains a `.gitignore` entry for it.

5. **Run the development server**  
   ```bash
   # Using npm
   npm run dev

   # Or using Bun
   bun run dev
   ```

   The app will be available at `http://localhost:5173`.

---

## Usage

**TL;DR:** Run the dev server, visit `/generate` to scan a repo, or call the exported `groqChatComplete` function programmatically.

### Web UI

1. Start the dev server as described above.  
2. Open `http://localhost:5173/generate`.  
3. Enter a GitHub repository URL and click **Generate README**.  
4. The UI will display the generated README and offer a download link.

### Programmatic API

```ts
import { groqChatComplete, GroqChatOptions } from '@/lib/groq-chat.server';

const options: GroqChatOptions = {
  apiKey: process.env.GROQ_API_KEY!,
  model: 'llama3-70b-8192',
  messages: [
    { role: 'system', content: 'You are a helpful README generator.' },
    { role: 'user', content: 'Generate a README for a TypeScript project.' },
  ],
  temperature: 0.2,
};

const result = await groqChatComplete(options);
console.log(result.text); // The generated README content
```

### Server Entry (Cloudflare Workers / Edge)

```ts
import server from '@/server';

addEventListener('fetch', (event) => {
  event.respondWith(server.fetch(event.request));
});
```

---

## API Docs

**TL;DR:** The public API consists of the `groqChatComplete` helper, rate‑limit utilities, and the default server entry.

| Export | Type | Parameters | Returns | Description |
|--------|------|------------|---------|-------------|
| `groqChatComplete(options: GroqChatOptions): Promise<GroqChatResult>` | Function | `options` - `GroqChatOptions`<br>• `apiKey` (string)<br>• `model` (string)<br>• `baseURL` (string, optional)<br>• `messages` (ChatMessage[])<br>• `temperature` (number, optional)<br>• `maxTokens` (number, optional)<br>• `maxRetries` (number, optional) | `Promise<GroqChatResult>` | Sends a chat completion request to Groq. Handles retries and parses the response. |
| `advanceWindow(timestamps: unknown, now: number, max: number, windowMs: number): WindowResult` | Function | `timestamps` - stored timestamps array<br>• `now` - current epoch ms<br>• `max` - maximum allowed requests<br>• `windowMs` - window in ms | `WindowResult` - `{ allowed, remaining, resetAt, timestamps }` | Consumes a slot in a sliding window rate limiter. |
| `windowState(timestamps: unknown, now: number, max: number, windowMs: number): { count, remaining, cooldownEnd, windowStart }` | Function | Same as `advanceWindow` | Read‑only snapshot of the current window state. |
| `default.fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>` | Method | `request` - incoming HTTP request<br>• `env` - environment variables<br>• `ctx` - context object | `Promise<Response>` - normalizes SSR errors and returns a 500 page on catastrophic failures. | The entry point used by TanStack Start's server‑side rendering. |

**Types**

```ts
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GroqChatOptions = {
  apiKey: string;
  model: string;
  baseURL?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
};

export type GroqChatResult = {
  text: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
};

export interface WindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  timestamps: number[];
}
```

---

## Contributing

**TL;DR:** Fork, create a feature branch, run tests, and open a PR. Follow the linting and formatting rules.

1. **Fork & clone**  
   ```bash
   git clone https://github.com/your-username/Caveman.git
   cd Caveman
   ```

2. **Create a feature branch**  
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Install dependencies** (see Installation).

4. **Run lint & format**  
   ```bash
   npm run lint
   npm run format
   ```

5. **Run tests** (if any)  
   ```bash
   npm test
   ```

6. **Commit** following the conventional commit format.

7. **Push** and open a Pull Request on GitHub.

---

## License

**TL;DR:** This project is licensed under the MIT License.

MIT © 2024 dhimanLove

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Language** | TypeScript (5.8.3) | Strong typing, modern JS features |
| **Framework** | TanStack Start (1.168.26) | Full‑stack routing, SSR, data fetching |
| **UI** | React 19 (19.2.0) | Component rendering |
| **State** | TanStack React Query (5.101.1) | Server state management |
| **Styling** | Tailwind CSS (4.2.1) | Utility‑first CSS |
| **Animations** | Framer Motion (12.42.2), GSAP (3.15.0) | Rich UI interactions |
| **Routing** | TanStack React Router (1.170.16) | Declarative routing |
| **Build** | Vite (8.0.16) | Fast dev server, ESBuild bundler |
| **Linting** | ESLint (9.32.0) + Prettier (3.7.3) | Code quality |
| **Testing** | Jest (via ts-prune) | Unit tests (placeholder) |
| **Auth & DB** | Firebase (12.16.0) | Authentication, Firestore |
| **AI** | Groq (via custom wrapper) | Generative model integration |
| **Utilities** | clsx, tailwind-merge, class-variance-authority | CSS class handling |
| **Fonts** | @fontsource-variable/inter, @fontsource-variable/jetbrains-mono | Typography |

---

## Folder Structure

**TL;DR:** The repository follows a conventional Vite + TanStack Start layout with a dedicated `src` directory for application code.

```text
Caveman/
├── .gitignore
├── .prettierignore
├── .prettierrc
├── AGENTS.md
├── README.md
├── bun.lock
├── bunfig.toml
├── components.json
├── database.rules.json
├── eslint.config.js
├── firestore.rules
├── package-lock.json
├── package.json
│   ├── _headers
│   ├── apple-touch-icon.png
│   ├── favicon-16.png
│   ├── favicon-32.png
│   │   ├── 3d-printer.svg
│   │   ├── calendar.svg
│   │   ├── check.svg
│   │   ├── copy.svg
│   │   ├── download.svg
│   │   ├── globe.svg
│   │   ├── handshake.svg
│   │   ├── heart.svg
│   │   ├── lock.svg
│   │   ├── mail.svg
│   │   ├── plus.svg
│   │   ├── rocket.svg
│   │   ├── search.svg
│   │   ├── settings.svg
│   │   ├── star.svg
│   │   ├── trash.svg
│   │   ├── upload.svg
│   │   ├── user.svg
│   ├── logo-256.png
│   └── ... and 69 more files
├── src/
│   ├── lib/
│   │   ├── error-capture.ts
│   │   ├── error-page.tsx
│   │   ├── groq-chat.server.ts
│   │   ├── rate-window.server.ts
│   │   └── ...
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── generate.tsx
│   │   ├── graph.tsx
│   │   ├── privacy.tsx
│   │   ├── sitemap[.]xml.tsx
│   │   └── terms.tsx
│   ├── routeTree.gen.ts
│   ├── server.ts
│   └── ...
└── vite.config.ts
```

---

## Features

**TL;DR:** Caveman automates README generation, visualizes repository dependencies, and integrates AI for content creation.

- **Automated Repository Scanning** - Recursively traverses GitHub repos, extracts file trees, and parses manifest files (`package.json`, `Cargo.toml`, etc.).
- **Deterministic Stack Detection** - Classifies languages, build tools, databases, and frameworks across multiple ecosystems.
- **AI‑Powered Documentation** - Uses Groq (OpenAI‑compatible) to generate structured, production‑ready README files with configurable style and tone.
- **Full‑stack UI** - Built with TanStack Start, React 19, and Tailwind CSS v4 for a responsive, accessible interface.
- **Rate Limiting** - Sliding‑window limiter backed by Firestore to protect the AI endpoint.
- **Secure Authentication** - GitHub OAuth for private repo access; Firebase Auth for user sessions.
- **Extensible Architecture** - Modular route tree, pluggable AI provider, and clear separation of concerns.

---

## Architecture

**TL;DR:** Caveman is a TanStack Start application that uses Firebase for auth and rate limiting, and Groq for AI inference.

1. **Entry Point** - `src/server.ts` exports a `fetch` handler that delegates to TanStack Start's server entry. It normalizes SSR errors and returns a friendly 500 page on catastrophic failures.
2. **Routing** - `src/routes/*.tsx` define the UI routes. `routeTree.gen.ts` generates a typed route tree for compile‑time safety.
3. **AI Layer** - `src/lib/groq-chat.server.ts` wraps the Groq API, handling retries, token limits, and error parsing.
4. **Rate Limiting** - `src/lib/rate-window.server.ts` implements a sliding‑window algorithm stored in Firestore. The `advanceWindow` function consumes a slot; `windowState` reports the current state.
5. **UI Layer** - React components under `src/components/` use Tailwind CSS for styling and Framer Motion/GSAP for animations.
6. **Build** - Vite compiles the app, with `@tanstack/react-start` plugin handling server‑side rendering and route prefetching.
7. **Deployment** - The Vite build output is a static bundle that can be served by Vercel, Netlify, or any static host. Firebase functions can host the server entry if needed.

---

## Performance

**TL;DR:** Vite's ESBuild pipeline delivers a highly optimized bundle; the server entry is stateless and scales horizontally.

- **Build Size** - Vite's tree‑shaking and code‑splitting reduce the final bundle to a few hundred kilobytes, suitable for CDN delivery.
- **Concurrency
