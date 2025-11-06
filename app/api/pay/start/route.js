// app/api/pay/start/route.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { orderId, goodsName, amount: clientAmount, returnUrl } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }
    if (!goodsName) {
      return res.status(400).json({ error: "goodsName is required" });
    }

    // ------------------------------
    // 1) products API에서 검증된 가격 조회
    // ------------------------------
    // 내부 products 엔드포인트 (Vercel에 배포된 도메인 기준)
    // process.env.BASE_URL: (선택) your vercel base domain, 예: https://my-payment-server.vercel.app
    const base = process.env.PRODUCTS_API_URL // optional override
      || (process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, "")}` : "https://my-payment-server.vercel.app");
    // products endpoint (we expect it supports ?goodsName=...)
    const productsUrl = `${base}/api/products?goodsName=${encodeURIComponent(goodsName)}`;

    let verifiedAmount;
    try {
      const r = await fetch(productsUrl, { method: "GET", cache: "no-store" });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`products API returned ${r.status} ${txt}`);
      }
      const j = await r.json();
      if (!j || !j.ok || !Array.isArray(j.items)) {
        throw new Error("products API returned unexpected payload");
      }
      // expecting one matched item; if multiple, take first
      if (j.items.length === 0) {
        throw new Error(`product not found for goodsName="${goodsName}"`);
      }
      const item = j.items[0];
      // Try common price fields
      const priceCandidate = item.price ?? item.amount ?? item.priceKRW ?? item.price_won ?? item.value;
      if (priceCandidate === undefined || priceCandidate === null) {
        throw new Error("product item missing price field");
      }
      verifiedAmount = Number(priceCandidate);
      if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
        throw new Error("invalid price value from products API");
      }
    } catch (err) {
      console.error("[SECURE] products lookup failed:", err.message || err);
      return res.status(400).json({ error: "Price verification failed", detail: String(err.message || err) });
    }

    // ------------------------------
    // 2) NICE 페이로드 생성 (검증된 금액 사용)
    // ------------------------------
    const payload = {
      amount: Number(verifiedAmount),
      orderId,
      goodsName: goodsName || "",
      returnUrl: returnUrl || process.env.DEFAULT_RETURN_URL || `${process.env.BASE_URL || "https://my-payment-server.vercel.app"}/api/pay/callback`
    };

    console.log(`[SECURE] start: order=${orderId} goodsName=${goodsName} clientAmount=${clientAmount} verifiedAmount=${payload.amount}`);

    // ------------------------------
    // 3) NICE 결제 요청
    // ------------------------------
    const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
      },
      body: JSON.stringify(payload)
    });

    if (!rsp.ok) {
      const text = await rsp.text().catch(() => "");
      console.error("[NICE] request failed", rsp.status, text);
      return res.status(502).json({ error: "Payment provider request failed", status: rsp.status, body: text });
    }

    const j = await rsp.json();
    return res.status(200).json({ redirectUrl: j.nextUrl, raw: j });
  } catch (err) {
    console.error("start route error:", err);
    return res.status(500).json({ error: "internal_error", detail: String(err.message || err) });
  }
}
