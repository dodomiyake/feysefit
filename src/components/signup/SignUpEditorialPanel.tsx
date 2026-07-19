import Image from "next/image";
import { BrandLogo } from "@/components/ui/BrandLogo";

const SIGNUP_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCz_mNQG5L58LG9bNRCnHsfDDWY7OZh2u8snrKaSDNe8iqWc07AnyvYgm4T-DUpuMAUrN1TNUHxzP32nm4WPdvN2H_CdkLJNAIMsFJ__8QrvLEmq9FY0Q7qqHPbEPQeq4Xd2Sfs3UFlpROPM5CoXYrxu0_M_KTpw2RPzpvrhM00Bmw5iW6_wJNhHR6gB_Ov317lfkVwdm_V0O1KOS7QZ-7EwkMIRQ1lf4pcHQYWysaSyw_pB_Jyo7f92HA-0zfrl4UCrq3ZNd0F1w";

export function SignUpEditorialPanel() {
  return (
    <div className="relative hidden shrink-0 overflow-hidden bg-surface-container lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-1/2">
      <div className="absolute inset-0 z-0 scale-105">
        <Image
          src={SIGNUP_HERO_IMAGE}
          alt="Luxury garment draped on a minimalist mannequin in warm editorial light"
          fill
          className="object-cover object-center transition-transform duration-[10s] ease-linear hover:scale-110"
          priority
          sizes="50vw"
        />
      </div>
      <div className="relative z-10 flex h-full w-full flex-col justify-between bg-black/10 p-16 backdrop-blur-[2px]">
        <div>
          <BrandLogo onDark className="text-4xl font-extrabold tracking-tight lg:text-5xl" />
          <p className="mt-3 max-w-xs text-sm font-normal italic leading-relaxed text-white/75">
            The future of fashion craftsmanship.
          </p>
        </div>
        <div className="max-w-md space-y-4">
          <div className="h-px w-24 bg-white/40" />
          <p className="text-lg font-light leading-7 text-white">
            Join an exclusive community of visionaries and connoisseurs. Experience bespoke
            digital tailoring and global fashion connectivity.
          </p>
        </div>
      </div>
    </div>
  );
}
