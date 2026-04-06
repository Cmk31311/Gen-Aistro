import { createServerClient } from '../../../../lib/supabase-server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return Response.json({ error: 'Session not found' }, { status: 404 });
    return Response.json({ session: data });
  } catch (err) {
    console.error('Session GET error:', err);
    return Response.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
