import { NextResponse } from "next/server";
import {
  addItemToList,
  listItems,
  removeItemFromList,
} from "../../../../../lib/backend-store";

export async function GET(request, { params }) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const items = await listItems(userId, params.listId);
  return NextResponse.json({ items });
}

export async function POST(request, { params }) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  try {
    const item = await addItemToList(userId, params.listId, body.story);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const storyId = String(body?.storyId ?? "").trim();
  if (!storyId) {
    return NextResponse.json({ error: "storyId is required." }, { status: 400 });
  }
  const removed = await removeItemFromList(userId, params.listId, storyId);
  return NextResponse.json({ removed });
}
