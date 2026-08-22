"use client";

import Link from "next/link";
import { useRef } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function LandingHeader() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
  }

  return (
    <header className="site-header">
      <Link className="brand" href="#top" aria-label="FeyseFit home" onClick={closeMenu}>
        <BrandLogo className="text-[1.65rem]" />
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/marketplace">Find a Designer</Link>
        <Link href="#how">How It Works</Link>
        <Link href="#for-designers">For Designers</Link>
      </nav>
      <div className="account-actions">
        <Link href="/login">Sign In</Link>
        <Link className="button button-small" href="/account/client">
          Create Account
        </Link>
      </div>
      <details ref={menuRef} className="mobile-menu">
        <summary aria-label="Open navigation">
          <span></span>
          <span></span>
          <span></span>
        </summary>
        <nav aria-label="Mobile navigation">
          <Link href="/marketplace" onClick={closeMenu}>
            Find a Designer
          </Link>
          <Link href="#how" onClick={closeMenu}>
            How It Works
          </Link>
          <Link href="#for-designers" onClick={closeMenu}>
            Become a Designer
          </Link>
          <Link href="/login" onClick={closeMenu}>
            Sign In
          </Link>
          <Link className="button" href="/account/client" onClick={closeMenu}>
            Create Account
          </Link>
        </nav>
      </details>
    </header>
  );
}
