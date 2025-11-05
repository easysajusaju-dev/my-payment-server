export const metadata = {
  title: "My Payment Server",
  description: "Next.js payment server for NICEPAY integration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
