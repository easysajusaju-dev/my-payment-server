// app/api/pay/start/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

/* ---------------------------
 * 🔐 토큰 생성 유틸
 * --------------------------- */
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/* ---------------------------
 * 상품명 비교 (필요 시 ID 비교로 교체 가능)
 * --------------------------- */
function verifyCategoryMatch(itemName, reqName) {
  return String(itemName || "").trim() === String(reqName || "").trim();
}

/* ---------------------------
 * ✅ POST 요청 처리 (주문 시작)
 * --------------------------- */
export async function POST(req) {
  try {
    const { oid, goodsName } = await req.json();
    if (!oid || !goodsName) {
      return withCORS(
        NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 })
      );
    }

    // 1️⃣ 시트에서 상품 목록 불러오기
    const url = process.env.PRODUCTS_URL;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("PRODUCTS_FETCH_FAIL");

    const data = await r.json();
    if (!data.ok || !Array.isArray(data.items)) throw new Error("BAD_PRODUCTS_PAYLOAD");

    const found = data.items.find((it) => verifyCategoryMatch(it.name, goodsName));
    if (!found) {
      return withCORS(
        NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 })
      );
    }

    // 2️⃣ 금액은 시트 값 기준 (클라 값 무시)
    const amount = Number(String(found.price).replace(/,/g, "")) || 0;
    if (amount <= 0) {
      return withCORS(
        NextResponse.json({ ok: false, error: "INVALID_PRICE" }, { status: 400 })
      );
    }

    // 3️⃣ 토큰 생성 (유효기간 30분)
    const payload = {
      oid,
      goodsName: found.name,
      amount,
      ts: Date.now(),
      exp: Date.now() + 30 * 60 * 1000,
    };
    const token = sign(payload);

    return withCORS(NextResponse.json({ ok: true, token }));
  } catch (err) {
    console.error("start error:", err);
    return withCORS(
      NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 })
    );
  }
}

/* ---------------------------
 * ✅ OPTIONS (CORS preflight)
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
