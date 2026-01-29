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
