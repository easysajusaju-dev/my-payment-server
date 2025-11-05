export async function POST(req) {
  try {
    // ✅ formData 로 받기 (나이스페이 POST 방식)
    const form = await req.formData();
    const authResultCode = form.get("authResultCode");
    const authToken = form.get("authToken");
    const tid = form.get("tid");
    const amount = form.get("amount");

    console.log("✅ NICE callback:", { authResultCode, authToken, tid, amount });

    // ❌ 인증 실패
    if (authResultCode !== "0000") {
      return Response.redirect(
        "https://easysajusaju-dev.github.io/payment-fail.html",
        302
      );
    }

    // ✅ 승인 요청 (Server 인증)
    const secretKey = process.env.NICE_SECRET_BASE64;

    const approveRes = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secretKey}`
      },
      body: JSON.stringify({
        amount: Number(amount)
      })
    });

    const approve = await approveRes.json();
    console.log("✅ NICE approve:", approve);

    if (approve.resultCode === "0000") {
      // ✅ 성공 → redirect
      return Response.redirect(
        `https://easysajusaju-dev.github.io/thankyou.html?oid=${approve.orderId}&amount=${approve.amount}`,
        302
      );
    } else {
      return Response.redirect(
        "https://easysajusaju-dev.github.io/payment-fail.html",
        302
      );
    }
  } catch (e) {
    console.error("❌ Callback error:", e);
    return Response.redirect(
      "https://easysajusaju-dev.github.io/payment-fail.html",
      302
    );
  }
}
