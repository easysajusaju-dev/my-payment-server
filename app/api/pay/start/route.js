export async function POST(req) {
  const body = await req.json();
  const { orderId, goodsName, amount, returnUrl } = body;

  const response = await fetch("https://api.nicepay.co.kr/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.NICE_SECRET_BASE64}`
    },
    body: JSON.stringify({
      orderId,
      goodsName,
      amount,
      returnUrl
    })
  }).then(r => r.json());

  return Response.json({ redirectUrl: response.nextUrl });
}
