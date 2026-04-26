import { NextResponse } from "next/server";
import { getExtensions, setExtensionValue } from "../../../lib/backend-store";

export async function GET(request) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const extensions = await getExtensions(userId);
  return NextResponse.json({ extensions });
}

export async function POST(request) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  const key = String(body?.key ?? "").trim();
  if (!userId || !key) {
    return NextResponse.json({ error: "userId and key are required." }, { status: 400 });
  }
  const extensions = await setExtensionValue(userId, key, body?.value);
  return NextResponse.json({ extensions });
}
