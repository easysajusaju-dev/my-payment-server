// app/api/pay/start/route.js
export async function POST(req) {
  try {
    const { orderId, goodsName, amount, returnUrl } = await req.json();

    // ✅ Step 1. 시트에 등록된 금액 확인
    const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://my-payment-server.vercel.app"}/api/pay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsName }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.ok) {
      return Response.json(
        { ok: false, error: `상품 검증 실패: ${verifyData.error}` },
        { status: 400 }
      );
    }

    // ✅ Step 2. 검증된 금액과 요청 금액 비교
    if (Number(verifyData.verifiedAmount) !== Number(amount)) {
      return Response.json(
        {
          ok: false,
          error: `요청 금액(${amount})이 실제 금액(${verifyData.verifiedAmount})과 일치하지 않습니다.`,
        },
        { status: 400 }
      );
    }

    // ✅ Step 3. PG사로 결제 요청
    const payload = {
      amount: verifyData.verifiedAmount,
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

    // ✅ Step 4. PG 응답 반환
    return Response.json({ ok: true, redirectUrl: rsp.nextUrl || rsp.redirectUrl });
  } catch (err) {
    console.error("❌ start/pay error:", err);
    return Response.json(
      { ok: false, error: "결제 시작 중 서버 오류", detail: err.message },
      { status: 500 }
    );
  }
}
