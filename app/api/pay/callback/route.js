export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = form.get("amount");

  if (authResultCode !== "0000") {
    return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  const secret = process.env.NICE_SECRET_BASE64;

  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${secret}`
    },
    body: JSON.stringify({ amount: Number(amount) })
  });
  
  const result = await approve.json();

  if (result.resultCode === "0000") {
    return Response.redirect(`https://easysajusaju-dev.github.io/thankyou.html?oid=${result.orderId}&amount=${amount}`);
  }

  return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
}
