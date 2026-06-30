import { createClient, User } from '@supabase/supabase-js';

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
}

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;

  const adminEmail = getAdminEmail();
  const email = user.email.toLowerCase();

  if (adminEmail && email === adminEmail) return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.app_metadata?.role === 'admin') return true;

  return false;
}

export function extractAccessToken(req: Request, bodyData?: any): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (bodyData) {
    const fromBody = bodyData.accessToken || bodyData.adminToken;
    if (fromBody) return fromBody;
  }

  // Next.js URL parsing for query param
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('accessToken');
  if (fromQuery) return fromQuery;

  return null;
}

function createAuthVerifier(supabaseUrl: string, anonKey: string, adminSupabase: any) {
  if (adminSupabase) return adminSupabase;
  if (supabaseUrl && anonKey) {
    return createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

export interface AuthResult {
  error: string | null;
  status: number;
  user: User | null;
  accessToken: string | null;
}

export async function authenticateRequest(
  req: Request,
  authContext: { adminSupabase: any; supabaseUrl: string; anonKey: string },
  bodyData?: any
): Promise<AuthResult> {
  const accessToken = extractAccessToken(req, bodyData);

  if (!accessToken) {
    return { error: 'Unauthorized. Access token required.', status: 401, user: null, accessToken: null };
  }

  const authClient = createAuthVerifier(authContext.supabaseUrl, authContext.anonKey, authContext.adminSupabase);
  if (!authClient) {
    return { error: 'Authentication service not configured.', status: 500, user: null, accessToken: null };
  }

  const { data: { user }, error } = await authClient.auth.getUser(accessToken);

  if (error || !user) {
    return { error: 'Invalid or expired session. Please log in again.', status: 401, user: null, accessToken: null };
  }

  return { error: null, status: 200, user, accessToken };
}

export async function requireAuth(
  req: Request,
  authContext: { adminSupabase: any; supabaseUrl: string; anonKey: string },
  bodyData?: any
): Promise<AuthResult> {
  return authenticateRequest(req, authContext, bodyData);
}

export async function requireAdmin(
  req: Request,
  authContext: { adminSupabase: any; supabaseUrl: string; anonKey: string },
  bodyData?: any
): Promise<AuthResult> {
  const auth = await authenticateRequest(req, authContext, bodyData);

  if (auth.error) {
    return auth;
  }

  if (!isAdminUser(auth.user)) {
    console.warn('Admin access denied for:', auth.user?.email);
    return {
      error: `Forbidden. Admin access only. Add ${auth.user?.email} as ADMIN_EMAIL in backend/.env or set role=admin in user metadata.`,
      status: 403,
      user: auth.user,
      accessToken: auth.accessToken,
    };
  }

  return auth;
}
