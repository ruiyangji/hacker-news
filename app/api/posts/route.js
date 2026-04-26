import { NextResponse } from "next/server";
import { createPost, listPosts } from "../../../lib/backend-store";

export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

export async function POST(request) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  try {
    const post = await createPost(userId, body);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
