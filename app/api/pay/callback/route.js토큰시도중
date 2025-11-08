// /callback/route.js
export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName") || "이지사주 상담";
  const orderId = form.get("orderId");

  const secret = process.env.NICE_SECRET_BASE64;

  if (authResultCode !== "0000") {
    await fetch("https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ mode: "updatePayment", orderId, payStatus: "결제취소" }),
    });
    return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  // ✅ 결제 승인
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${secret}` },
    body: JSON.stringify({ amount }),
  });
  const result = await approve.json();

  if (result.resultCode === "0000") {
    // ✅ 결제 성공 → 토큰 생성
    const tokenRes = await fetch("https://my-payment-server.vercel.app/api/generate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, product: goodsName, amount }),
    });
    const { token } = await tokenRes.json();

    // ✅ 결제완료 로그
    await fetch("https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ mode: "updatePayment", orderId, payStatus: "결제완료" }),
    });

    return Response.redirect(`https://easysajusaju-dev.github.io/thankyou.html?token=${token}`);
  }

  // 승인 실패
  await fetch("https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ mode: "updatePayment", orderId, payStatus: "결제실패" }),
  });

  return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
}
