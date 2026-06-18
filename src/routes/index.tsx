import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { FeatureStrip } from "@/components/landing/FeatureStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { Bilingual } from "@/components/landing/Bilingual";
import { UseCases } from "@/components/landing/UseCases";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KABSA CALL.ai — AI Voice Scheduling, 24/7" },
      {
        name: "description",
        content:
          "KABSA CALL.ai is an AI voice agent that answers calls and books, reschedules, or cancels appointments 24/7 in English and Arabic.",
      },
      { property: "og:title", content: "KABSA CALL.ai — AI Voice Scheduling, 24/7" },
      {
        property: "og:description",
        content:
          "Never miss a customer call. AI voice agent for appointment scheduling — English & Arabic, under 500ms latency.",
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
        <ScrollReveal intensity="strong"><Bilingual /></ScrollReveal>
        <ScrollReveal intensity="medium"><UseCases /></ScrollReveal>
        <ScrollReveal intensity="strong"><FinalCta /></ScrollReveal>
      </main>
      <Footer />
    </div>
  );
}
