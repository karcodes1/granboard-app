import admin from 'firebase-admin';

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  // Initialize Firebase Admin
  // Priority: FIREBASE_SERVICE_ACCOUNT_BASE64 > GOOGLE_APPLICATION_CREDENTIALS > mock mode
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Cloud Run: decode base64 service account JSON
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local dev with file path
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    // For development without credentials
    console.warn('[Firebase] No credentials found, running in mock mode');
    admin.initializeApp({
      projectId: 'granboard-app',
    });
  }

  initialized = true;
  console.log('[Firebase] Admin SDK initialized');
}

export async function verifyIdToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
} | null> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error) {
    console.error('[Firebase] Token verification failed:', error);
    return null;
  }
}

export function getFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

// Player stats interface
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  dartsThrown: number;
  totalPoints: number;
  average3Dart: number;
  highestCheckout: number;
  checkouts: number;
  busts: number;
  gameTypeStats: Record<string, {
    played: number;
    won: number;
  }>;
  updatedAt: number;
}

// Save player stats after game
export async function savePlayerStats(userId: string, stats: Partial<PlayerStats>): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('playerStats').doc(userId);

  try {
    const doc = await docRef.get();
    const existing = doc.exists ? doc.data() as PlayerStats : {
      gamesPlayed: 0,
      gamesWon: 0,
      dartsThrown: 0,
      totalPoints: 0,
      average3Dart: 0,
      highestCheckout: 0,
      checkouts: 0,
      busts: 0,
      gameTypeStats: {},
      updatedAt: Date.now(),
    };

    // Merge stats
    const updated: PlayerStats = {
      gamesPlayed: existing.gamesPlayed + (stats.gamesPlayed || 0),
      gamesWon: existing.gamesWon + (stats.gamesWon || 0),
      dartsThrown: existing.dartsThrown + (stats.dartsThrown || 0),
      totalPoints: existing.totalPoints + (stats.totalPoints || 0),
      average3Dart: 0, // Recalculated below
      highestCheckout: Math.max(existing.highestCheckout, stats.highestCheckout || 0),
      checkouts: existing.checkouts + (stats.checkouts || 0),
      busts: existing.busts + (stats.busts || 0),
      gameTypeStats: { ...existing.gameTypeStats, ...stats.gameTypeStats },
      updatedAt: Date.now(),
    };

    // Recalculate 3-dart average
    if (updated.dartsThrown > 0) {
      updated.average3Dart = (updated.totalPoints / updated.dartsThrown) * 3;
    }

    await docRef.set(updated, { merge: true });
    console.log(`[Firebase] Saved stats for user ${userId}`);
  } catch (error) {
    console.error('[Firebase] Failed to save stats:', error);
  }
}

// Get player stats
export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  const db = getFirestore();
  const docRef = db.collection('playerStats').doc(userId);

  try {
    const doc = await docRef.get();
    return doc.exists ? doc.data() as PlayerStats : null;
  } catch (error) {
    console.error('[Firebase] Failed to get stats:', error);
    return null;
  }
}

// User profile interface
export interface UserProfile {
  displayName: string;
  email?: string;
  createdAt: number;
  updatedAt: number;
}

// Save user profile (displayName)
export async function saveUserProfile(userId: string, displayName: string, email?: string): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(userId);

  try {
    const doc = await docRef.get();
    const now = Date.now();
    
    if (doc.exists) {
      await docRef.update({
        displayName,
        updatedAt: now,
      });
    } else {
      await docRef.set({
        displayName,
        email,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`[Firebase] Saved profile for user ${userId}`);
  } catch (error) {
    console.error('[Firebase] Failed to save profile:', error);
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(userId);

  try {
    const doc = await docRef.get();
    return doc.exists ? doc.data() as UserProfile : null;
  } catch (error) {
    console.error('[Firebase] Failed to get profile:', error);
    return null;
  }
}

// Active game session types
export interface ActiveGameSession {
  gameId: string;
  lobbyId: string;
  gameType: string;
  connectedUserIds: string[];
  disconnectedUserIds: string[];
  playerDisplayNames: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'paused' | 'finished';
}

export interface UserActiveGame {
  gameId: string;
  lobbyId: string;
  gameType: string;
  joinedAt: number;
}

// Save active game session when game starts
export async function saveActiveGameSession(session: ActiveGameSession): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('activeGames').doc(session.gameId);

  try {
    await docRef.set(session);
    console.log(`[Firebase] Saved active game session ${session.gameId}`);
  } catch (error) {
    console.error('[Firebase] Failed to save active game session:', error);
  }
}

// Get active game session
export async function getActiveGameSession(gameId: string): Promise<ActiveGameSession | null> {
  const db = getFirestore();
  const docRef = db.collection('activeGames').doc(gameId);

  try {
    const doc = await docRef.get();
    return doc.exists ? doc.data() as ActiveGameSession : null;
  } catch (error) {
    console.error('[Firebase] Failed to get active game session:', error);
    return null;
  }
}

// Update active game session (e.g., when player disconnects/reconnects)
export async function updateActiveGameSession(
  gameId: string,
  updates: Partial<ActiveGameSession>
): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('activeGames').doc(gameId);

  try {
    await docRef.update({
      ...updates,
      updatedAt: Date.now(),
    });
    console.log(`[Firebase] Updated active game session ${gameId}`);
  } catch (error) {
    console.error('[Firebase] Failed to update active game session:', error);
  }
}

// Delete active game session when game ends
export async function deleteActiveGameSession(gameId: string): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('activeGames').doc(gameId);

  try {
    await docRef.delete();
    console.log(`[Firebase] Deleted active game session ${gameId}`);
  } catch (error) {
    console.error('[Firebase] Failed to delete active game session:', error);
  }
}

// Set user's active game reference
export async function setUserActiveGame(userId: string, game: UserActiveGame | null): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(userId);

  try {
    if (game) {
      await docRef.set({ activeGame: game }, { merge: true });
    } else {
      await docRef.update({ activeGame: admin.firestore.FieldValue.delete() });
    }
    console.log(`[Firebase] Updated active game for user ${userId}`);
  } catch (error) {
    console.error('[Firebase] Failed to update user active game:', error);
  }
}

// Get user's active game reference
export async function getUserActiveGame(userId: string): Promise<UserActiveGame | null> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(userId);

  try {
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      return data?.activeGame || null;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to get user active game:', error);
    return null;
  }
}

// Clear active game for all users in a game
export async function clearActiveGameForUsers(userIds: string[]): Promise<void> {
  const db = getFirestore();
  const batch = db.batch();

  for (const userId of userIds) {
    const docRef = db.collection('users').doc(userId);
    batch.update(docRef, { activeGame: admin.firestore.FieldValue.delete() });
  }

  try {
    await batch.commit();
    console.log(`[Firebase] Cleared active game for ${userIds.length} users`);
  } catch (error) {
    console.error('[Firebase] Failed to clear active game for users:', error);
  }
}
