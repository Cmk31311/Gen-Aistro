// Middleware is intentionally minimal — auth is handled client-side via AuthContext
// since Supabase JS v2 stores sessions in localStorage (not cookies).
// Protected pages (/datasets, /dashboard) check auth state and redirect themselves.

export { };
