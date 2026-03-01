export async function GET() {
  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    groq_configured: !!process.env.GROQ_API_KEY,
    hf_configured: !!process.env.HUGGINGFACE_API_KEY
  });
}
