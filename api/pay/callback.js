export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { authResultCode, tid, amount } = req.body;

  if (authResultCode !== "0000") {
    return res.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  const rsp = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
    },
    body: JSON.stringify({ amount })
  }).then(r => r.json());

  if (rsp.resultCode === "0000") {
    return res.redirect(`https://easysajusaju-dev.github.io/thankyou.html?oid=${rsp.orderId}&amount=${rsp.amount}`);
  } else {
    return res.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }
}
