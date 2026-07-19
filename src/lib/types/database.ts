export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "designer" | "customer" | "admin";
          account_status: "active" | "suspended" | "banned";
          profile_image: string;
          password_changed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          email: string;
          name: string;
          role: "designer" | "customer" | "admin";
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      account_activity: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          ip_hint: string | null;
          device_hint: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["account_activity"]["Row"]> & {
          user_id: string;
          event_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["account_activity"]["Row"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          measurement_unit: string;
          email_digests: boolean;
          push_alerts: boolean;
          profile_visibility: string;
          two_factor_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_preferences"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Row"]>;
        Relationships: [];
      };
      designer_profiles: {
        Row: {
          id: string;
          user_id: string;
          legacy_id: string | null;
          business_name: string;
          designer_name: string;
          location: string;
          specialty: string;
          bio: string;
          rating: number;
          review_count: number;
          cover_image: string;
          profile_image: string;
          marketplace_live: boolean;
          admin_notes: string | null;
          city: string;
          country: string;
          offers_in_person: boolean;
          price_range_min: number | null;
          price_range_max: number | null;
          years_experience: number | null;
          appointment_slot_minutes: number;
          offered_meeting_modes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["designer_profiles"]["Row"]> & {
          user_id: string;
          business_name: string;
          designer_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["designer_profiles"]["Row"]>;
        Relationships: [];
      };
      designer_availability_dates: {
        Row: {
          id: string;
          designer_id: string;
          available_date: string;
          start_time: string;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["designer_availability_dates"]["Row"]> & {
          designer_id: string;
          available_date: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["designer_availability_dates"]["Row"]>;
        Relationships: [];
      };
      designer_availability_windows: {
        Row: {
          id: string;
          designer_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["designer_availability_windows"]["Row"]> & {
          designer_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["designer_availability_windows"]["Row"]>;
        Relationships: [];
      };
      customer_profiles: {
        Row: {
          id: string;
          user_id: string | null;
          legacy_id: string | null;
          name: string;
          location: string;
          phone: string;
          email: string;
          project_count: number;
          registration_type: "invited" | "direct" | null;
          has_concluded_project: boolean;
          unlink_status: string;
          unlink_reason: string | null;
          unlink_submitted_at: string | null;
          active_unlink_request_id: string | null;
          profile_image: string;
          admin_notes: string | null;
          style_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customer_profiles"]["Row"]> & {
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_profiles"]["Row"]>;
        Relationships: [];
      };
      designer_customer_relationships: {
        Row: {
          id: string;
          designer_id: string;
          customer_id: string;
          registration_type: "invited" | "direct";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          designer_id: string;
          customer_id: string;
          registration_type?: "invited" | "direct";
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["designer_customer_relationships"]["Row"]>;
        Relationships: [];
      };
      invite_codes: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          code: string;
          name: string;
          email: string;
          project_type: string;
          sent_at: string;
          sent_ago: string;
          status: "pending" | "accepted" | "expired";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invite_codes"]["Row"]> & {
          designer_id: string;
          code: string;
          name: string;
          email: string;
          project_type: string;
          sent_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["invite_codes"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          legacy_id: string | null;
          project_code: string;
          palette_id: string;
          title: string;
          customer_name: string;
          customer_id: string | null;
          designer_id: string;
          outfit_type: string;
          deadline: string;
          budget: string;
          status: string;
          reference_images: Json;
          customer_update: string;
          designer_update: string;
          internal_notes: string;
          description: string;
          measurements: Json | null;
          gallery_images: Json | null;
          primary_fabric: string | null;
          secondary_material: string | null;
          lining: string | null;
          designer_fabric_advice: string;
          started_date: string | null;
          estimated_delivery: string | null;
          measurement_fit_note: string | null;
          team_members: Json | null;
          last_updated: string | null;
          studio_client_id: string | null;
          group_project_id: string | null;
          delivery_method: string | null;
          local_delivery_status: string | null;
          first_fitting_at: string | null;
          second_fitting_at: string | null;
          final_fitting_at: string | null;
          fitting_notes: string;
          adjustment_notes: string;
          total_price: number | null;
          deposit_paid: number | null;
          payment_method: string;
          payment_notes: string;
          measurement_recorded_by: string | null;
          testimonial_requested_at: string | null;
          delivered_at: string | null;
          completed_at: string | null;
          delivery_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          project_code: string;
          title: string;
          customer_name: string;
          designer_id: string;
          outfit_type: string;
          deadline: string;
          budget: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      customer_references: {
        Row: {
          id: string;
          legacy_id: string | null;
          project_id: string;
          url: string;
          category: string;
          caption: string | null;
          uploaded_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customer_references"]["Row"]> & {
          project_id: string;
          url: string;
          category: string;
          uploaded_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_references"]["Row"]>;
        Relationships: [];
      };
      measurements: {
        Row: {
          id: string;
          customer_id: string;
          project_id: string | null;
          unit: string;
          preferred_fit: string;
          status: "draft" | "submitted";
          values: Json;
          recorded_by: string;
          updated_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["measurements"]["Row"]> & {
          customer_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurements"]["Row"]>;
        Relationships: [];
      };
      studio_clients: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          name: string;
          phone: string;
          email: string;
          location: string;
          notes: string;
          unit: string;
          preferred_fit: string;
          measurement_values: Json;
          measurement_recorded_by: string;
          reference_images: Json;
          last_fitting_at: string | null;
          measurement_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["studio_clients"]["Row"]> & {
          designer_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["studio_clients"]["Row"]>;
        Relationships: [];
      };
      studio_appointments: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          studio_client_id: string | null;
          customer_id: string | null;
          project_id: string | null;
          appointment_type: string;
          meeting_mode: string;
          status: string;
          scheduled_at: string | null;
          duration_minutes: number;
          location_notes: string;
          customer_notes: string;
          designer_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["studio_appointments"]["Row"]> & {
          designer_id: string;
          appointment_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["studio_appointments"]["Row"]>;
        Relationships: [];
      };
      group_projects: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          title: string;
          event_type: string;
          event_date: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_projects"]["Row"]> & {
          designer_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_projects"]["Row"]>;
        Relationships: [];
      };
      group_project_members: {
        Row: {
          id: string;
          legacy_id: string | null;
          group_project_id: string;
          studio_client_id: string | null;
          customer_id: string | null;
          member_name: string;
          outfit_status: string;
          unit: string;
          preferred_fit: string;
          measurement_values: Json;
          measurement_recorded_by: string;
          total_price: number | null;
          deposit_paid: number | null;
          payment_method: string;
          payment_notes: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_project_members"]["Row"]> & {
          group_project_id: string;
          member_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_project_members"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          legacy_id: string | null;
          project_id: string;
          sender_user_id: string | null;
          sender_role: string;
          sender_name: string;
          text: string;
          timestamp_label: string;
          attachments: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          project_id: string;
          sender_role: string;
          sender_name: string;
          text: string;
          timestamp_label: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      marketplace_listings: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          designer_name: string;
          business_name: string;
          specialty: string;
          submitted_at: string;
          status: "pending" | "approved" | "declined";
          admin_notes: string | null;
          decline_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["marketplace_listings"]["Row"]> & {
          designer_id: string;
          designer_name: string;
          business_name: string;
          specialty: string;
          submitted_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_listings"]["Row"]>;
        Relationships: [];
      };
      portfolio_images: {
        Row: {
          id: string;
          designer_id: string;
          url: string;
          sort_order: number;
          is_public: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["portfolio_images"]["Row"]> & {
          designer_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["portfolio_images"]["Row"]>;
        Relationships: [];
      };
      unlink_requests: {
        Row: {
          id: string;
          legacy_id: string | null;
          customer_id: string;
          customer_name: string;
          designer_id: string;
          designer_name: string;
          reason: string;
          submitted_at: string;
          status: string;
          admin_notes: string | null;
          admin_contacted_at: string | null;
          designer_confirmation: string | null;
          designer_response: string | null;
          designer_responded_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["unlink_requests"]["Row"]> & {
          customer_id: string;
          customer_name: string;
          designer_id: string;
          designer_name: string;
          reason: string;
          submitted_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["unlink_requests"]["Row"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          legacy_id: string | null;
          reporter_id: string | null;
          reported_user_id: string | null;
          handle: string;
          reported_name: string | null;
          priority: string;
          reason: string;
          detail: string;
          status: "open" | "dismissed" | "resolved";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          handle: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          legacy_id: string | null;
          project_id: string;
          customer_id: string;
          designer_id: string;
          rating: number;
          body: string;
          outfit_type: string;
          photo_url: string;
          allow_public: boolean;
          show_name: boolean;
          show_location: boolean;
          display_name: string;
          display_location: string;
          private_feedback: string;
          status: "active" | "hidden_by_designer" | "removed_by_admin";
          request_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["testimonials"]["Row"]> & {
          project_id: string;
          customer_id: string;
          designer_id: string;
          rating: number;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["testimonials"]["Row"]>;
        Relationships: [];
      };
      testimonial_reports: {
        Row: {
          id: string;
          legacy_id: string | null;
          testimonial_id: string;
          reporter_id: string;
          reason: string;
          detail: string;
          status: "open" | "dismissed" | "resolved";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["testimonial_reports"]["Row"]> & {
          testimonial_id: string;
          reporter_id: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["testimonial_reports"]["Row"]>;
        Relationships: [];
      };
      project_delivery_issues: {
        Row: {
          id: string;
          legacy_id: string | null;
          project_id: string;
          customer_id: string;
          designer_id: string;
          issue_type: string;
          detail: string;
          status: "open" | "in_progress" | "resolved";
          designer_response: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["project_delivery_issues"]["Row"]> & {
          project_id: string;
          customer_id: string;
          designer_id: string;
          issue_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_delivery_issues"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      marketplace_testimonials: {
        Row: {
          id: string;
          legacy_id: string | null;
          designer_id: string;
          rating: number;
          body: string;
          outfit_type: string;
          photo_url: string | null;
          allow_public: boolean;
          show_name: boolean;
          show_location: boolean;
          display_name: string;
          display_location: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
      testimonials_for_participants: {
        Row: Database["public"]["Tables"]["testimonials"]["Row"];
        Relationships: [];
      };
    };
    Functions: {
      accept_customer_invite: {
        Args: { invite_code: string };
        Returns: undefined;
      };
      mark_customer_project_concluded: {
        Args: { p_customer_id: string };
        Returns: undefined;
      };
      apply_customer_measurement_submission: {
        Args: {
          measurement_values: Record<string, string>;
          customer_display_name?: string | null;
        };
        Returns: string;
      };
      apply_customer_project_designer_update: {
        Args: {
          designer_update_message: string;
          project_key?: string | null;
        };
        Returns: undefined;
      };
      confirm_customer_project_delivery: {
        Args: { project_key: string };
        Returns: string;
      };
      report_customer_delivery_issue: {
        Args: {
          project_key: string;
          issue_type: string;
          detail: string;
        };
        Returns: string;
      };
      get_designer_appointment_holds: {
        Args: { target_designer_id: string };
        Returns: {
          scheduled_at: string;
          duration_minutes: number;
          status: string;
        }[];
      };
      lookup_invite_code: {
        Args: { invite_code: string };
        Returns: Json;
      };
      update_customer_fabric_selection: {
        Args: {
          project_key: string;
          primary_fabric: string;
          secondary_material: string;
          lining: string;
        };
        Returns: undefined;
      };
      log_security_event: {
        Args: {
          p_event_type: string;
          p_email_hash?: string | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
          p_meta?: Json;
        };
        Returns: undefined;
      };
      log_account_activity: {
        Args: {
          p_event_type: string;
          p_email?: string | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
          p_meta?: Json;
        };
        Returns: undefined;
      };
      mark_password_changed: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DbUser = Database["public"]["Tables"]["users"]["Row"];
export type DbDesignerProfile = Database["public"]["Tables"]["designer_profiles"]["Row"];
export type DbCustomerProfile = Database["public"]["Tables"]["customer_profiles"]["Row"];
export type DbProject = Database["public"]["Tables"]["projects"]["Row"];
export type DbMessage = Database["public"]["Tables"]["messages"]["Row"];
export type DbMeasurement = Database["public"]["Tables"]["measurements"]["Row"];
export type DbInviteCode = Database["public"]["Tables"]["invite_codes"]["Row"];
export type DbMarketplaceListing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
export type DbUnlinkRequest = Database["public"]["Tables"]["unlink_requests"]["Row"];
export type DbCustomerReference = Database["public"]["Tables"]["customer_references"]["Row"];
export type DbStudioClient = Database["public"]["Tables"]["studio_clients"]["Row"];
export type DbStudioAppointment = Database["public"]["Tables"]["studio_appointments"]["Row"];
export type DbGroupProject = Database["public"]["Tables"]["group_projects"]["Row"];
export type DbGroupProjectMember = Database["public"]["Tables"]["group_project_members"]["Row"];

export interface AppAuthUser {
  id: string;
  email: string;
  name: string;
  role: "designer" | "customer" | "admin";
  accountStatus: "active" | "suspended" | "banned";
  profileImage?: string;
  designerProfileId?: string;
  designerLegacyId?: string;
  customerProfileId?: string;
  customerLegacyId?: string;
  emailConfirmed?: boolean;
}
