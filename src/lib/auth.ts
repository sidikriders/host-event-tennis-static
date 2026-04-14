export interface AuthSession {
  username: string;
}

const AUTH_STORAGE_KEY = 'tennis_auth_session';

const STATIC_USERS = [
  { username: 'admin1', password: 'mabartennis' },
  { username: 'admin2', password: 'mabartennis' },
  { username: 'admin3', password: 'mabartennis' },
];

function isBrowser() {
  return typeof window !== 'undefined';
}

export function authenticateUser(username: string, password: string): AuthSession | null {
  const normalizedUsername = username.trim().toLowerCase();
  const user = STATIC_USERS.find(
    (candidate) => candidate.username === normalizedUsername && candidate.password === password
  );

  return user ? { username: user.username } : null;
}

export function getStoredSession(): AuthSession | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.username || typeof parsed.username !== 'string') return null;

    return { username: parsed.username };
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  if (!isBrowser()) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}