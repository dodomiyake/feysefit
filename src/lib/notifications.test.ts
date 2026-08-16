import assert from "node:assert/strict";
import test from "node:test";
import type {
  MarketplaceEnquiry,
  MarketplaceEnquiryMessage,
} from "./marketplace-enquiries";
import { buildMarketplaceEnquiryNotifications } from "./notifications";

function enquiry(patch: Partial<MarketplaceEnquiry> = {}): MarketplaceEnquiry {
  return {
    id: "enquiry-1",
    designerId: "designer-1",
    customerId: "customer-1",
    designerName: "Atelier A",
    customerName: "Client A",
    outfitType: "Agbada",
    description: "A hand-finished outfit for a family celebration.",
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
    body: "Here is the latest enquiry reply.",
    createdAt: "2026-08-16T01:00:00.000Z",
  };
}

test("a pending enquiry creates an actionable designer notification", () => {
  const items = buildMarketplaceEnquiryNotifications([enquiry()], {}, "designer");
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "New enquiry from Client A");
  assert.equal(items[0]?.href, "/enquiries?enquiry=enquiry-1");
});

test("only the recipient receives the latest enquiry reply notification", () => {
  const messages = { "enquiry-1": [message("customer")] };
  const designerItems = buildMarketplaceEnquiryNotifications(
    [enquiry({ status: "discussing" })],
    messages,
    "designer"
  );
  const customerItems = buildMarketplaceEnquiryNotifications(
    [enquiry({ status: "discussing" })],
    messages,
    "customer"
  );
  assert.equal(designerItems.some((item) => item.id === "enquiry-message-message-customer"), true);
  assert.equal(customerItems.some((item) => item.id === "enquiry-message-message-customer"), false);
});

test("client agreement and unlinking produce distinct live states", () => {
  const ready = buildMarketplaceEnquiryNotifications(
    [
      enquiry({
        status: "discussing",
        customerAgreedAt: "2026-08-16T02:00:00.000Z",
      }),
    ],
    {},
    "designer"
  );
  assert.equal(ready.some((item) => item.title === "Client A is ready to proceed"), true);

  const archived = buildMarketplaceEnquiryNotifications(
    [enquiry({ status: "unlinked", updatedAt: "2026-08-16T03:00:00.000Z" })],
    {},
    "customer"
  );
  assert.equal(archived[0]?.title, "Designer link ended");
});
