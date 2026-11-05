import { Messages } from "@/components/icons";
import { site } from "@/lib/site";

/** Suzuvchi aloqa — har sahifada, o‘ng pastda (spec §5.3) */
export function FloatingContact() {
  return (
    <a
      href={site.telegram}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Savolingiz bormi? Telegramda yozing"
      className="group fixed bottom-5 right-5 z-30 flex items-center gap-2.5 lg:bottom-8 lg:right-8"
    >
      <span className="hidden rounded-full border border-line bg-bg-base px-4 py-2.5 text-[13px] font-medium leading-none text-ink shadow-[0_4px_6px_rgba(26,13,10,0.08)] lg:block">
        Savolingiz bormi? Yozing
      </span>
      <span className="flex size-14 items-center justify-center rounded-full bg-maroon text-ink-inverse shadow-float transition-transform group-hover:-translate-y-0.5">
        <Messages size={22} />
      </span>
    </a>
  );
}
