export async function POST(req) {
  const body = await req.json();
  const { authResultCode, authToken, tid, amount, orderId } = body;

  // 실패했을 경우
  if (authResultCode !== "0000") {
    return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  // 승인 요청
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
    },
    body: JSON.stringify({ amount })
  }).then(r => r.json());

  if (approve.resultCode === "0000") {
    return Response.redirect(
      `https://easysajusaju-dev.github.io/thankyou.html?oid=${orderId}&amount=${amount}`
    );
  }

  return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
}
