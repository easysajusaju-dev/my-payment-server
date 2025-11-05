export async function POST(req) {
  const form = await req.formData();

  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const orderId = form.get("orderId");

  if (authResultCode !== "0000") {
    return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

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
