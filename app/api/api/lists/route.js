import { NextResponse } from "next/server";
import { createList, listLists } from "../../../lib/backend-store";

export async function GET(request) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const lists = await listLists(userId);
  return NextResponse.json({ lists });
}

export async function POST(request) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  const name = String(body?.name ?? "");
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  try {
    const list = await createList(userId, name);
    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
