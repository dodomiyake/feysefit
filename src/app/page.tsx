import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata: Metadata = {
  title: "FeyseFit — Your designer. Your perfect fit.",
  description:
    "Find trusted fashion designers, share accurate measurements, book appointments and follow your garment from consultation to delivery.",
};

const steps = [
  [
    "01",
    "Discover a designer",
    "Explore portfolios, specialities, location, ratings and consultation options.",
  ],
  [
    "02",
    "Consult or share measurements",
    "Meet in the studio, book a video call or follow a guided measurement process.",
  ],
  [
    "03",
    "Approve and follow production",
    "Keep references, quotations, messages and clear garment milestones together.",
  ],
  [
    "04",
    "Receive and review",
    "Arrange collection or delivery, confirm completion and share an honest review.",
  ],
] as const;

const designers = [
  {
    name: "Amara Okafor",
    studio: "Nkọ Studio",
    place: "London, UK",
    craft: "Bridal · Occasionwear",
    rating: "4.9",
    reviews: "38 reviews",
    consult: "Studio & video",
    avail: "Consultations this week",
    image: "/images/landing/craft.jpg",
  },
  {
    name: "Tomi Adeyemi",
    studio: "Aṣọ by Tomi",
    place: "Lagos, Nigeria",
    craft: "Contemporary agbada · Sets",
    rating: "4.8",
    reviews: "52 reviews",
    consult: "Video consultation",
    avail: "Taking May commissions",
    image: "/images/landing/remote.jpg",
  },
  {
    name: "Safiya Mensah",
    studio: "Safi Atelier",
    place: "Accra, Ghana",
    craft: "Kente tailoring · Dresses",
    rating: "5.0",
    reviews: "24 reviews",
    consult: "Studio & video",
    avail: "Next opening: 18 May",
    image: "/images/landing/hero.jpg",
  },
] as const;

