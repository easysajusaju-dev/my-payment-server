// app/api/pay/start/route.js
export async function POST(req) {
  // CORS 헤더 (브라우저가 GitHub Pages 등 다른 도메인에서 호출할 경우 필요)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // preflight 처리
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const { orderId, goodsName, returnUrl } = body || {};

    if (!goodsName) {
      return Response.json({ ok: false, error: "상품명 누락" }, { status: 400, headers });
    }

    // 1) 시트에서 official price 가져오기 (verify API 호출)
    const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://my-payment-server.vercel.app";
    const verifyRes = await fetch(`${base}/api/pay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsName })
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.ok) {
      // 상품이 없거나 verify 실패면 에러 반환 (이 경우만 예외)
      return Response.json({ ok: false, error: "상품 검증 실패", detail: verifyData.error || verifyData }, { status: 400, headers });
    }

    const verifiedAmount = Number(verifyData.verifiedAmount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return Response.json({ ok: false, error: "유효한 금액 없음" }, { status: 400, headers });
    }

    // 2) verifiedAmount로만 PG 요청 (클라이언트 amount 무시)
    const payload = {
      amount: verifiedAmount,
      orderId,
      goodsName,
      returnUrl: returnUrl || process.env.DEFAULT_RETURN_URL || `${base}/api/pay/callback`
    };

    // NICEPAY 요청 (예시)
    const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
      },
      body: JSON.stringify(payload),
    });

    if (!rsp.ok) {
      const txt = await rsp.text().catch(()=>"");
      return Response.json({ ok: false, error: "PG 요청 실패", detail: txt }, { status: 502, headers });
    }

    const j = await rsp.json();

    // 3) PG가 준 redirectUrl을 프론트로 반환
    return Response.json({ ok: true, redirectUrl: j.nextUrl || j.redirectUrl, raw: j }, { headers });
  } catch (err) {
    console.error("start route error:", err);
    return Response.json({ ok: false, error: "서버 오류", detail: String(err.message || err) }, { status: 500, headers });
  }
}
