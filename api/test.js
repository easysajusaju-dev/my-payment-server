// 파일 위치: /api/test.js

export default function handler(request, response) {
  // 이 함수는 누군가 이 주소를 호출하면 자동으로 실행됩니다.

  // 성공했다는 의미로 200 상태 코드와 함께
  // json 형태의 메시지를 응답(response)으로 보내줍니다.
  response.status(200).json({
    message: "안녕하세요! Vercel 서버가 응답합니다."
  });
}