import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listPublicMarketplaceDesigners,
  PRIVATE_DESIGNER_PROFILE_COLUMNS,
  PUBLIC_DESIGNER_PROFILE_SELECT,
} from "./designerService";
import {
  mapDesigner,
  PUBLIC_DESIGNER_PROFILE_COLUMNS,
  type PublicDesignerProfile,
} from "@/lib/supabase/mappers";

function publicProfile(overrides: Partial<PublicDesignerProfile> = {}): PublicDesignerProfile {
  return {
    id: "designer-uuid",
    legacy_id: "1",
    business_name: "Adaeze Atelier",
    designer_name: "Adaeze Okonkwo",
    location: "Lagos, Nigeria",
    specialty: "Bridal & Aso-Ebi",
    bio: "Bespoke bridal.",
    rating: 4.9,
    review_count: 12,
    cover_image: "https://example.com/cover.jpg",
    profile_image: "https://example.com/profile.jpg",
    created_at: "2026-01-01T00:00:00.000Z",
    city: "Lagos",
    country: "Nigeria",
    offers_in_person: true,
    price_range_min: 500,
    price_range_max: 5000,
    years_experience: 8,
    appointment_slot_minutes: 30,
    offered_meeting_modes: ["in_person", "video"],
    tagline: "Precision is a love language.",
    service_areas: ["Local fittings"],
    ...overrides,
  };
}

type QueryCapture = {
  tables: string[];
  selects: string[];
  eqs: Array<[string, unknown]>;
  ins: Array<[string, unknown]>;
};

function createThenChain(result: { data: unknown; error: unknown }, capture: QueryCapture) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = (columns: string) => {
    capture.selects.push(columns);
    return chain;
  };
  chain.eq = (column: string, value: unknown) => {
    capture.eqs.push([column, value]);
    return chain;
  };
  chain.in = (column: string, value: unknown) => {
    capture.ins.push([column, value]);
    return chain;
  };
  chain.order = self;
  chain.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function createMockClient(
  profiles: PublicDesignerProfile[],
  images: Array<{ designer_id: string; url: string; sort_order: number }>,
  capture: QueryCapture
) {
  return {
    from(table: string) {
      capture.tables.push(table);
      const data = table === "designer_profiles" ? profiles : images;
      return createThenChain({ data, error: null }, capture);
    },
  };
}

describe("public marketplace designer fields", () => {
  it("never selects private designer columns", () => {
    for (const column of PRIVATE_DESIGNER_PROFILE_COLUMNS) {
      assert.equal(
        PUBLIC_DESIGNER_PROFILE_COLUMNS.includes(column as never),
        false,
        `${column} must stay off the public select list`
      );
      assert.equal(PUBLIC_DESIGNER_PROFILE_SELECT.includes(column), false);
    }
  });

  it("maps public rows without user_id or admin_notes", () => {
    const designer = mapDesigner(publicProfile(), ["https://example.com/portfolio.jpg"]);
    assert.equal(designer.id, "1");
    assert.equal(designer.businessName, "Adaeze Atelier");
    assert.deepEqual(designer.portfolioImages, ["https://example.com/portfolio.jpg"]);
    assert.equal("userId" in designer, false);
    assert.equal("adminNotes" in designer, false);
    assert.equal("phone" in designer, false);
    assert.deepEqual(designer.serviceAreas, ["Local fittings"]);
  });

  it("strips generated Contact and Service areas suffixes from public bios", () => {
    const designer = mapDesigner(
      publicProfile({
        bio: "Bespoke bridal.\n\nContact: +234 803 555 0100\n\nService areas: Local fittings, Nationwide delivery",
        service_areas: [],
      })
    );
    assert.equal(designer.bio, "Bespoke bridal.");
    assert.equal(designer.bio.includes("Contact:"), false);
    assert.deepEqual(designer.serviceAreas, ["Local fittings", "Nationwide delivery"]);
    assert.equal(designer.phone, undefined);
  });
});

describe("listPublicMarketplaceDesigners", () => {
  it("queries live profiles and public portfolio images through the anon client", async () => {
    const capture: QueryCapture = { tables: [], selects: [], eqs: [], ins: [] };
    const profile = publicProfile();
    const designers = await listPublicMarketplaceDesigners(
      createMockClient(
        [profile],
        [{ designer_id: profile.id, url: "https://example.com/public.jpg", sort_order: 0 }],
        capture
      ) as never
    );

    assert.deepEqual(capture.tables, ["designer_profiles", "portfolio_images"]);
    assert.equal(capture.selects[0], PUBLIC_DESIGNER_PROFILE_SELECT);
    assert.equal(capture.selects[0]?.includes("*"), false);
    assert.equal(capture.selects[0]?.includes("phone"), false);
    assert.equal(capture.selects[0]?.includes("service_areas"), true);
    assert.deepEqual(capture.eqs, [
      ["marketplace_live", true],
      ["is_public", true],
    ]);
    assert.deepEqual(capture.ins, [["designer_id", [profile.id]]]);
    assert.equal(designers.length, 1);
    assert.equal(designers[0]?.id, "1");
    assert.deepEqual(designers[0]?.portfolioImages, ["https://example.com/public.jpg"]);
  });

  it("returns an empty list when no live profiles are visible", async () => {
    const capture: QueryCapture = { tables: [], selects: [], eqs: [], ins: [] };
    const designers = await listPublicMarketplaceDesigners(
      createMockClient([], [], capture) as never
    );
    assert.deepEqual(designers, []);
    assert.deepEqual(capture.tables, ["designer_profiles"]);
  });
});
