# Dart Game Server

Real-time multiplayer dart game with GranBoard hardware integration, video/audio chat, and support for authenticated and guest players.

## Features

- **Multiple Game Types**: 501, 301, Cricket, Tic-Tac-Toe
- **Authoritative Server**: Server-controlled game logic with event-driven state
- **Undo Support**: Undo throws or entire rounds
- **GranBoard Integration**: Web Bluetooth API for real-time dart detection
- **Video/Audio Chat**: Agora-powered video chat for remote play
- **Guest Players**: Support for local multiplayer on a single device
- **Firebase Auth**: Google sign-in or anonymous play

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  React Client   │ <───────────────> │   Game Server   │
│   (Vite/TS)     │                    │   (Node/TS)     │
└─────────────────┘                    └─────────────────┘
        │                                      │
        │ BLE                                  │ Admin SDK
        ▼                                      ▼
┌─────────────────┐                   ┌─────────────────┐
│   GranBoard     │                   │    Firebase     │
│   (Bluetooth)   │                   │   (Auth/DB)     │
└─────────────────┘                   └─────────────────┘
```

## Project Structure

```
granboard-app/
├── server/                 # Node.js WebSocket server
│   ├── src/
│   │   ├── auth/           # Firebase Admin authentication
│   │   ├── game/           # Game engine (501, Cricket, TTT)
│   │   ├── lobby/          # Lobby management
│   │   ├── services/       # Agora token service
│   │   ├── websocket/      # Socket.IO server
│   │   └── types/          # TypeScript types
│   └── package.json
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # BLE, Agora, Socket, Firebase
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript types
│   └── package.json
├── .github/workflows/      # CI/CD
└── firebase.json           # Firebase hosting config
```

## Quick Start

### Prerequisites

- Node.js 20+
- Firebase project with Authentication enabled
- Agora account (for video chat)
- GranBoard dartboard (optional)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your credentials

# Start development servers
npm run dev
```

### Environment Variables

**Server (`server/.env`)**:
```
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
CORS_ORIGIN=https://localhost:5173
```

**Client (`client/.env`)**:
```
VITE_SERVER_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## Game Types

### 501 / 301
Classic countdown dart games. Start at 501/301 and count down to exactly zero.
- **Double Out**: Must finish on a double
- **Double In**: Optional - must start with a double

### Cricket
Close out segments 15-20 and bullseye.
- Hit each segment 3 times to close
- Score points on closed segments until opponent closes

### Tic-Tac-Toe
Claim squares on a 3x3 board by hitting assigned segments.
- 9 random dart segments are assigned to squares
- Hit a segment 4 times to claim the square
- First to get 3 in a row wins

## WebSocket Protocol

### Client → Server Messages
- `AUTH` - Authenticate with Firebase ID token
- `CREATE_LOBBY` - Create a new game lobby
- `JOIN_LOBBY` - Join an existing lobby
- `ADD_GUEST_PLAYER` - Add a guest player
- `START_GAME` - Start the game (owner only)
- `THROW` - Record a dart throw
- `UNDO_THROW` / `UNDO_ROUND` - Undo actions
- `END_TURN` - End current turn

### Server → Client Messages
- `AUTH_SUCCESS` - Authentication successful
- `LOBBY_STATE` - Updated lobby state
- `GAME_STATE` - Authoritative game state
- `AGORA_TOKEN` - Video chat token
- `ERROR` - Error message

## Deployment

### Firebase Hosting (Client)

```bash
# Build and deploy
npm run build
firebase deploy --only hosting
```

### Cloud Run (Server)

```bash
# Build container
cd server
docker build -t gcr.io/PROJECT_ID/dart-server .

# Deploy
gcloud run deploy dart-server --image gcr.io/PROJECT_ID/dart-server
```

### GitHub Actions

CI/CD is configured in `.github/workflows/deploy.yml`. Set the following secrets:
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
- `VITE_*` - All client environment variables

## GranBoard Integration

The client uses Web Bluetooth API to connect to GranBoard dartboards. Supported browsers:
- Chrome (macOS/Windows/Android)
- Edge (macOS/Windows)
- Bluefy (iOS)

**Note**: HTTPS is required for Web Bluetooth. The dev server uses self-signed certificates.

## License

MIT
