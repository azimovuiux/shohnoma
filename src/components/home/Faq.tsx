"use client";

import { useState } from "react";
import { Add, ArrowRight, Minus } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { site } from "@/lib/site";
import { faqs } from "@/lib/faq";

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="savollar" className="scroll-mt-20 bg-bg-soft px-5 py-20 lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 lg:flex-row lg:gap-20">
        <div data-reveal="up" className="flex shrink-0 flex-col gap-[22px] lg:w-[400px]">
          <h2 className="flex flex-col font-serif font-light">
            <span className="-mb-1 text-[36px] leading-[1.04] text-ink lg:text-[52px]">Ko‘p so‘raladigan</span>
            <em className="text-[42px] italic leading-none text-maroon lg:text-[64px]">savollar</em>
          </h2>
          <p className="t-body-m max-w-[340px] text-ink-2">Javob topolmadingizmi? Bizga yozing — yordam beramiz.</p>
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 t-nav text-maroon hover:underline">
            <TelegramIcon size={16} /> Telegramda savol berish <ArrowRight size={14} />
          </a>
        </div>
        <div data-reveal="up" style={{ ["--d" as string]: "120ms" }} className="flex-1 border-t border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="group flex w-full cursor-pointer items-center gap-6 py-[26px] text-left"
                  >
                    <span className="flex-1 text-[16px] font-semibold leading-[1.35] text-ink transition-colors group-hover:text-maroon">{f.q}</span>
                    <span
                      className={`flex size-[34px] shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen ? "bg-maroon text-ink-inverse" : "border border-line text-ink group-hover:border-maroon group-hover:text-maroon"
                      }`}
                    >
                      {isOpen ? <Minus size={16} /> : <Add size={16} />}
                    </span>
                  </button>
                </h3>
                <div id={`faq-${i}`} hidden={!isOpen} className="t-body-m -mt-2 max-w-[620px] pb-[26px] text-ink-2 animate-[fade-in_.3s]">
                  {f.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
