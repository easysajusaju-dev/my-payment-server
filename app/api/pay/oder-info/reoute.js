// app/api/pay/order-info/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

/* ---------------------------
 * 🔐 토큰 검증 유틸
 * --------------------------- */
function verify(token) {
  try {
    const [body, sig] = token.split(".");
    const validSig = crypto
      .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
      .update(body)
      .digest("base64url");
    if (sig !== validSig) throw new Error("INVALID_SIGNATURE");

    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) throw new Error("TOKEN_EXPIRED");

    return payload;
  } catch (err) {
    throw new Error("TOKEN_INVALID: " + err.message);
  }
}

/* ---------------------------
 * ✅ POST or GET 처리
 * --------------------------- */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  try {
    if (!token) throw new Error("NO_TOKEN");
    const payload = verify(token);

    return withCORS(
      NextResponse.json({
        ok: true,
        orderId: payload.oid,
        goodsName: payload.goodsName,
        amount: payload.amount,
        ts: payload.ts,
      })
    );
  } catch (err) {
    console.error("order-info error:", err);
    return withCORS(
      NextResponse.json({ ok: false, error: err.message || "UNKNOWN_ERROR" }, { status: 400 })
    );
  }
}

/* ---------------------------
 * ✅ OPTIONS (preflight)
 * --------------------------- */
export async function OPTIONS() {
  return withCORS(NextResponse.json({ ok: true }));
}

/* ---------------------------
 * ✅ 공통 CORS 헬퍼
 * --------------------------- */
function withCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
