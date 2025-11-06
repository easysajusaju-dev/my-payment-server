// app/api/pay/verify/route.js

export async function POST(req) {
  try {
    const { goodsName } = await req.json();

    if (!goodsName) {
      return Response.json(
        { ok: false, error: "상품명이 누락되었습니다." },
        { status: 400 }
      );
    }

    // ✅ 시트 데이터 가져오기
    const sheetUrl =
      process.env.PRODUCTS_URL ||
      "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    const r = await fetch(sheetUrl, { method: "GET", cache: "no-store" });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || "products fetch failed");

    const items = Array.isArray(data.items) ? data.items : [];

    // ✅ goodsName으로 정확히 매칭
    const match = items.find(
      (it) =>
        String(it.name).trim() === String(goodsName).trim() ||
        String(it.goodsName).trim() === String(goodsName).trim()
    );

    if (!match) {
      return Response.json(
        { ok: false, error: `상품 '${goodsName}'을(를) 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // ✅ 시트의 실제 금액 반환
    return Response.json({
      ok: true,
      goodsName: match.name || match.goodsName,
      verifiedAmount: Number(match.price),
    });
  } catch (err) {
    console.error("❌ verify error:", err);
    return Response.json(
      { ok: false, error: "서버 오류", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
