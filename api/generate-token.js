// /api/generate-token.js
import crypto from "crypto";

const tokens = global.__TOKENS__ ||= new Map();

export async function POST(req) {
  const { orderId, product, amount } = await req.json();

  if (!orderId || !product || !amount) {
    return new Response("Invalid request", { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15분

  tokens.set(token, { orderId, product, amount, expiresAt, used: false });
  return Response.json({ token });
}

export function getOrderByToken(token) {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  if (entry.used) return null;

  entry.used = true; // 단일 사용
  tokens.set(token, entry);
  return entry;
}
