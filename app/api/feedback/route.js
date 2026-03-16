import { createServerClient } from '../../../lib/supabase';

export async function POST(req) {
  try {
    const { query, answer, sources, rating, context = 'nasa' } = await req.json();

    if (!rating || ![1, -1].includes(rating)) {
      return Response.json({ error: 'rating must be 1 or -1' }, { status: 400 });
    }
    if (!query || !answer) {
      return Response.json({ error: 'query and answer are required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Resolve user (optional — feedback can be anonymous)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      query,
      answer,
      sources: sources ?? null,
      rating,
      context,
    });

    if (error) {
      console.error('Feedback insert error:', error);
      return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Feedback API error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
