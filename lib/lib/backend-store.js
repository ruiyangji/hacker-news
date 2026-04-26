import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "wrapper-store.json");

const DEFAULT_LISTS = [
  { id: "bookmarks", name: "Bookmarks", system: true },
  { id: "read-later", name: "Read Later", system: true },
];

const EMPTY_STORE = {
  users: {},
  posts: [],
  comments: [],
  extensions: {},
};

let writeQueue = Promise.resolve();

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureFile();
  const raw = await readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users ?? {},
      posts: parsed.posts ?? [],
      comments: parsed.comments ?? [],
      extensions: parsed.extensions ?? {},
    };
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

async function writeStore(store) {
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function createUserRecord() {
  const now = Date.now();
  return {
    lists: DEFAULT_LISTS.map((list) => ({ ...list, createdAt: now })),
    listItems: {},
  };
}

function ensureUser(store, userId) {
  if (!store.users[userId]) {
    store.users[userId] = createUserRecord();
  }
  const user = store.users[userId];
  if (!Array.isArray(user.lists)) user.lists = [];
  if (!user.listItems || typeof user.listItems !== "object") user.listItems = {};
  for (const base of DEFAULT_LISTS) {
    if (!user.lists.some((l) => l.id === base.id)) {
      user.lists.push({ ...base, createdAt: Date.now() });
    }
  }
  return user;
}

function runMutatingTransaction(mutator) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });
  return writeQueue;
}

export async function listLists(userId) {
  const store = await readStore();
  const user = ensureUser(store, userId);
  return user.lists.map((list) => ({
    ...list,
    count: (user.listItems[list.id] ?? []).length,
  }));
}

export async function createList(userId, name) {
  return runMutatingTransaction((store) => {
    const user = ensureUser(store, userId);
    const normalized = name.trim();
    if (!normalized) {
      throw new Error("List name is required.");
    }
    const id = `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const list = { id, name: normalized, system: false, createdAt: Date.now() };
    user.lists.push(list);
    return list;
  });
}

export async function listItems(userId, listId) {
  const store = await readStore();
  const user = ensureUser(store, userId);
  return user.listItems[listId] ?? [];
}

export async function addItemToList(userId, listId, story) {
  return runMutatingTransaction((store) => {
    const user = ensureUser(store, userId);
    const exists = user.lists.some((list) => list.id === listId);
    if (!exists) {
      throw new Error("List not found.");
    }
    if (!user.listItems[listId]) user.listItems[listId] = [];
    const items = user.listItems[listId];
    const storyId = String(story?.id ?? "").trim();
    if (!storyId) throw new Error("Story id is required.");
    const idx = items.findIndex((item) => String(item.id) === storyId);
    const payload = {
      id: storyId,
      title: story.title ?? "Untitled",
      url: story.url ?? null,
      by: story.by ?? "unknown",
      time: story.time ?? Math.floor(Date.now() / 1000),
      score: story.score ?? 0,
      descendants: story.descendants ?? 0,
    };
    if (idx >= 0) items[idx] = payload;
    else items.unshift(payload);
    return payload;
  });
}

export async function removeItemFromList(userId, listId, storyId) {
  return runMutatingTransaction((store) => {
    const user = ensureUser(store, userId);
    if (!user.listItems[listId]) return false;
    const before = user.listItems[listId].length;
    user.listItems[listId] = user.listItems[listId].filter((item) => String(item.id) !== String(storyId));
    return before !== user.listItems[listId].length;
  });
}

export async function listPosts() {
  const store = await readStore();
  return [...store.posts].sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPost(userId, input) {
  return runMutatingTransaction((store) => {
    const title = String(input?.title ?? "").trim();
    const url = String(input?.url ?? "").trim();
    const text = String(input?.text ?? "").trim();
    if (!title) throw new Error("Post title is required.");
    if (!url && !text) throw new Error("Provide a URL or post text.");
    const post = {
      id: `wrapper-post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "wrapper-post",
      title,
      url: url || null,
      text: text || null,
      by: userId,
      score: 1,
      descendants: 0,
      time: Math.floor(Date.now() / 1000),
      createdAt: Date.now(),
    };
    store.posts.unshift(post);
    return post;
  });
}

export async function listComments(storyId) {
  const id = String(storyId);
  const store = await readStore();
  return store.comments
    .filter((c) => c.storyId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createComment(userId, input) {
  return runMutatingTransaction((store) => {
    const storyId = String(input?.storyId ?? "");
    const text = String(input?.text ?? "").trim();
    if (!storyId) throw new Error("storyId is required.");
    if (!text) throw new Error("Comment text is required.");
    const comment = {
      id: `wrapper-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "wrapper-comment",
      storyId,
      parentId: input?.parentId ? String(input.parentId) : null,
      text,
      by: userId,
      time: Math.floor(Date.now() / 1000),
      createdAt: Date.now(),
    };
    store.comments.unshift(comment);
    return comment;
  });
}

export async function getExtensions(userId) {
  const store = await readStore();
  return store.extensions[userId] ?? {};
}

export async function setExtensionValue(userId, key, value) {
  return runMutatingTransaction((store) => {
    if (!store.extensions[userId]) store.extensions[userId] = {};
    store.extensions[userId][key] = value;
    return store.extensions[userId];
  });
}
