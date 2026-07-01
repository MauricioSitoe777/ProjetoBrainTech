import { createContext, useContext, type ReactNode } from 'react';

export type Invite = {
  token: string;
  userId: string;
  userName: string;
  userEmail: string;
  expiresAt: number;
  used: boolean;
  createdAt: number;
};

const STORAGE_KEY = 'rentcar:invites:v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function load(): Invite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Invite[]) : [];
  } catch {
    return [];
  }
}

function save(invites: Invite[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
  } catch {
    // ignore
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface InvitesContextType {
  createInvite: (userId: string, userName: string, userEmail: string) => Invite;
  validateInvite: (token: string) => Invite | null;
  consumeInvite: (token: string) => void;
}

const InvitesContext = createContext<InvitesContextType | null>(null);

export function InvitesProvider({ children }: { children: ReactNode }) {
  const createInvite = (userId: string, userName: string, userEmail: string): Invite => {
    const all = load();
    // Invalidar convites anteriores não usados para este utilizador
    const updated = all.map((inv) =>
      inv.userId === userId && !inv.used ? { ...inv, used: true } : inv,
    );
    const invite: Invite = {
      token: generateToken(),
      userId,
      userName,
      userEmail,
      expiresAt: Date.now() + TTL_MS,
      used: false,
      createdAt: Date.now(),
    };
    save([...updated, invite]);
    return invite;
  };

  const validateInvite = (token: string): Invite | null => {
    const invite = load().find((inv) => inv.token === token);
    if (!invite || invite.used || Date.now() > invite.expiresAt) return null;
    return invite;
  };

  const consumeInvite = (token: string): void => {
    save(load().map((inv) => (inv.token === token ? { ...inv, used: true } : inv)));
  };

  return (
    <InvitesContext.Provider value={{ createInvite, validateInvite, consumeInvite }}>
      {children}
    </InvitesContext.Provider>
  );
}

export function useInvites() {
  const ctx = useContext(InvitesContext);
  if (!ctx) throw new Error('useInvites must be used within InvitesProvider');
  return ctx;
}
