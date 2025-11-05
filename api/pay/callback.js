// /api/pay/callback.js 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { authResultCode, authToken, tid, amount } = req.body;

  // 결제 성공인지 체크
  if (authResultCode !== "0000") {
    return res.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  // ✅ 승인을 NICE 서버로 요청
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
    },
    body: JSON.stringify({
      amount: amount
    })
  }).then(r => r.json());

  if (approve.resultCode === "0000") {
    // ✅ 성공 → 고객에게 성공 페이지로
    return res.redirect(
      `https://easysajusaju-dev.github.io/thankyou.html?oid=${approve.orderId}&amount=${approve.amount}`
    );
  } else {
    // ❌ 실패 처리
    return res.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }
}
