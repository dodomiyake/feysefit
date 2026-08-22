import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  splitGeneratedDesignerBio,
  structuredDesignerStoryFields,
} from "./designer-profile-fields";

describe("splitGeneratedDesignerBio", () => {
  it("keeps biography text and extracts the generated suffix", () => {
    const raw = [
      "Precision is a love language.",
      "Bespoke bridal for diaspora weddings.",
      "Contact: +234 803 555 0100",
      "Service areas: Local fittings, Nationwide delivery",
    ].join("\n\n");

    assert.deepEqual(splitGeneratedDesignerBio(raw), {
      bio: "Precision is a love language.\n\nBespoke bridal for diaspora weddings.",
      phone: "+234 803 555 0100",
      serviceAreas: ["Local fittings", "Nationwide delivery"],
    });
  });

  it("does not delete in-body Contact or Service areas wording", () => {
    const bio =
      "Contact: we meet in studio for fittings.\n\nService areas are discussed after the first consult.";
    assert.deepEqual(splitGeneratedDesignerBio(bio), {
      bio,
      phone: "",
      serviceAreas: [],
    });
  });

  it("leaves unknown trailing service-area copy in the biography", () => {
    const bio = "Hand-finished hems.\n\nService areas: we ship worldwide on request";
    assert.deepEqual(splitGeneratedDesignerBio(bio), {
      bio,
      phone: "",
      serviceAreas: [],
    });
  });
});

describe("structuredDesignerStoryFields", () => {
  it("stores bio, phone, and service areas separately", () => {
    const fields = structuredDesignerStoryFields({
      tagline: "Precision is a love language.",
      bio: "Bespoke bridal for diaspora weddings.",
      phone: "+234 803 555 0100",
      serviceAreas: ["Local fittings", "Nationwide delivery"],
    });

    assert.equal(fields.bio, "Bespoke bridal for diaspora weddings.");
    assert.equal(fields.phone, "+234 803 555 0100");
    assert.deepEqual(fields.serviceAreas, ["Local fittings", "Nationwide delivery"]);
    assert.equal(fields.tagline, "Precision is a love language.");
    assert.equal(fields.bio.includes("Contact:"), false);
    assert.equal(fields.bio.includes("Service areas:"), false);
  });
});
