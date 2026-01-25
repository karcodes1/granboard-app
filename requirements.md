# Dart Game Server – Technical Requirements & Architecture

## 1. Purpose & Scope

This document defines the technical requirements and proposed architecture for a real-time, multiplayer dart game server supporting multiple game types (e.g., 501, Cricket, Tic-Tac-Toe), Granboard hardware integration, video/audio chat, and both authenticated and guest players.

The system is designed to be:

* Authoritative (server-controlled game logic)
* Event-driven with undo support
* Scalable and cost-efficient (Cloud Run, zero minimum instances)
* Extensible for additional dart games and features

---

## 2. High-Level Architecture

### 2.1 Core Components

* **Client Applications**

  * Web / mobile clients
  * Connect via WebSockets (primary) or Long Polling (fallback)
  * Authenticate via Firebase Auth

* **Game Server (Cloud Run)**

  * Stateless containerized Node.js/TypeScript service
  * Hosts lobby management, game logic, websocket handling
  * Maintains in-memory game and lobby state

* **Firebase / GCP Services**

  * Firebase Authentication
  * Firestore (player profiles, statistics)
  * Optional Firebase Realtime DB (future consideration)

* **Agora**

  * Video/audio chat token generation
  * Client-managed media sessions

---

## 3. Authentication & Identity Model

### 3.1 Authenticated Users

* Users authenticate via Firebase Auth (Google, email, etc.)
* Server validates Firebase ID tokens on connection
* Each authenticated user represents a **client owner**

### 3.2 Guest Players

Each authenticated client may create multiple **guest players** to support local multiplayer on a single Granboard.

Example:

* Client A:

  * User A (authenticated)
  * Guest A1
  * Guest A2
* Client B:

  * User B (authenticated)

All players (authenticated or guest) are represented uniformly in-game.

### 3.3 Player Identity Model

```ts
PlayerId = string

Player = {
  id: PlayerId
  type: "authenticated" | "guest"
  ownerUserId: string        // Firebase UID of client owner
  displayName: string
}
```

Guest players:

* Exist only for the duration of a lobby or game
* Do not authenticate independently
* May optionally have stats discarded or merged (TBD)

---

## 4. Lobby System

### 4.1 Lobby Lifecycle

* Lobbies are created **before** any WebSocket or Agora session
* Lobbies exist in server memory initially
* Lobbies transition to an active game when started

### 4.2 Lobby Capabilities

* Create / destroy lobby
* Join / leave lobby
* Add / remove guest players
* Assign players to teams
* Select game type (501, Cricket, etc.)
* Configure game-specific settings (e.g., start score, double-out)

### 4.3 Lobby State (Example)

```ts
Lobby = {
  lobbyId: string
  ownerUserId: string
  players: Player[]
  teams: Record<TeamId, PlayerId[]>
  gameType: string
  status: "waiting" | "started"
}
```

---

## 5. Game Session Model

### 5.1 Game Startup

When a lobby starts:

* A game session is created in memory
* WebSocket connections are established
* Agora token(s) are generated
* Game state initialization occurs

### 5.2 Connection Model

* One WebSocket connection per **client** (not per player)
* Server routes actions to the correct player context
* Supports fallback to long polling if WebSocket unavailable

---

## 6. Game State & Event Model

### 6.1 Core Design

* Server is authoritative
* Game state is derived from an **append-only event log**
* Current state is cached in memory

Undo support:

* Remove or invalidate last event
* Recompute game state by replaying events

### 6.2 Generic Game State

```ts
GameState = {
  version: number
  gameId: string
  gameType: string

  currentPlayerId: PlayerId

  turn: {
    playerId: PlayerId
    darts: Array<Throw | null> // length 3
    isBust?: boolean
  }

  players: Record<PlayerId, {
    displayName: string
    score?: number
    stats?: PlayerStats
  }>

  gameSpecific: GameSpecificState
}
```

### 6.3 Game-Specific State

Discriminated by `gameType`.

#### Example: Cricket

```ts
CricketState = {
  marks: Record<Number, Record<PlayerId, 0 | 1 | 2 | 3>>
  closedBy: Record<Number, PlayerId | null>
}
```

#### Example: Tic-Tac-Toe

```ts
TicTacToeState = {
  board: {
    owner: PlayerId | null
    hits: Record<PlayerId, number>
  }[][]
  winner: PlayerId | null
}
```

---

## 7. Messaging Protocol

### 7.1 Client → Server Messages

* `AUTH`
* `SET_NICKNAME`
* `CREATE_LOBBY`
* `JOIN_LOBBY`
* `ADD_GUEST_PLAYER`
* `SET_GUEST_PLAYER_NICKNAME`
* `START_GAME`
* `THROW`
* `UNDO_REQUEST`
* `END_ROUND`

### 7.2 Server → Client Messages

* `GAME_STATE` (authoritative snapshot)
* `LOBBY_STATE`
* `ERROR`
* `AGORA_TOKEN`

Clients render state only; no game logic exists client-side.

---

## 8. Statistics & Persistence

### 8.1 Player Statistics

Stored in Firestore (or Firebase):

* Games played
* Games won
* Darts thrown
* Average (3-dart)
* Game-type-specific stats

Guest player stats handling:

* Default: persisted by name entered
* Optional future: merge with authenticated account

### 8.2 Persistence Strategy

* Active games: in memory
* Player stats: persisted at game end
* Optional future: game snapshots or event logs

---

## 9. Video & Audio (Agora)

* Server generates Agora tokens on demand
* Tokens scoped to game session
* Media handled directly client-to-client via Agora
* Server does not proxy media

---

## 10. Deployment & Infrastructure

### 10.1 Cloud Run

* Containerized Node.js/TypeScript server
* Zero minimum instances
* Automatic scale-up on demand

### 10.2 Implications

* In-memory state is ephemeral
* If instance shuts down:

  * Active games are lost
  * Clients must reconnect / restart games

This is acceptable for MVP.

### 10.3 Deployment
* We should use github actions for CI/CD
* We should use firebase for hosting

---

## 11. Security Considerations

* Firebase ID token verification
* Authorization checks for:

  * Lobby ownership
  * Guest player creation 
  * Undo permissions
* Rate limiting (future)

---

## 12. Open Questions / Unknowns

1. **Game Persistence**

   * Is losing active games on server shutdown acceptable long-term?

2. **Undo Policy**

   * Who can undo?
   * Time-limited undo?
   * Vote-based undo?

3. **Guest Player Stats**

   * Should guests ever have stats saved?

4. **Granboard Event Validation**

   * Do we need duplicate or jitter filtering server-side?

5. **Max Players Per Game**

   * Upper bound needed for validation and UI constraints

6. **Reconnect Behavior**

   * Should reconnect restore game state if instance is still alive?

7. **Match History**

   * Should completed games be stored for replay or review?

---

## 13. Next Steps

* Finalize open questions
* Define detailed WebSocket message schemas
* Implement game reducer interfaces
* Build lobby service
* Integrate Firebase auth verification
* Implement basic 501 game end-to-end
