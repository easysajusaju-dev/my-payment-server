export default async function handler(req, res) {
  try {
    const { tid, amount } = req.query;

    if (!tid || !amount) {
      return res.status(400).json({ error: "Missing params" });
    }

    // 인증 토큰 발급
    const tokenRes = await fetch("https://pay.nicepay.co.kr/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: process.env.NICE_CLIENT_ID,
        secretKey: process.env.NICE_SECRET_KEY
      })
    });

    const token = await tokenRes.json();

    if (!token?.accessToken) {
      return res.status(401).json({ error: "Token fail", details: token });
    }

    // 승인 요청
    const confirmRes = await fetch("https://pay.nicepay.co.kr/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tid,
        amount: Number(amount)
      })
    });

    const confirm = await confirmRes.json();
    return res.status(200).json(confirm);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