const projectItems = [
  "Design references",
  "Appointments",
  "Quotations",
  "Payments",
  "Project messages",
  "Production milestones",
  "Delivery updates",
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingHeader />

      <section className="hero" id="top">
        <div className="hero-copy reveal">
          <p className="eyebrow">Made-to-measure, made manageable</p>
          <h1>
            Your designer.
            <br />
            Your perfect fit.
            <br />
            <em>Wherever you are.</em>
          </h1>
          <p className="hero-lede">
            Find trusted fashion designers, share accurate measurements, book appointments and
            follow your garment from consultation to delivery.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/marketplace">
              Find a Designer <Arrow />
            </Link>
            <Link className="text-link" href="/account/designer">
              Join as a Designer <Arrow />
            </Link>
          </div>
          <div className="trust-line">
            <span>✓ Reviewed portfolios</span>
            <span>✓ Clear project stages</span>
            <span>✓ Local &amp; international</span>
          </div>
        </div>
        <figure className="hero-media reveal delay">
          <Image
            src="/images/landing/hero.jpg"
            alt="A Black fashion designer carefully fitting a client in a warm, working atelier"
            fill
            priority
            loading="eager"
            sizes="(max-width: 1000px) 100vw, 54vw"
            className="object-cover object-[76%_center]"
          />
          <figcaption>
            <span>From first conversation</span>
            <span>to final fitting</span>
          </figcaption>
        </figure>
      </section>

      <section className="section steps-section" id="how">
        <div className="section-heading">
          <p className="eyebrow">A clearer way to commission clothing</p>
          <h2>How FeyseFit works</h2>
          <p>Four practical stages, with your designer and project details kept in one place.</p>
        </div>
        <div className="steps">
          {steps.map(([n, title, body]) => (
            <article className="step" key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section designers" id="designers">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Selected portfolios</p>
            <h2>Featured designers</h2>
          </div>
          <Link className="text-link" href="/marketplace">
            Explore all designers <Arrow />
          </Link>
        </div>
        <div className="designer-grid">
          {designers.map((designer) => (
            <article className="designer-card" key={designer.name}>
              <div className="card-image">
                <Image
                  src={designer.image}
                  alt={`Work and studio details from ${designer.studio}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  className="object-cover"
                />
                <span className="availability">{designer.avail}</span>
              </div>
              <div className="card-body">
                <div className="card-title">
                  <div>
                    <h3>{designer.name}</h3>
                    <p>
                      {designer.studio} · {designer.place}
                    </p>
                  </div>
                  <span className="rating">★ {designer.rating}</span>
                </div>
                <p className="craft">{designer.craft}</p>
                <div className="card-meta">
                  <span>{designer.consult}</span>
                  <span>{designer.reviews}</span>
                </div>
                <Link href="/marketplace" aria-label={`View ${designer.name}'s profile`}>
                  View profile <Arrow />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="demo-note">
          Designer profiles shown are illustrative examples for this early FeyseFit experience.
        </p>
      </section>

      <section className="feature section" id="measurements">
        <div className="feature-media">
          <Image
            src="/images/landing/remote.jpg"
            alt="A fashion designer reviewing guided customer measurements during a remote video consultation"
            fill
            sizes="(max-width: 1000px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="feature-copy">
          <p className="eyebrow">Designed for distance</p>
          <h2>Measurements you can review, save and share</h2>
          <p>
            Follow designer-approved guidance, check each entry before saving, and share your
            measurement profile only with the designer you choose.
          </p>
          <ul>
            <li>
              <span>01</span>Use clear, step-by-step measuring guidance
            </li>
            <li>
              <span>02</span>Review and update saved measurements
            </li>
            <li>
              <span>03</span>Choose which designer receives them
            </li>
          </ul>
          <aside>
            <strong>A note about fit</strong>
            <p>
              FeyseFit supports the measurement process, but cannot guarantee fit when measurements
              are taken or entered incorrectly. Your designer may request a video check or studio
              fitting.
            </p>
          </aside>
        </div>
      </section>

      <section className="project-section section">
        <div className="project-copy">
          <p className="eyebrow light">Less searching. More making.</p>
          <h2>One place for every project</h2>
          <p>
            Move beyond scattered DMs, screenshots and voice notes. Keep the decisions that matter
            attached to the right garment and the right designer.
          </p>
          <Link className="button button-cream" href="/account/client">
            Start your first project <Arrow />
          </Link>
        </div>
        <div className="project-board" aria-label="Items organised in a FeyseFit project">
          {projectItems.map((item, index) => (
            <div key={item}>
              <span>0{index + 1}</span>
              <strong>{item}</strong>
              <span className="check">✓</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section local">
        <div className="section-heading centered">
          <p className="eyebrow">Near or far</p>
          <h2>Choose the service that fits you</h2>
          <p>Some garments need a studio visit. Others can begin from your living room.</p>
        </div>
        <div className="service-grid">
          <article>
            <span className="service-icon">⌂</span>
            <p className="eyebrow">For local customers</p>
            <h3>Visit the studio</h3>
            <p>
              Book consultations, fittings and alterations. Choose collection or local delivery when
              your garment is ready.
            </p>
            <ul>
              <li>In-person measurement checks</li>
              <li>Scheduled fittings</li>
              <li>Alterations and collection</li>
            </ul>
            <Link className="text-link" href="/marketplace">
              Find designers near you <Arrow />
            </Link>
          </article>
          <article>
            <span className="service-icon">◎</span>
            <p className="eyebrow">For customers abroad</p>
            <h3>Work together remotely</h3>
            <p>
              Use video consultations and guided measurements when travel is not practical. Your
              designer will confirm whether the garment is suitable for remote service.
            </p>
            <ul>
              <li>Video consultations</li>
              <li>Guided measurements</li>
              <li>Tracked international delivery</li>
            </ul>
            <Link className="text-link" href="/marketplace">
              Find remote designers <Arrow />
            </Link>
          </article>
        </div>
      </section>

      <section className="designer-pitch" id="for-designers">
        <div className="pitch-image">
          <Image
            src="/images/landing/craft.jpg"
            alt="A designer cutting fabric by hand using chalk lines and brass tailoring scissors"
            fill
            sizes="(max-width: 1000px) 100vw, 48vw"
            className="object-cover"
          />
        </div>
        <div className="pitch-copy">
          <p className="eyebrow light">Built for fashion professionals</p>
          <h2>
            Let your work speak.
            <br />
            Let FeyseFit handle the details.
          </h2>
          <p>
            Create a professional profile, present your portfolio and turn qualified enquiries into
            organised projects—from consultation to delivery.
          </p>
          <div className="pitch-list">
            <span>Professional portfolio</span>
            <span>Customer enquiries</span>
            <span>Appointment scheduling</span>
            <span>Measurements &amp; orders</span>
          </div>
          <Link className="button button-cream" href="/account/designer">
            Join as a Designer <Arrow />
          </Link>
        </div>
      </section>

      <section className="relationship section">
        <div>
          <p className="eyebrow">A relationship worth protecting</p>
          <h2>Your project stays connected to the designer you chose</h2>
        </div>
        <div>
          <p>
            FeyseFit keeps enquiries, project conversations and order history tied to the selected
            designer’s workspace. That gives both sides a shared record of what was requested,
            agreed and delivered.
          </p>
          <p>
            We set clear expectations for respectful platform use. No system can prevent every
            off-platform action, but FeyseFit is designed to make direct, accountable collaboration
            the easiest path.
          </p>
        </div>
      </section>

      <section className="stories section">
        <div className="section-heading centered">
          <p className="eyebrow">Customer stories</p>
          <h2>Made together, miles apart</h2>
        </div>
        <div className="story-grid">
          <blockquote>
            <p>
              “I commissioned an agbada from Manchester for my brother’s wedding in Lagos. The
              measurement check caught an error before cutting, and I always knew what stage the
              outfit had reached.”
            </p>
            <footer>
              <strong>Daniel A.</strong>
              <span>Manchester → Lagos · Occasionwear</span>
            </footer>
          </blockquote>
          <blockquote>
            <p>
              “Being able to keep the sketch, quote and fitting notes together made my first custom
              dress feel straightforward. I booked two studio fittings and collected exactly when
              promised.”
            </p>
            <footer>
              <strong>Ruth K.</strong>
              <span>London · Custom dress</span>
            </footer>
          </blockquote>
          <blockquote>
            <p>
              “My designer in Accra explained which measurements to retake on video. The delivery
              updates meant I could plan ahead instead of chasing messages across three apps.”
            </p>
            <footer>
              <strong>Adwoa M.</strong>
              <span>Birmingham → Accra · Kente set</span>
            </footer>
          </blockquote>
        </div>
        <p className="demo-note">
          Stories are representative examples and will be replaced by verified customer reviews as
          FeyseFit grows.
        </p>
      </section>

      <section className="final-cta">
        <p className="eyebrow light">A better fit starts with a better conversation</p>
        <h2>Meet the designer for your next garment.</h2>
        <div>
          <Link className="button button-cream" href="/marketplace">
            Find a Designer <Arrow />
          </Link>
          <Link className="text-link light-link" href="/account/designer">
            Join as a Designer <Arrow />
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-top">
          <div>
            <Link className="brand footer-brand" href="#top">
              <BrandLogo onDark className="text-[1.65rem]" />
            </Link>
            <p>Thoughtful clothing begins with a clear, trusted relationship.</p>
          </div>
          <div className="footer-links">
            <div>
              <strong>Explore</strong>
              <Link href="/marketplace">Find a Designer</Link>
              <Link href="#how">How It Works</Link>
              <Link href="#for-designers">Become a Designer</Link>
            </div>
            <div>
              <strong>Account</strong>
              <Link href="/login">Sign In</Link>
              <Link href="/account/client">Create Account</Link>
              <a href="mailto:hello@feysefit.com">Email Support</a>
            </div>
            <div>
              <strong>Company</strong>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="mailto:hello@feysefit.com">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 FeyseFit</span>
          <span>Designed for makers and the people they dress.</span>
        </div>
      </footer>
    </div>
  );
}
