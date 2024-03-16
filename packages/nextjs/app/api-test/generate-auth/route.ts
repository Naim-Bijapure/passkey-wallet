export async function POST(request: Request) {
  const res = await request.json();
  console.log(`n-🔴 => POST => res:`, res);
  return Response.json({ res });
}
