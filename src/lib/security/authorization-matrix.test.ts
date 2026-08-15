import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRIVATE_DESIGNER_PROFILE_COLUMNS,
  PUBLIC_DESIGNER_PROFILE_SELECT,
} from "@/lib/services/designerService";
import { PUBLIC_DESIGNER_PROFILE_COLUMNS } from "@/lib/supabase/mappers";

describe("authorization matrix (application contracts)", () => {
  it("public marketplace select list never includes private columns", () => {
    for (const column of PRIVATE_DESIGNER_PROFILE_COLUMNS) {
      assert.equal(PUBLIC_DESIGNER_PROFILE_COLUMNS.includes(column as never), false);
      assert.equal(PUBLIC_DESIGNER_PROFILE_SELECT.includes(column), false);
    }
  });

  it("documents the intended REST/RPC matrix", () => {
    const matrix = {
      anon: {
        marketplace_designers: "select public columns",
        designer_profiles_phone: "denied",
        designer_profiles_user_id: "denied",
        designer_private_details: "denied",
        approve_customer_unlink: "denied",
        testimonial_view_writes: "denied",
      },
      customer: {
        designer_phone: "denied unless not applicable",
        other_customer_measurements: "denied",
        marketplace_approvals: "denied",
      },
      designer_owner: {
        own_phone: "select/update designer_private_details",
        other_designer_phone: "denied",
      },
      admin_aal1: {
        sensitive_mutations: "denied",
      },
      admin_aal2: {
        sensitive_mutations: "allowed via admin RPCs and AAL2 RLS",
      },
    };
    assert.equal(matrix.anon.designer_profiles_phone, "denied");
    assert.equal(matrix.admin_aal1.sensitive_mutations, "denied");
  });
});
