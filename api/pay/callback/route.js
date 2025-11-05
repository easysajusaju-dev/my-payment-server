export async function POST(req) {
  try {
    const body = await req.json();
    const { authResultCode, authToken, tid, amount } = body;

    // 실패면 fail 페이지로
    if (authResultCode !== "0000") {
      return Response.redirect(
        "https://easysajusaju-dev.github.io/payment-fail.html"
      );
    }

    // ✅ 승인 요청
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.NICE_SECRET_BASE64}`
      },
      body: JSON.stringify({
        amount: amount
      })
    }).then(r => r.json());

    // ✅ 승인 성공 → thankyou 이동
    if (approve.resultCode === "0000") {
      return Response.redirect(
        `https://easysajusaju-dev.github.io/thankyou.html?oid=${approve.orderId}&amount=${approve.amount}`
      );
    }

    // 승인 실패
    return Response.redirect(
      "https://easysajusaju-dev.github.io/payment-fail.html"
    );

  } catch (e) {
    console.error(e);
    return Response.redirect(
      "https://easysajusaju-dev.github.io/payment-fail.html"
    );
  }
}
