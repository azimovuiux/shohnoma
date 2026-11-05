import type { ReactNode } from "react";
import {
  Edit,
  Gallery,
  Eye,
  TickCircle,
  Send2,
  Mobile,
  Card,
  UserTick,
  Profile2User,
  MessageText,
} from "@/components/icons";
import { GirihPattern } from "@/components/Ornament";
import { Photo } from "./Photo";

function StoryText({
  n,
  plain,
  italic,
  text,
  bullets,
}: {
  n: string;
  plain: string;
  italic: string;
  text: string;
  bullets: { icon: ReactNode; label: string }[];
}) {
  return (
    <div className="flex max-w-[500px] flex-col gap-[26px]" data-reveal="up">
      <div className="flex items-center gap-3.5">
        <span className="font-serif text-[40px] font-light italic leading-none tracking-[-0.01em] text-gold">{n}</span>
        <span className="h-px w-16 bg-gold" />
      </div>
      <h2 className="flex flex-col font-serif font-light">
        <span className="-mb-1 text-[36px] leading-[1.04] text-ink lg:text-[52px]">{plain}</span>
        <em className="text-[42px] italic leading-none text-maroon lg:text-[64px]">{italic}</em>
      </h2>
      <p className="t-body-l max-w-[470px] text-ink-2">{text}</p>
      <ul className="flex flex-col gap-3.5">
        {bullets.map((b, i) => (
          <li key={b.label} data-reveal="left" style={{ ["--d" as string]: `${300 + i * 110}ms` }} className="flex items-center gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">{b.icon}</span>
            <span className="t-title text-ink">{b.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UICard({ icon, title, children, className = "", delay = 650 }: { icon?: ReactNode; title?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      data-reveal="pop"
      style={{ ["--d" as string]: `${delay}ms` }}
      className={`flex flex-col gap-3 rounded-[18px] border border-line bg-bg-base p-[18px] shadow-[0_8px_10px_rgba(31,15,10,0.10)] ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2.5 t-title text-ink">
          {icon}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Hikoya 1 ── */
function Visual1() {
  return (
    <div className="relative mx-auto aspect-[580/700] w-full max-w-[580px]">
      <GirihPattern id="g-story1" cell={44} color="#d9b97a" opacity={0.5} className="absolute -left-[17%] -top-[8.6%] h-[53%] w-[85%]" />
      {[
        { left: "1.7%", top: "12.9%", pos: "0%" },
        { left: "34.5%", top: "2.9%", pos: "50%" },
        { left: "67.2%", top: "19.4%", pos: "100%" },
      ].map((s, i) => (
        <Photo
          key={i}
          alt="Yosh juftlik divanda telefonga qarab tabassum qilmoqda"
          src="/images/story-1.webp"
          className="absolute h-[88.6%] w-[31%] rounded-[14px]"
          reveal="clip"
          delay={i * 160}
          style={{ left: s.left, top: s.top, backgroundPosition: `${s.pos} 50%`, backgroundSize: "330% auto" }}
          tone={i === 1 ? "cream" : "warm"}
        />
      ))}
      <UICard icon={<Edit size={17} />} title="Ma’lumotlar" className="absolute left-[30%] top-[61.4%] w-[268px] max-w-[66%] sm:left-[57%] sm:max-w-none">
        {[
          ["Ismlar", "Jasur & Madina"],
          ["Sana", "12 sentabr, 18:00"],
          ["Manzil", "Oqsaroy to‘yxonasi"],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center gap-2.5 rounded-[10px] bg-bg-soft px-3 py-2.5">
            <div className="flex flex-1 flex-col">
              <span className="text-[11px] leading-[1.5] text-ink-2">{l}</span>
              <span className="text-[13px] font-semibold text-ink">{v}</span>
            </div>
            <TickCircle size={16} color="var(--color-gold)" />
          </div>
        ))}
      </UICard>
    </div>
  );
}

/* ── Hikoya 2 ── */
function Visual2() {
  return (
    <div className="relative mx-auto aspect-[580/700] w-full max-w-[580px]">
      <GirihPattern id="g-story2" cell={44} color="#d9b97a" opacity={0.5} className="absolute left-[14.5%] top-[11.4%] h-[70.9%] w-[85.5%]" />
      <Photo
        alt="Krem kostyumdagi ayol telefonga qarab tabassum qilmoqda"
        src="/images/story-2.webp"
        className="absolute left-[29.3%] top-[4.3%] h-[91.4%] w-[65.5%] rounded-full"
        reveal="scale"
        tone="cream"
      />
      <Photo
        alt="Telefon tutgan qo‘l"
        src="/images/story-2-hand.webp"
        className="absolute left-[69%] top-[71.4%] aspect-square w-[32.8%] rounded-full border-[6px] border-white shadow-[0_10px_20px_rgba(31,15,10,0.15)]"
        reveal="pop"
        delay={350}
        tone="rose"
      />
      <UICard className="absolute left-0 top-[17%] w-[280px] max-w-[70%]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-maroon text-[14px] font-semibold text-ink-inverse">J</span>
          <div className="flex flex-col gap-px">
            <span className="text-[13px] font-semibold text-ink">Jasur</span>
            <span className="text-[11px] text-ink-2">hozirgina</span>
          </div>
        </div>
        <p className="text-[13px] leading-[1.5] text-ink">Salom, Nilufar! To‘yimizga taklif qilamiz — albatta keling.</p>
        <div className="flex items-center gap-3 rounded-xl bg-bg-soft p-2.5">
          <span className="flex h-[54px] w-11 shrink-0 items-center justify-center rounded-lg bg-maroon">
            <span className="size-3.5 rounded-full bg-[#c9a25e]" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[12px] font-semibold text-ink">Jasur &amp; Madina — taklifnoma</span>
            <span className="truncate text-[11px] text-ink-2">shohnoma.uz/jasur-madina</span>
          </div>
        </div>
      </UICard>
    </div>
  );
}

/* ── Hikoya 3 ── */
function Visual3() {
  const guests = [
    { i: "D", name: "Dilnoza opa", status: "Boraman · 2 kishi", ok: true },
    { i: "S", name: "Sardor aka", status: "Boraman", ok: true },
    { i: "M", name: "Malika", status: "Aniq emas", ok: false },
  ];
  return (
    <div className="relative mx-auto aspect-[580/700] w-full max-w-[580px]">
      <GirihPattern id="g-story3" cell={44} color="#d9b97a" opacity={0.5} className="absolute left-[43%] -top-[1.7%] h-[53%] w-[64%]" />
      {/* Pochta markasi shaklidagi rasm (tishli chet): padding hududida teshiklar, ichi to‘liq */}
      <div
        data-reveal="scale"
        className="absolute left-[3.4%] top-[7.1%] h-[85.7%] w-[81%] p-[8px]"
        style={{
          WebkitMask:
            "radial-gradient(circle 6px at center, #0000 98%, #000) -11px -11px / 22px 22px round, linear-gradient(#000 0 0) content-box",
          mask: "radial-gradient(circle 6px at center, #0000 98%, #000) -11px -11px / 22px 22px round, linear-gradient(#000 0 0) content-box",
        }}
      >
        <Photo alt="Ikki dugona telefonga qarab kulmoqda" src="/images/story-3.webp" className="absolute inset-0" tone="cream" />
        <span className="absolute inset-[18px] border border-white/70" />
      </div>
      <UICard icon={<Profile2User size={17} />} title="Mehmonlar javobi" className="absolute left-[30%] top-[54%] w-[290px] max-w-[70%] sm:left-[50%] sm:max-w-none">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["128", "Boraman", "text-maroon"],
            ["36", "Aniq emas", "text-gold"],
            ["14", "Kela olmaydi", "text-ink-2"],
          ].map(([n, l, c]) => (
            <div key={l} className="flex flex-col gap-0.5 rounded-[10px] bg-bg-soft p-2.5">
              <span className={`font-serif text-[24px] font-medium leading-[1.2] ${c}`}>{n}</span>
              <span className="text-[10px] leading-[1.5] text-ink-2">{l}</span>
            </div>
          ))}
        </div>
        <div className="flex h-[5px] gap-[3px]">
          <span className="flex-[180] rounded-[3px] bg-maroon" />
          <span className="flex-[50] rounded-[3px] bg-gold" />
          <span className="flex-[20] rounded-[3px] bg-[#d8d0c2]" />
        </div>
        {guests.map((g) => (
          <div key={g.name} className="flex items-center gap-2.5">
            <span className="flex size-[30px] items-center justify-center rounded-full bg-gold-soft text-[12px] font-semibold text-maroon">{g.i}</span>
            <span className="flex-1 truncate text-[13px] font-semibold text-ink">{g.name}</span>
            <span
              className="rounded-full px-2.5 py-[5px] text-[11px] leading-[1.5]"
              style={g.ok ? { color: "var(--color-success)", background: "var(--success-bg)" } : { color: "var(--color-pending)", background: "var(--pending-bg)" }}
            >
              {g.status}
            </span>
          </div>
        ))}
      </UICard>
    </div>
  );
}

export function Stories() {
  return (
    <>
      <section className="bg-bg-soft px-5 py-20 lg:px-[120px] lg:py-[120px]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:justify-between">
          <Visual1 />
          <StoryText
            n="01"
            plain="Tanlang va"
            italic="to‘ldiring"
            text="Kechqurun, choy ustida, birgalikda — yoqqan dizaynni tanlaysiz, ismlaringiz, sana va manzilni yozasiz. Taklifnoma ko‘z oldingizda tayyor bo‘lib boradi."
            bullets={[
              { icon: <Edit size={18} />, label: "Ismlar, sana va manzil" },
              { icon: <Gallery size={18} />, label: "O‘z suratlaringiz" },
              { icon: <Eye size={18} />, label: "Tayyor ko‘rinishini darhol ko‘rasiz" },
            ]}
          />
        </div>
      </section>
      <section className="bg-bg-base px-5 py-20 lg:px-[120px] lg:py-[120px]">
        <div className="mx-auto flex max-w-[1200px] flex-col-reverse items-center gap-14 lg:flex-row lg:justify-between">
          <StoryText
            n="02"
            plain="Bir havola —"
            italic="hammaga"
            text="To‘lovdan so‘ng tayyor havolani olasiz va uni Telegram yoki Instagramda yuborasiz. Kursdoshlaringiz ham, chet eldagi do‘stlaringiz ham taklifnomani bir bosishda ochadi."
            bullets={[
              { icon: <Send2 size={18} />, label: "Telegram va Instagram orqali" },
              { icon: <Mobile size={18} />, label: "Ilovasiz, har qanday telefonda" },
              { icon: <Card size={18} />, label: "Payme, Click, Google Pay yoki P2P" },
            ]}
          />
          <Visual2 />
        </div>
      </section>
      <section className="bg-bg-soft px-5 py-20 lg:px-[120px] lg:py-[120px]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:justify-between">
          <Visual3 />
          <StoryText
            n="03"
            plain="Kim kelishini"
            italic="oldindan biling"
            text="Mehmonlar bir tugma bilan javob beradi va tilaklarini qoldiradi. Siz esa ro‘yxatni bir joyda ko‘rib, joy va dasturxonni xotirjam rejalashtirasiz."
            bullets={[
              { icon: <UserTick size={18} />, label: "Javoblar bitta ro‘yxatda" },
              { icon: <Profile2User size={18} />, label: "Necha kishi kelishi aniq" },
              { icon: <MessageText size={18} />, label: "Tilak va izohlar" },
            ]}
          />
        </div>
      </section>
    </>
  );
}
