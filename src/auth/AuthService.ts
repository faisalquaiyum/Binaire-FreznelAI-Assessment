import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID };

export class AuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  constructor() {
    if (Object.values(config).every(Boolean)) {
      try {
        this.app = initializeApp(config);
        this.auth = getAuth(this.app);
      } catch {
        this.app = null;
        this.auth = null;
      }
    }
  }

  watch(callback: (user: User | null) => void): () => void {
    if (this.auth) return onAuthStateChanged(this.auth, callback);
    callback(null);
    return () => undefined;
  }

  get isConfigured(): boolean {
    return this.auth !== null;
  }

  signInWithGoogle(): Promise<User> {
    if (!this.auth) return Promise.reject(new Error('Firebase is not configured.'));
    return signInWithPopup(this.auth, new GoogleAuthProvider()).then((result) => result.user);
  }

  signInWithEmail(email: string, password: string): Promise<User> {
    if (!this.auth) return Promise.reject(new Error('Firebase is not configured.'));
    return signInWithEmailAndPassword(this.auth, email, password).then((result) => result.user);
  }

  signUp(email: string, password: string): Promise<User> {
    if (!this.auth) return Promise.reject(new Error('Firebase is not configured.'));
    return createUserWithEmailAndPassword(this.auth, email, password).then((result) => result.user);
  }

  getErrorMessage(error: unknown, provider?: 'google' | 'password'): string {
    const code = (error as { code?: unknown } | undefined)?.code;
    if (code === 'auth/api-key-not-valid') {
      return 'Firebase rejected the API key. Copy the Web App config from the correct Firebase project into .env, then restart Vite.';
    }
    if (code === 'auth/operation-not-allowed') {
      return provider === 'password'
        ? 'Email/password authentication is not enabled. Enable Email/Password under Firebase Authentication providers.'
        : 'Google sign-in is not enabled. Enable Google under Firebase Authentication providers.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This hostname is not authorized in Firebase Authentication settings.';
    }
    if (code === 'auth/invalid-credential') return 'The email or password is incorrect.';
    if (code === 'auth/email-already-in-use') return 'That email is already registered.';
    if (code === 'auth/weak-password') return 'Use a password with at least six characters.';
    if (code === 'auth/invalid-email') return 'Enter a valid email address.';
    return error instanceof Error ? error.message : 'Authentication failed. Try again.';
  }

  signOut(): Promise<void> {
    return this.auth ? signOut(this.auth) : Promise.resolve();
  }
}