<div align="center">
  <img src="public/logo-256.png" alt="tanstack_start_ts logo" width="80" height="80" />
  <h1>tanstack_start_ts</h1>
  <p>Full-stack AI documentation generator and repository dependency visualizer built with TanStack Start, React 19, and Tailwind CSS v4.</p>

  <p>
    <a href="https://tanstack.com/start"><img src="https://img.shields.io/badge/TanStack%20Start-v1.168.26-FF4154?style=flat-square&logo=tanstack&logoColor=white" alt="TanStack Start" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-v19.2.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-v5.8.3-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind%20CSS-v4.2.1-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-v8.0.16-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-v12.16.0-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" /></a>
  </p>
</div>

---

## Features

- **Automated Repository Scanning**: Recursively scans GitHub repositories, extracts file trees, and reads manifest metadata (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, etc.).
- **Deterministic Stack Detection**: Classifies languages, build tools, databases, and frameworks across JS/TS, Python, Rust, Go, C/C++, and containerized ecosystems.
- **AI-Powered Documentation Generation**: Generates structured, production-ready README files using Groq (OpenAI-compatible `gpt-oss` models) with automatic primary/fallback model selection and configurable style (`minimal`, `standard`, `comprehensive`) and tone.
- **Interactive Markdown Preview & Editor**: In-browser preview, raw syntax view, and live editable markdown pane with character statistics, clipboard copying, and file export.
- **Codebase Dependency Visualizer**: Interactive tree mapping directory hierarchy and component relationships on `/graph`.
- **Authentication & Multi-Tier Rate Limiting**: Firebase client authentication with Google Identity Toolkit verification, IP-based rate protection, and Firestore/in-memory quota management.

---

## Routes

File-based routing is powered by **TanStack Router** in `src/routes/`:

| Route          | Source File                   | Description                                                                    |
| :------------- | :---------------------------- | :----------------------------------------------------------------------------- |
| `/`            | `src/routes/index.tsx`        | Landing page, feature overview, interactive demo preview, and FAQ.             |
| `/generate`    | `src/routes/generate.tsx`     | Core generator interface with configuration options, live preview, and editor. |
| `/graph`       | `src/routes/graph.tsx`        | Repository dependency and file structure visualizer.                           |
| `/privacy`     | `src/routes/privacy.tsx`      | Privacy policy page.                                                           |
| `/terms`       | `src/routes/terms.tsx`        | Terms of service page.                                                         |
| `/sitemap.xml` | `src/routes/sitemap[.]xml.ts` | Server-rendered XML sitemap for search engines.                                |

---

## Project Structure

```text
├── public/                    # Static assets, icons, manifest, and favicons
├── src/
│   ├── components/            # UI components
│   │   ├── auth/              # Sign-in modals and cooldown timer components
│   │   ├── auto-detect/       # Repository discovery and tech stack badges
│   │   ├── graph/             # Codebase visualizer canvas
│   │   ├── icons/             # Hand-built inline SVG icon wrappers
│   │   ├── layout/            # Navbar, cooldown banner, and smooth scroll containers
│   │   ├── marketing/         # Landing page hero and demo cards
│   │   ├── preview/           # Interactive sample README preview
│   │   └── ui/                # Radix-based primitives (Sheet, Tabs, ScrollArea, etc.)
│   ├── hooks/                 # Custom React hooks (useAuth, useGenerate)
│   ├── lib/                   # Server functions, AI integration, rate limiters, auth
│   │   ├── ai-gateway.server.ts       # AI model resolution (primary + fallback)
│   │   ├── firebase-verify.server.ts  # Firebase auth token validator & sanitization
│   │   ├── firestore-rate-limit.server.ts # Firestore quota and usage persistence
│   │   ├── generate.server.ts         # Secure server function endpoint for generation
│   │   ├── groq-chat.server.ts        # Direct OpenAI-compatible chat completion client
│   │   ├── readme.functions.ts        # GitHub tree scanner & prompt orchestration
│   │   └── request-guard.server.ts    # IP-based rate limiting and origin checks
│   ├── routes/                # TanStack Start file-based routes
│   ├── routeTree.gen.ts       # Auto-generated TanStack Router route tree
│   ├── router.tsx             # Router creation with React Query integration
│   ├── server.ts              # Server entry point
│   ├── start.ts               # SSR entry handler
│   └── styles.css             # Global styles and Tailwind CSS v4 definitions
├── .env.example               # Environment variable templates
├── components.json            # Radix/shadcn component configuration
├── package.json               # Package metadata, dependencies, and scripts
├── tsconfig.json              # TypeScript compiler configuration
└── vite.config.ts             # Vite bundler, plugins, and SSR configuration
```

---

## Environment Variables

Create a `.env` file in the project root:

```ini
# AI Provider (Required)
GENERATIVE_KEY=gsk_your-groq-key

# GitHub Token (Optional - increases GitHub API rate limits for scanning)
GITHUB_TOKEN=ghp_your-token-here

# AI Model Override (Optional - defaults to openai/gpt-oss-120b on Groq,
# with automatic fallback to openai/gpt-oss-20b on rate limits)
AI_MODEL=openai/gpt-oss-120b

# Firebase Auth Client Config (Required for sign-in)
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/dhimanLove/Caveman.git
cd Caveman

# Using npm (package-lock.json present)
npm install

# Or using bun (bun.lock present)
bun install
```

---

## Usage

All commands are derived directly from `package.json`:

| Command             | Action                                              |
| :------------------ | :-------------------------------------------------- |
| `npm run dev`       | Start the local Vite development server.            |
| `npm run build`     | Build the production application bundle with Nitro. |
| `npm run build:dev` | Build the application bundle in development mode.   |
| `npm run preview`   | Preview the production build locally.               |
| `npm run lint`      | Run ESLint across the codebase.                     |
| `npm run format`    | Run Prettier to format all codebase files.          |

---

## Testing

There are currently no automated unit or integration tests configured in this repository.

---

<div align="center">
  <sub>Repository: <a href="https://github.com/dhimanLove/Caveman">dhimanLove/Caveman</a></sub>
</div>
