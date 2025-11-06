// app/api/pay/start/route.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { orderId, goodsName, amount: clientAmount, returnUrl } = req.body || {};

    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    if (!goodsName) return res.status(400).json({ error: "goodsName is required" });

    // ✅ Products API 호출해서 검증된 가격 가져오기
    const base =
      process.env.BASE_URL?.replace(/\/$/, "") ||
      "https://my-payment-server.vercel.app"; // ← 당신의 실제 vercel 주소로 수정 가능

    const productsUrl = `${base}/api/products?goodsName=${encodeURIComponent(
      goodsName
    )}`;

    const r = await fetch(productsUrl, { method: "GET", cache: "no-store" });
    if (!r.ok) throw new Error(`Products API Error: ${r.status}`);

    const data = await r.json();
    if (!data.ok || !Array.isArray(data.items) || data.items.length === 0)
      throw new Error(`Product not found for ${goodsName}`);

    // ✅ price 필드에서 금액 추출
    const verifiedAmount = Number(data.items[0].price);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0)
      throw new Error("Invalid price value");

    // ✅ 검증된 금액으로 덮어쓰기
    const payload = {
      amount: verifiedAmount,
      orderId,
      goodsName,
      returnUrl:
        returnUrl ||
        process.env.DEFAULT_RETURN_URL ||
        `${base}/api/pay/callback`,
    };

    console.log(`[SECURE] 결제 요청: ${goodsName} (${verifiedAmount}원)`);

    // ✅ NICE 결제 요청
    const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
      },
      body: JSON.stringify(payload),
    });

    if (!rsp.ok) {
      const text = await rsp.text().catch(() => "");
      throw new Error(`NICE request failed: ${rsp.status} ${text}`);
    }

    const j = await rsp.json();
    return res.status(200).json({ redirectUrl: j.nextUrl, raw: j });
  } catch (err) {
    console.error("start route error:", err);
    return res
      .status(500)
      .json({ error: "internal_error", detail: String(err.message || err) });
  }
}
