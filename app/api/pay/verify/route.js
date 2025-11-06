// ✅ 결제 전 상품 가격 검증용
export async function POST(req) {
  try {
    const { goodsName } = await req.json();
    if (!goodsName) {
      return Response.json({ ok: false, error: "상품명이 누락되었습니다." }, { status: 400 });
    }

    // ✅ products.js와 동일한 시트 주소 사용
    const productsUrl =
      process.env.PRODUCTS_URL ||
      "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    const r = await fetch(productsUrl, { method: "GET", cache: "no-store" });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok || !Array.isArray(data.items)) {
      throw new Error("상품목록 데이터 형식이 올바르지 않습니다.");
    }

    // ✅ 시트에서 goodsName으로 상품 찾기
    const target = data.items.find(
      (it) => String(it.name).trim() === String(goodsName).trim()
    );

    if (!target) {
      return Response.json(
        { ok: false, error: `상품 '${goodsName}'을(를) 시트에서 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    const verifiedAmount = Number(target.price);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return Response.json(
        { ok: false, error: "시트에 유효한 금액 정보가 없습니다." },
        { status: 400 }
      );
    }

    return Response.json({
      ok: true,
      goodsName: target.name,
      verifiedAmount,
    });
  } catch (err) {
    console.error("❌ verify error:", err);
    return Response.json(
      { ok: false, error: "서버 오류", detail: err.message },
      { status: 500 }
    );
  }
}
