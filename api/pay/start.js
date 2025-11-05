export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { orderId, goodsName, amount, returnUrl } = req.body;

  const payload = {
    amount,
    orderId,
    goodsName,
    returnUrl
  };

  const rsp = await fetch("https://api.nicepay.co.kr/v1/payments/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
    },
    body: JSON.stringify(payload)
  }).then(r => r.json());

  return res.json({ redirectUrl: rsp.nextUrl });
}
