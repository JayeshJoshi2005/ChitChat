# ChitChat Tech Stack Flow (Complete)

This document explains each technology in the project in this order:
1. What the tech is
2. Where it is used
3. How it flows in this app
4. Alternatives

---

## 1) Node.js + npm

**What it is**  
Node.js runs the backend and npm manages scripts/dependencies.

**Where used**
- Root scripts: [package.json](E:/projects%20and%20learning/ChatApp/package.json)
- Backend scripts: [backend/package.json](E:/projects%20and%20learning/ChatApp/backend/package.json)
- Frontend scripts: [frontend/package.json](E:/projects%20and%20learning/ChatApp/frontend/package.json)

**Flow in this app**
- Root `build` installs backend + frontend dependencies and builds frontend.
- Root `start` runs backend server.
- Backend uses `node`/`nodemon`, frontend uses Vite dev/build commands.

**Alternatives**
- pnpm, Yarn, Bun runtime/package manager.

---

## 2) React

**What it is**  
UI library for component-based frontend.

**Where used**
- App bootstrap: [main.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/main.jsx)
- Routing/UI shell: [App.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/App.jsx)
- Core chat UI: [HomePage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/HomePage.jsx), [ChatContainer.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/ChatContainer.jsx), [Sidebar.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/Sidebar.jsx)

**Flow in this app**
- `main.jsx` renders React app.
- `App.jsx` gates routes by auth state.
- Pages/components consume Zustand stores and render chat, auth, profile, and video call screens.

**Alternatives**
- Vue, Svelte, Angular, Solid.

---

## 3) Vite (+ @vitejs/plugin-react)

**What it is**  
Fast frontend dev server and build tool for React.

**Where used**
- Config: [vite.config.js](E:/projects%20and%20learning/ChatApp/frontend/vite.config.js)
- Scripts: [frontend/package.json](E:/projects%20and%20learning/ChatApp/frontend/package.json)

**Flow in this app**
- `npm run dev` serves frontend locally.
- `npm run build` outputs `frontend/dist`.
- Backend serves `frontend/dist` in production.

**Alternatives**
- Webpack, Parcel, Rspack, Next.js (framework route).

---

## 4) React Router DOM

**What it is**  
Client-side routing for SPA navigation.

**Where used**
- Router setup: [main.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/main.jsx)
- Route definitions: [App.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/App.jsx)
- Route params/navigation: [VideoCallPage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/VideoCallPage.jsx)

**Flow in this app**
- BrowserRouter wraps app.
- Routes `/login`, `/signup`, `/`, `/profile`, `/settings`, `/video-call/:roomId`.
- Protected routes redirect unauthenticated users.

**Alternatives**
- TanStack Router, Reach Router (legacy), Next.js file routing.

---

## 5) Zustand

**What it is**  
Lightweight state management.

**Where used**
- Auth/socket state: [useAuthStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useAuthStore.js)
- Chat/group/message state: [useChatStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useChatStore.js)
- Theme state: [useThemeStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useThemeStore.js)

**Flow in this app**
- Auth store handles signup/login/logout/checkAuth + socket lifecycle.
- Chat store handles users/groups/messages and live subscriptions.
- Theme store persists selected DaisyUI theme in `localStorage`.

**Alternatives**
- Redux Toolkit, Jotai, Recoil, Context API.

---

## 6) Axios

**What it is**  
HTTP client for frontend API calls.

**Where used**
- Shared instance: [axios.js](E:/projects%20and%20learning/ChatApp/frontend/src/lib/axios.js)
- Consumed in stores: [useAuthStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useAuthStore.js), [useChatStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useChatStore.js)

**Flow in this app**
- Base URL points to backend `/api`.
- `withCredentials: true` sends JWT cookie.
- Used for auth, users, groups, and message REST endpoints.

**Alternatives**
- native `fetch`, ky, superagent.

---

## 7) Express.js

**What it is**  
Backend web framework for HTTP APIs.

**Where used**
- Server bootstrap: [index.js](E:/projects%20and%20learning/ChatApp/backend/src/index.js)
- App/server creation shared with Socket.IO: [socket.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/socket.js)
- Route modules: [auth.route.js](E:/projects%20and%20learning/ChatApp/backend/src/routes/auth.route.js), [message.route.js](E:/projects%20and%20learning/ChatApp/backend/src/routes/message.route.js), [group.route.js](E:/projects%20and%20learning/ChatApp/backend/src/routes/group.route.js)

**Flow in this app**
- Middleware parses JSON/form data, cookies, and CORS.
- Routes mounted under `/api/auth`, `/api/messages`, `/api/groups`.
- In production, serves frontend `dist` and fallback `index.html`.

**Alternatives**
- Fastify, Koa, NestJS, Hono.

---

## 8) MongoDB + Mongoose

**What it is**  
MongoDB is the database; Mongoose is ODM for schemas/models/queries.

