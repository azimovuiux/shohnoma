"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="uz">
      <body style={{ margin: 0, background: "#fdfbf7", fontFamily: "system-ui, sans-serif" }}>
        <ErrorScreen error={error} />
      </body>
    </html>
  );
}
