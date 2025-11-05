// ✅ NICEPAY Server 승인 (결제창 요청) API
// 파일 경로: /pages/api/pay/start.js

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // ----- ✅ CORS 허용 -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { orderId, goodsName, amount, returnUrl } = req.body;

    if (!orderId || !amount || !goodsName || !returnUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ NICEPAY 요청 URL
    const NICE_URL = "https://pay.nicepay.co.kr/v1/pay";

    const params = new URLSearchParams({
      clientId: process.env.NICE_CLIENT_KEY,  // 🔥 환경변수에 넣은 클라이언트 키
      method: "CARD",
      orderId,
      amount,
      goodsName,
      returnUrl,
    });

    const redirectUrl = `${NICE_URL}?${params.toString()}`;

    console.log("✅ NICE redirect URL:", redirectUrl);

    return res.status(200).json({ redirectUrl });

  } catch (err) {
    console.error("❌ PAY START ERROR", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
