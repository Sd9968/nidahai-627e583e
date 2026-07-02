import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { FeatureStrip } from "@/components/landing/FeatureStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { Bilingual } from "@/components/landing/Bilingual";
import { ComingSoon } from "@/components/landing/ComingSoon";

import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Marquee } from "@/components/landing/Marquee";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NidahAI — AI Voice Scheduling, 24/7" },
      {
        name: "description",
        content:
          "NidahAI is an AI voice agent that answers calls and books, reschedules, or cancels appointments 24/7 in English and Arabic.",
      },
      { property: "og:title", content: "NidahAI — AI Voice Scheduling, 24/7" },
      {
        property: "og:description",
        content:
          "Never miss a customer call. AI voice agent for appointment scheduling — Arabic & English, 24/7.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-fir text-foreground antialiased">
      <Navbar />
      <main className="overflow-x-clip">
        <Hero />
        <ScrollReveal intensity="soft"><FeatureStrip /></ScrollReveal>
        <ScrollReveal intensity="medium"><HowItWorks /></ScrollReveal>
        <ScrollReveal intensity="medium"><Benefits /></ScrollReveal>
        <Marquee />
        <ScrollReveal intensity="strong"><Bilingual /></ScrollReveal>
        <ScrollReveal intensity="medium"><ComingSoon /></ScrollReveal>
        <ScrollReveal intensity="strong"><FinalCta /></ScrollReveal>
      </main>
      <Footer />
    </div>
  );
}
