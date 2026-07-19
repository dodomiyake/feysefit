import Image from "next/image";
import { cn } from "@/lib/cn";

const EDITORIAL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3AaaorIWFIbo5laE3ABRif9l7zkxPwky9FHOIYFZ4CihieJlbFKBsZl3xUOXMAt8FMLX-Qjm7f3wSpDywCC9yLZjRzgvsBdpSmpBFNZf1sNosyelr6cxMLJiEH1CKGPjHqV2BuEwrfINd7dNW1FhJuoLRlwk3Vov5YB4AJ71o_Sq-IRmDDBWEYd-26OE41RKWb9plg_lYVGKYWlj0R6rk0-B_jhm2n3x3HhS-T1cVrMvkVXy2ihP44gAmhhdLuVRQAArOgGzRNA";

interface DesignerOnboardingEditorialProps {
  step: number;
  totalSteps: number;
}

export function DesignerOnboardingEditorial({ step, totalSteps }: DesignerOnboardingEditorialProps) {
  return (
    <aside className="fixed top-0 right-0 hidden h-screen w-[30%] border-l border-[#d3c3ba]/10 bg-surface/30 p-16 pt-32 xl:block">
      <div className="space-y-8">
        <div className="aspect-[3/4] rotate-2 overflow-hidden rounded-xl shadow-2xl transition-transform duration-700 hover:rotate-0">
          <Image
            src={EDITORIAL_IMAGE}
            alt="Haute couture studio with dress form and soft afternoon light"
            width={400}
            height={533}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-4">
          <h4 className="font-headline text-2xl font-semibold italic text-primary">
            &ldquo;Design is the silent ambassador of your brand.&rdquo;
          </h4>
          <p className="text-base leading-relaxed text-ink-muted">
            FeyseFit provides the platform; you provide the vision. As you complete your
            onboarding, consider how every detail—from your brand ethos to your hero image—contributes
            to your story within our digital atelier.
          </p>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full",
                  index === step ? "bg-accent" : "bg-[#d3c3ba]"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
