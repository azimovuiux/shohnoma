export function TelegramIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M21.2 4.1 2.9 11.2c-.8.3-.8 1.4 0 1.7l4.5 1.6 1.7 5.4c.2.7 1.1.9 1.6.4l2.6-2.4 4.5 3.3c.6.4 1.4.1 1.6-.6l3.1-14.7c.2-.8-.6-1.4-1.3-1.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m9.4 14.3 7.4-6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
