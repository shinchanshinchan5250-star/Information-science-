const SUPABASE_URL = "https://szmexcbdcsipuwpgxpbi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LqsTWnWI8SYO5Dx9b4X7ZA_OKaBRUV1";
type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
const storageKey = "eventwise-session";
let session: Session | null = JSON.parse(localStorage.getItem(storageKey) || "null");
const listeners = new Set<(event: string, session: Session | null) => void>();
function setSession(next: Session | null) { session = next; if (next) localStorage.setItem(storageKey, JSON.stringify(next)); else localStorage.removeItem(storageKey); listeners.forEach((fn) => fn(next ? "SIGNED_IN" : "SIGNED_OUT", next)); }
async function request(path: string, options: RequestInit = {}) { const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...options.headers } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.msg || body.message || body.error_description || body.error || "Request failed"); return body; }
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { listeners.add(callback); return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); } } } }; },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => { try { const data = await request("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }); setSession(data); return { data, error: null }; } catch (error) { return { data: null, error: error as Error }; } },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { emailRedirectTo?: string } }) => { try { const data = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, options: { emailRedirectTo: options?.emailRedirectTo } }) }); if (data.access_token) setSession(data); return { data, error: null }; } catch (error) { return { data: null, error: error as Error }; } },
    signOut: async () => { try { if (session) await request("/auth/v1/logout", { method: "POST" }); } finally { setSession(null); } },
  },
  from: (table: string) => ({ upsert: async (row: Record<string, unknown>, config?: { onConflict?: string }) => { try { await request(`/rest/v1/${table}?on_conflict=${config?.onConflict || "id"}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) }); return { error: null }; } catch (error) { return { error: error as Error }; } } }),
};
