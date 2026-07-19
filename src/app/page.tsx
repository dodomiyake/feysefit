import Link from "next/link";
import Image from "next/image";
import { ArrowRight, User } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCNlTOWD2b2kBKhpG-xvmHbUFya1uO91CGg_xNcr3uE1-Oc9ce3hnRdc5CzFzZeGu4t6auRHCDOap7dzm9FaAPbaQ5qEIE1cz0JhvQUbYB_9sfx1zzYPd2zIqqLxR9lViXQamB1PLHUVaLf5w7EwyKqaX321Zy8VY2v2OJU4nzjCTVq_6q-qK_PF_SWH5OZx67L8Nj1S3jJpyo1tZEiNGiCKwpFKQz5dBZZkCjBPn8URUZOYHfEwB6RLOsNiOMtyzOD5_KF6N9cbA";

const ATELIER_MARKS = ["LUMEN", "KOTA", "AXEL"] as const;

export default function LandingPage() {
  return (
    <main className="flex min-h-screen w-full overflow-x-hidden lg:h-screen lg:overflow-hidden">
      {/* Left: editorial hero (desktop) */}
      <section className="hero-image-clip relative hidden overflow-hidden bg-surface lg:block lg:w-7/12">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-primary/10 to-transparent" />
        <div className="h-full w-full transition-transform duration-1000 ease-in-out hover:scale-105">
          <Image
            src={HERO_IMAGE}
            alt="Model in exquisite African bespoke tailored garment"
            fill
            className="object-cover object-center"
            priority
            sizes="58vw"
          />
        </div>
        <div className="landing-reveal landing-reveal-delay-3 absolute bottom-12 left-12 z-20">
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-white/60" />
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">
              Est. 2026
            </span>
          </div>
        </div>
      </section>

      {/* Right: content & actions */}
      <section className="relative flex w-full flex-col justify-center bg-background px-8 py-12 lg:w-5/12 lg:px-16 xl:px-24">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative mx-auto w-full max-w-md space-y-8 lg:mx-0">
          <div className="landing-reveal">
            <BrandLogo className="text-4xl font-extrabold tracking-tight lg:text-5xl" />
          </div>

          <div className="space-y-4">
            <h1 className="landing-reveal landing-reveal-delay-1 font-headline text-[2rem] font-semibold leading-10 text-primary">
              Remote fashion measurements made simple
            </h1>
            <p className="landing-reveal landing-reveal-delay-1 max-w-sm text-lg leading-7 text-ink-muted">
              Bridging the gap between bespoke designers and global clients through precision AI
              measuring technology.
            </p>
          </div>

          <div className="landing-reveal landing-reveal-delay-2 flex flex-col gap-4">
            <Link
              href="/signup?role=designer"
              className="group flex items-center justify-between rounded-full bg-primary px-8 py-5 text-lg font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <span>I&apos;m a Designer</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/signup?role=customer"
              className="group flex items-center justify-between rounded-full border border-ink-muted/30 px-8 py-5 text-lg font-semibold text-primary transition-all hover:bg-surface-container active:scale-[0.98]"
            >
              <span>I&apos;m a Client</span>
              <User className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="landing-reveal landing-reveal-delay-3 border-t border-[#d3c3ba] pt-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Trusted by luxury ateliers
            </p>
            <div className="flex items-center gap-8 opacity-40 grayscale transition-all duration-500 hover:grayscale-0">
              {ATELIER_MARKS.map((mark) => (
                <span key={mark} className="font-headline text-2xl font-bold text-primary">
                  {mark}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 hidden items-center gap-2 lg:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span className="text-xs font-semibold text-ink-muted">Precision AI V2.4 Active</span>
        </div>
      </section>
    </main>
  );
}
