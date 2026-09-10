import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type Auth, type User } from 'firebase/auth';

const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID };

export class AuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private demoUser: User | null = null;

  constructor() {
    if (Object.values(config).every(Boolean)) {
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
    }
  }

  watch(callback: (user: User | null) => void): () => void {
    if (this.auth) return onAuthStateChanged(this.auth, callback);
    callback(this.demoUser);
    return () => undefined;
  }

  signIn(): Promise<User | null> {
    if (this.auth) return signInWithPopup(this.auth, new GoogleAuthProvider()).then((result) => result.user);
    this.demoUser = { uid: 'demo-user', displayName: 'Demo Researcher', email: 'demo@atlas.local' } as User;
    return Promise.resolve(this.demoUser);
  }

  signOut(): Promise<void> {
    if (this.auth) return signOut(this.auth);
    this.demoUser = null;
    return Promise.resolve();
  }
}