export async function POST(req) {
  const form = await req.formData();
  const authResultCode = form.get("authResultCode");
  const authToken = form.get("authToken");
  const tid = form.get("tid");
  const amount = form.get("amount");
  const goodsName = form.get("goodsName") || "이지사주 상담"; // ✅ 기본값 보강
  const orderId = form.get("orderId"); // ✅ 주문번호 (Logger 연동용)

  const secret = process.env.NICE_SECRET_BASE64;

  // ✅ [1] 결제 취소 또는 실패 처리
  if (authResultCode !== "0000") {
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId,
            payStatus: "결제취소",
          }),
        }
      );
      console.log("❎ Logger.gs 결제취소 기록 완료");
    } catch (err) {
      console.error("❌ Logger.gs 결제취소 기록 실패:", err);
    }

    return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
  }

  // ✅ [2] 결제 승인 요청
  const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${secret}`,
    },
    body: JSON.stringify({ amount }),
  });

  const result = await approve.json();

  // ✅ [3] 결제 성공 시 (NICEPAY 승인 완료)
  if (result.resultCode === "0000") {
    const redirectUrl = `https://easysajusaju-dev.github.io/thankyou.html?oid=${orderId}&product=${encodeURIComponent(goodsName)}&price=${amount}`;

    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            mode: "updatePayment",
            orderId,
            payStatus: "결제완료",
          }),
        }
      );
      console.log("✅ Logger.gs 결제완료 기록 성공");
    } catch (err) {
      console.error("❌ Logger.gs 결제완료 기록 실패:", err);
    }

    return Response.redirect(redirectUrl);
  }

  // ✅ [4] 승인 실패 시
  try {
    await fetch(
      "https://script.google.com/macros/s/AKfycbz_SRAMhhOT396196sgEzHeDMNk_oF7IL-M5BpAReKum04hVtkVYw0AwY71P4SyEdm-/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          mode: "updatePayment",
          orderId,
          payStatus: "결제실패",
        }),
      }
    );
    console.log("⚠️ Logger.gs 결제실패 기록 완료");
  } catch (err) {
    console.error("❌ Logger.gs 결제실패 기록 실패:", err);
  }

  return Response.redirect("https://easysajusaju-dev.github.io/payment-fail.html");
}
