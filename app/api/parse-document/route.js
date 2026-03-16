/**
 * Document text extraction API.
 * Currently supports: .txt, .md
 * PDF support: install `pdf-parse` with `npm install pdf-parse` to enable.
 */

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_BYTES = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 413 });
    }

    const name = file.name || '';
    const ext = name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (ext === 'txt' || ext === 'md') {
      const text = new TextDecoder().decode(arrayBuffer);
      return Response.json({ text, filename: name });
    }

    if (ext === 'pdf') {
      // Requires: npm install pdf-parse
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = Buffer.from(arrayBuffer);
        const result = await pdfParse(buffer);
        return Response.json({ text: result.text, filename: name, pages: result.numpages });
      } catch {
        return Response.json(
          { error: 'PDF parsing requires `pdf-parse`. Run: npm install pdf-parse' },
          { status: 501 }
        );
      }
    }

    return Response.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
  } catch (err) {
    console.error('Document parse error:', err);
    return Response.json({ error: 'Failed to parse document' }, { status: 500 });
  }
}
