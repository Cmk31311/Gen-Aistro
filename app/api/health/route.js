export async function GET() {
  return Response.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
}
