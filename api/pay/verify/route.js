// app/api/pay/verify/route.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { goodsName } = req.body || {};
    if (!goodsName) {
      return res.status(400).json({ ok: false, error: "상품명이 누락되었습니다." });
    }

    // ✅ products.js의 Google Apps Script 주소 그대로 사용
    const productsUrl =
      process.env.PRODUCTS_URL ||
      "https://script.google.com/macros/s/AKfycbwX6UPs_IaiyaHGMBdRrwUzoaAoe5EjM0JifNgw4K7DNPDX84QPfvwh16YAs0KhaRfx-g/exec";

    // ✅ 시트에서 전체 상품 목록 불러오기
    const r = await fetch(productsUrl, { method: "GET", cache: "no-store" });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok || !Array.isArray(data.items))
      throw new Error("상품목록 데이터 형식이 올바르지 않습니다.");

    // ✅ 전달된 goodsName과 일치하는 상품 찾기
    const target = data.items.find(
      (it) => String(it.name).trim() === String(goodsName).trim()
    );

    if (!target) {
      return res.status(404).json({
        ok: false,
        error: `상품 "${goodsName}"을(를) 시트에서 찾을 수 없습니다.`,
      });
    }

    // ✅ price 필드에서 금액 추출
    const verifiedAmount = Number(target.price);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "시트에서 유효한 가격 정보를 찾지 못했습니다.",
      });
    }

    return res.status(200).json({
      ok: true,
      goodsName: target.name,
      verifiedAmount,
    });
  } catch (err) {
    console.error("❌ verify error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "서버 내부 오류", detail: err.message });
  }
}