**Where used**
- DB connection: [db.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/db.js)
- Models: [user.model.js](E:/projects%20and%20learning/ChatApp/backend/src/models/user.model.js), [message.model.js](E:/projects%20and%20learning/ChatApp/backend/src/models/message.model.js), [group.model.js](E:/projects%20and%20learning/ChatApp/backend/src/models/group.model.js)
- Queries in controllers/socket: [auth.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/auth.controller.js), [message.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/message.controller.js), [group.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/group.controller.js), [socket.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/socket.js)

**Flow in this app**
- Server start triggers DB connect.
- Auth creates/finds users.
- Messages and groups are stored and fetched via Mongoose models.
- Group messages populate sender details for UI rendering.

**Alternatives**
- PostgreSQL + Prisma/TypeORM/Sequelize, MySQL + ORM, Firebase.

---

## 9) JWT (jsonwebtoken) + Cookie Auth

**What it is**  
JWT creates signed auth tokens; cookies carry token securely.

**Where used**
- Token generation/cookie options: [utils.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/utils.js)
- Token verification middleware: [auth.middleware.js](E:/projects%20and%20learning/ChatApp/backend/src/middleware/auth.middleware.js)
- Auth controller calls: [auth.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/auth.controller.js)
- Cookie parsing: [index.js](E:/projects%20and%20learning/ChatApp/backend/src/index.js)

**Flow in this app**
- Signup/login generates JWT and sets `jwt` httpOnly cookie.
- Protected endpoints use middleware to verify token and attach `req.user`.
- Frontend calls `/auth/check` on app load to restore session.

**Alternatives**
- Server sessions (Redis/session store), OAuth/OIDC providers, Paseto.

---

## 10) bcryptjs

**What it is**  
Password hashing library.

**Where used**
- Hash/compare in auth: [auth.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/auth.controller.js)

**Flow in this app**
- Signup hashes plain password before DB save.
- Login compares entered password with hash.

**Alternatives**
- Argon2 (`argon2`), bcrypt (native module), scrypt.

---

## 11) Socket.IO (server + client)

**What it is**  
Bidirectional real-time event layer over WebSocket/fallback transport.

**Where used**
- Server events and room logic: [socket.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/socket.js)
- Client connection/auth user query: [useAuthStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useAuthStore.js)
- Message/group subscriptions: [useChatStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useChatStore.js)
- Video call trigger/event consumption: [MessageInput.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/MessageInput.jsx), [VideoCallPage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/VideoCallPage.jsx)

**Flow in this app**
- After auth, frontend opens socket with `userId`.
- Server tracks online users and emits `getOnlineUsers`.
- 1:1 message delivery uses `newMessage`; group uses `newGroupMessage`.
- Also used as signaling channel for WebRTC video calls (`videoOffer`, `videoAnswer`, `iceCandidate`).

**Alternatives**
- Native WebSocket (`ws`), SSE (one-way), Ably/Pusher/Firebase RTDB.

---

## 12) WebRTC (browser APIs)

**What it is**  
Peer-to-peer media transport for audio/video/screen share.

**Where used**
- Call page logic: [VideoCallPage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/VideoCallPage.jsx)

**Flow in this app**
- `getUserMedia` captures camera/mic.
- `RTCPeerConnection` with STUN servers exchanges SDP/ICE via Socket.IO signaling.
- Remote streams are rendered in peer video components.
- Screen-share swaps local video track via `replaceTrack`.

**Alternatives**
- WebRTC with SFU/MCU via mediasoup/Janus/Jitsi, Twilio Video, Agora.

---

## 13) Cloudinary

**What it is**  
Cloud media storage/processing for uploaded images.

**Where used**
- Config/init: [cloudinary.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/cloudinary.js)
- Profile image upload: [auth.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/auth.controller.js)
- Message image upload: [message.controller.js](E:/projects%20and%20learning/ChatApp/backend/src/controllers/message.controller.js), [socket.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/socket.js)

**Flow in this app**
- Frontend sends base64 image payload.
- Backend uploads image to Cloudinary.
- `secure_url` is stored in MongoDB and rendered in chat/profile UI.

**Alternatives**
- AWS S3 (+ CloudFront), Firebase Storage, Supabase Storage, ImageKit.

---

## 14) Tailwind CSS + DaisyUI + PostCSS + Autoprefixer

**What it is**  
Tailwind utility CSS framework, DaisyUI component/theme plugin, PostCSS pipeline, and vendor prefixing via Autoprefixer.

**Where used**
- Tailwind directives: [index.css](E:/projects%20and%20learning/ChatApp/frontend/src/index.css)
- Tailwind + DaisyUI config/themes: [tailwind.config.js](E:/projects%20and%20learning/ChatApp/frontend/tailwind.config.js)
- PostCSS plugins: [postcss.config.js](E:/projects%20and%20learning/ChatApp/frontend/postcss.config.js)
- Theme list in app constants: [index.js](E:/projects%20and%20learning/ChatApp/frontend/src/constants/index.js)

