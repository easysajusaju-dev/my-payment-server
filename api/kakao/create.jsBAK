export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, product, price } = req.body;

  const response = await fetch("https://kapi.kakao.com/v1/payment/ready", {
    method: "POST",
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({
      cid: "TC0ONETIME",
      partner_order_id: orderId,
      partner_user_id: orderId,
      item_name: product,
      quantity: 1,
      total_amount: price,
      vat_amount: 0,
      tax_free_amount: 0,
      approval_url: `${process.env.SUCCESS_URL}?oid=${orderId}&amount=${price}&product=${encodeURIComponent(product)}`,
      cancel_url: `${process.env.FAIL_URL}?oid=${orderId}`,
      fail_url: `${process.env.FAIL_URL}?oid=${orderId}`,
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
