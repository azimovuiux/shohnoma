import { Hero } from "@/components/home/Hero";
import { Showcase } from "@/components/home/Showcase";
import { Stories } from "@/components/home/Stories";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Features } from "@/components/home/Features";
import { CustomDesign } from "@/components/home/CustomDesign";
import { Faq } from "@/components/home/Faq";
import { faqs } from "@/lib/faq";
import { Contact } from "@/components/home/Contact";
import { Finale } from "@/components/home/Finale";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Home() {
  return (
    <>
      <Hero />
      <Showcase />
      <Stories />
      <HowItWorks />
      <Features />
      <CustomDesign />
      <Faq />
      <Contact />
      <Finale />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
