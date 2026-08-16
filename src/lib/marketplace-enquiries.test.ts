import assert from "node:assert/strict";
import test from "node:test";
import {
  displayMarketplaceEnquiryStatus,
  marketplaceEnquiryCanBeAnswered,
  marketplaceEnquiryCanBeDiscussed,
  marketplaceEnquiryCanBeLinked,
  marketplaceEnquiryCanBeCancelled,
  marketplaceEnquiryCanConfirmCustomerAgreement,
  type MarketplaceEnquiry,
  type MarketplaceEnquiryMessage,
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
    customerAgreedAt: null,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    ...patch,
  };
}

function message(senderRole: "customer" | "designer"): MarketplaceEnquiryMessage {
  return {
    id: `message-${senderRole}`,
    enquiryId: "enquiry-1",
    senderRole,
    senderName: senderRole === "designer" ? "Atelier A" : "Client A",
    body: "A discussion message.",
    createdAt: "2026-08-16T01:00:00.000Z",
  };
}

test("a live pending enquiry can be answered or cancelled", () => {
  const item = enquiry();
  assert.equal(displayMarketplaceEnquiryStatus(item), "pending");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), true);
  assert.equal(marketplaceEnquiryCanBeDiscussed(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), true);
});

test("an expired pending enquiry cannot be answered or cancelled", () => {
  const item = enquiry({ expiresAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "expired");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), false);
});

test("an accepted-for-discussion enquiry allows replies without linking", () => {
  const item = enquiry({ status: "discussing" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "discussing");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeDiscussed(item), true);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), true);
  assert.equal(marketplaceEnquiryCanBeLinked(item), false);
});

test("accepted enquiries are immutable and may point to one project", () => {
  const item = enquiry({ status: "accepted", projectId: "project-1" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "accepted");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), false);
  assert.equal(item.projectId, "project-1");
});

test("an unlinked enquiry remains archived and cannot restart collaboration", () => {
  const item = enquiry({ status: "unlinked", projectId: "project-1" });
  assert.equal(displayMarketplaceEnquiryStatus(item), "unlinked");
  assert.equal(marketplaceEnquiryCanBeAnswered(item), false);
  assert.equal(marketplaceEnquiryCanBeDiscussed(item), false);
  assert.equal(marketplaceEnquiryCanBeCancelled(item), false);
  assert.equal(marketplaceEnquiryCanBeLinked(item), false);
});

test("a client cannot confirm before the designer replies", () => {
  const item = enquiry({ status: "discussing" });
  assert.equal(marketplaceEnquiryCanConfirmCustomerAgreement(item, []), false);
  assert.equal(
    marketplaceEnquiryCanConfirmCustomerAgreement(item, [message("customer")]),
    false
  );
  assert.equal(
    marketplaceEnquiryCanConfirmCustomerAgreement(item, [message("designer")]),
    true
  );
});

test("only a live client-confirmed enquiry is ready for final linking", () => {
  assert.equal(marketplaceEnquiryCanBeLinked(enquiry()), false);
  assert.equal(
    marketplaceEnquiryCanBeLinked(
      enquiry({
        status: "discussing",
        customerAgreedAt: "2026-08-16T02:00:00.000Z",
      })
    ),
    true
  );
  assert.equal(
    marketplaceEnquiryCanBeLinked(
      enquiry({
        status: "accepted",
        customerAgreedAt: "2026-08-16T02:00:00.000Z",
      })
    ),
    false
  );
});
