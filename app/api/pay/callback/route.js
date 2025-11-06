export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName"); // ✅ NICEPAY가 전달하는 상품명

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
    body: JSON.stringify({ amount })
  });

  const result = await approve.json();

  // ✅ 결제 성공 시
  if (result.resultCode === "0000") {
    const orderId = result.orderId;
    const redirectUrl = `https://easysajusaju-dev.github.io/thankyou.html?oid=${orderId}&product=${encodeURIComponent(goodsName)}&price=${amount}`;

    // ✅ Logger.gs로 결제정보 전송
    try {
      await fetch("https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          mode: "updatePayment",
          orderId,
          payStatus: "결제완료"
        }),
      });
    } catch (err) {
      console.error("❌ Logger.gs 업데이트 실패:", err);
    }

    return Response.redirect(redirectUrl);
  }

  return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
}
