export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { tid, pg_token, orderId, price, product } = req.body;

  const response = await fetch("https://kapi.kakao.com/v1/payment/approve", {
    method: "POST",
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({
      cid: "TC0ONETIME",
      tid,
      partner_order_id: orderId,
      partner_user_id: orderId,
      pg_token,
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