**Flow in this app**
- Vite build runs PostCSS/Tailwind pipeline.
- DaisyUI theme tokens are applied with `data-theme` on app root in [App.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/App.jsx).
- Components use utility classes + DaisyUI class names (`btn`, `input`, etc.).

**Alternatives**
- CSS Modules, Styled Components, Chakra UI, MUI, Bootstrap.

---

## 15) react-hot-toast

**What it is**  
Toast notification library.

**Where used**
- Provider mount: [App.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/App.jsx)
- Error/success feedback in stores/components: [useAuthStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useAuthStore.js), [useChatStore.js](E:/projects%20and%20learning/ChatApp/frontend/src/store/useChatStore.js), [MessageInput.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/MessageInput.jsx), [VideoCallPage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/VideoCallPage.jsx)

**Flow in this app**
- API/socket outcomes trigger toast success/error messages for UX feedback.

**Alternatives**
- Notistack, React Toastify, Sonner.

---

## 16) Lucide React

**What it is**  
Icon library for React UI.

**Where used**
- Across pages/components, e.g. [App.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/App.jsx), [Navbar.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/Navbar.jsx), [MessageInput.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/components/MessageInput.jsx), [VideoCallPage.jsx](E:/projects%20and%20learning/ChatApp/frontend/src/pages/VideoCallPage.jsx)

**Flow in this app**
- Icons communicate actions/states (send, video, mute, settings, etc.) in UI components.

**Alternatives**
- Heroicons, React Icons, Font Awesome.

---

## 17) dotenv

**What it is**  
Loads environment variables from `.env`.

**Where used**
- Server env load: [index.js](E:/projects%20and%20learning/ChatApp/backend/src/index.js)
- Cloudinary env load: [cloudinary.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/cloudinary.js)

**Flow in this app**
- Reads DB URI, JWT secret, Cloudinary keys, port, and node env before runtime logic.

**Alternatives**
- Platform env injection only (Docker/K8s/hosting), `env-cmd`.

---

## 18) CORS + cookie-parser

**What they are**  
CORS allows controlled cross-origin requests; cookie-parser reads cookies in Express.

**Where used**
- Middleware setup: [index.js](E:/projects%20and%20learning/ChatApp/backend/src/index.js)

**Flow in this app**
- Frontend origins are allowlisted.
- `credentials: true` + frontend `withCredentials` enables cookie-based auth from browser.

**Alternatives**
- Custom header handling for CORS; native cookie parsing (manual).

---

## 19) UUID

**What it is**  
Unique ID generator used here for video room IDs.

**Where used**
- Room ID creation: [socket.js](E:/projects%20and%20learning/ChatApp/backend/src/lib/socket.js)

**Flow in this app**
- On `startVideoCall`, server creates `roomId` and sends join link message into chat stream.

**Alternatives**
- NanoID, crypto.randomUUID().

---

## 20) ESLint + React ESLint plugins

**What it is**  
Static linting for JavaScript/React code quality.

**Where used**
- Config: [eslint.config.js](E:/projects%20and%20learning/ChatApp/frontend/eslint.config.js)
- Script: [frontend/package.json](E:/projects%20and%20learning/ChatApp/frontend/package.json)

**Flow in this app**
- `npm run lint` checks React hooks rules, recommended JS rules, and refresh-related constraints.

**Alternatives**
- Biome, StandardJS, Rome (legacy), custom TS/ESLint stacks.

---

## 21) Nodemon

**What it is**  
Auto-restart backend process during development.

**Where used**
- Dev script: [backend/package.json](E:/projects%20and%20learning/ChatApp/backend/package.json)

**Flow in this app**
- `npm run dev` restarts backend when files in `backend/src` change.

**Alternatives**
- `node --watch`, PM2 watch mode, tsx watch (for TS projects).

---

## End-to-End Functional Flow (Combined Stack)

1. Frontend (React + Router + Zustand) loads and calls `/auth/check` via Axios.  
2. Backend (Express + JWT middleware + cookie-parser) validates user from cookie.  
3. If authenticated, frontend opens Socket.IO connection with `userId`.  
4. Sidebar/users/groups are fetched via REST (Axios + Express controllers + Mongoose).  
5. Direct messages:
   - Send via REST `/messages/send/:id` (or receive live via Socket.IO `newMessage`).
   - Optional image is uploaded to Cloudinary before DB save.
6. Group messages:
   - Fetch via REST `/messages/group/:id`.
   - Live send/receive via Socket.IO room events (`joinGroup`, `newGroupMessage`).
7. Video calls:
   - Initiated from chat input via Socket.IO `startVideoCall`.
   - Server creates UUID room and posts call link as a chat message.
   - Video page uses WebRTC media + Socket.IO signaling.
8. UI styling and UX:
   - Tailwind + DaisyUI for layout/themes.
   - Lucide icons + hot-toast feedback.
9. Build/serve:
   - Vite builds frontend to `dist`.
   - Express serves `dist` in production.

