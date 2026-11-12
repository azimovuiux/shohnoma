import { langAlternates } from "@/lib/i18n/meta";
import { Hero } from "@/components/home/Hero";
import { Showcase } from "@/components/home/Showcase";
import { Stories } from "@/components/home/Stories";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Features } from "@/components/home/Features";
import { CustomDesign } from "@/components/home/CustomDesign";
import { Faq, FaqJsonLd } from "@/components/home/Faq";
import { Contact } from "@/components/home/Contact";
import { Finale } from "@/components/home/Finale";

export const metadata = { alternates: langAlternates("/") };

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
      <FaqJsonLd />
    </>
  );
}
