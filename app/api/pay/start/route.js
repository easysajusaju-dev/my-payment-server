// app/api/pay/start/route.js

export async function OPTIONS() {
  // ✅ Preflight (CORS) 요청 대응
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  try {
    const { orderId, goodsName, amount, returnUrl } = await req.json();

    // ✅ 시트 상품 검증
    const verifyRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "https://my-payment-server.vercel.app"}/api/pay/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goodsName }),
      }
    );

    const verifyData = await verifyRes.json();
    if (!verifyData.ok) {
      return new Response(JSON.stringify({ ok: false, error: "상품 검증 실패" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // ✅ 조작방지 — 시트 금액 강제 사용
    const finalAmount = Number(verifyData.verifiedAmount);

    const payload = {
      amount: finalAmount,
      orderId,
      goodsName,
      returnUrl: returnUrl || process.env.DEFAULT_RETURN_URL,
    };

    const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
      },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

    return new Response(JSON.stringify({ ok: true, redirectUrl: rsp.nextUrl || rsp.redirectUrl }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("❌ start/pay error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
