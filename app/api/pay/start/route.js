// app/api/pay/start/route.js

// ✅ 모든 응답에 공통 CORS 헤더 추가
function withCors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

// ✅ Preflight 요청 허용
export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function POST(req) {
  try {
    const { orderId, goodsName, amount, returnUrl } = await req.json();

    // ✅ Step 1: 상품 검증
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
      return withCors(
        new Response(
          JSON.stringify({ ok: false, error: "상품 검증 실패" }),
          { status: 400 }
        )
      );
    }

    // ✅ Step 2: 검증된 금액 사용 (위조 방지)
    const finalAmount = Number(verifyData.verifiedAmount);

    const payload = {
      amount: finalAmount,
      orderId,
      goodsName,
      returnUrl: returnUrl || process.env.DEFAULT_RETURN_URL,
    };

    // ✅ Step 3: NICEPAY 요청 (테스트용은 sandbox)
    const rsp = await fetch(
      "https://sandbox-api.nicepay.co.kr/v1/payments/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`,
        },
        body: JSON.stringify(payload),
      }
    ).then((r) => r.json());

    console.log("NICEPAY 응답:", rsp);

    // ✅ Step 4: nextUrl 확인
    if (!rsp.nextUrl && !rsp.redirectUrl) {
      return withCors(
        new Response(
          JSON.stringify({
            ok: false,
            error: `결제창을 열지 못했습니다: ${rsp.resultMsg || "NICEPAY 응답 없음"}`,
          }),
          { status: 400 }
        )
      );
    }

    // ✅ 정상 반환
    return withCors(
      new Response(
        JSON.stringify({ ok: true, redirectUrl: rsp.nextUrl || rsp.redirectUrl }),
        { status: 200 }
      )
    );
  } catch (err) {
    console.error("❌ start/pay error:", err);
    return withCors(
      new Response(
        JSON.stringify({ ok: false, error: err.message }),
        { status: 500 }
      )
    );
  }
}
