import { NextResponse } from "next/server";
import { createComment, listComments } from "../../../lib/backend-store";

export async function GET(request) {
  const storyId = request.nextUrl.searchParams.get("storyId");
  if (!storyId) {
    return NextResponse.json({ error: "storyId is required." }, { status: 400 });
  }
  const comments = await listComments(storyId);
  return NextResponse.json({ comments });
}

export async function POST(request) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  try {
    const comment = await createComment(userId, body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
