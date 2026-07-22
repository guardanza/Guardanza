import { Hero } from "@/components/marketing/hero";
import { Benefits } from "@/components/marketing/benefits";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SegmentValue } from "@/components/marketing/segment-value";
import { TrustCommitments } from "@/components/marketing/trust-commitments";
import { CTAFinal } from "@/components/marketing/cta-final";
import { Footer } from "@/components/marketing/footer";

export function MarketingHome() {
  return (
    <div>
      <Hero />
      <Benefits />
      <HowItWorks />
      <SegmentValue />
      <TrustCommitments />
      <CTAFinal />
      <Footer />
    </div>
  );
}
