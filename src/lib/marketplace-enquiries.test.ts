import assert from "node:assert/strict";
import test from "node:test";
import {
  displayMarketplaceEnquiryStatus,
  marketplaceEnquiryCanBeAnswered,
  marketplaceEnquiryCanBeCancelled,
  type MarketplaceEnquiry,
} from "./marketplace-enquiries";

function enquiry(
  patch: Partial<MarketplaceEnquiry> = {}
): MarketplaceEnquiry {
  return {
    id: "enquiry-1",
    designerId: "designer-1",
    customerId: "customer-1",
    designerName: "Atelier A",
    customerName: "Client A",
    outfitType: "Agbada",
    description: "A hand-finished agbada for a family celebration.",
    budget: "£800",
    preferredDeadline: null,
    consultationPreference: "video",
    status: "pending",
    designerResponse: null,
    projectId: null,
    expiresAt: "2999-01-01T00:00:00.000Z",
    acceptedAt: null,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    ...patch,
  };
}

test("a live pending enquiry can be answered or cancelled", () => {
  const item = enquiry();
  assert.equal(displayMarketplaceEnquiryStatus(item), "pending");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), true);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), true);
});

test("an expired pending enquiry cannot be answered or cancelled", () => {
  const item = enquiry({ expiresAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "expired");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), false);
});

test("accepted enquiries are immutable and may point to one project", () => {
  const item = enquiry({ status: "accepted", projectId: "project-1" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "accepted");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), false);
  assert.equal(item.projectId, "project-1");
});
