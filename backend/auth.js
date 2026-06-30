import { createClient } from '@supabase/supabase-js';

export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
}

export function isAdminUser(user) {
  if (!user?.email) return false;

  const adminEmail = getAdminEmail();
  const email = user.email.toLowerCase();

  if (adminEmail && email === adminEmail) return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.app_metadata?.role === 'admin') return true;

  return false;
}

export function extractAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const fromBody = req.body?.accessToken || req.body?.adminToken;
  if (fromBody) return fromBody;

  const fromQuery = req.query?.accessToken;
  if (fromQuery) return fromQuery;

  return null;
}

function createAuthVerifier(supabaseUrl, anonKey, adminSupabase) {
  if (adminSupabase) return adminSupabase;
  if (supabaseUrl && anonKey) {
    return createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

export async function authenticateRequest(req, { adminSupabase, supabaseUrl, anonKey }) {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    return { error: 'Unauthorized. Access token required.', status: 401, user: null, accessToken: null };
  }

  const authClient = createAuthVerifier(supabaseUrl, anonKey, adminSupabase);
  if (!authClient) {
    return { error: 'Authentication service not configured.', status: 500, user: null, accessToken: null };
  }

  const { data: { user }, error } = await authClient.auth.getUser(accessToken);

  if (error || !user) {
    return { error: 'Invalid or expired session. Please log in again.', status: 401, user: null, accessToken: null };
  }

  return { error: null, status: 200, user, accessToken };
}

export async function requireAuth(req, authContext) {
  return authenticateRequest(req, authContext);
}

export async function requireAdmin(req, authContext) {
  const auth = await authenticateRequest(req, authContext);

  if (auth.error) {
    return auth;
  }

  if (!isAdminUser(auth.user)) {
    console.warn('Admin access denied for:', auth.user.email);
    return {
      error: `Forbidden. Admin access only. Add ${auth.user.email} as ADMIN_EMAIL in backend/.env or set role=admin in user metadata.`,
      status: 403,
      user: auth.user,
      accessToken: auth.accessToken,
    };
  }

  return auth;
}
