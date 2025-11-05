export default async function handler(req, res) {
  try {
    const { orderId, amount, product } = req.query;

    if (!orderId || !amount) {
      return res.status(400).json({ error: "Missing params" });
    }

    const clientId = process.env.NICE_CLIENT_ID;
    const secretKey = process.env.NICE_SECRET_KEY;

    // 1) 인증 토큰 발급
    const tokenRes = await fetch("https://pay.nicepay.co.kr/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        secretKey
      })
    });
    const token = await tokenRes.json();

    if (!token?.accessToken) {
      return res.status(401).json({ error: "Token get failed", details: token });
    }

    // 2) 결제 생성
    const payReq = await fetch("https://pay.nicepay.co.kr/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orderId,
        amount: Number(amount),
        goodsName: product,
        returnUrl: `${process.env.SITE_DOMAIN}/payment-callback.html`
      })
    });

    const payData = await payReq.json();
    return res.status(200).json(payData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
