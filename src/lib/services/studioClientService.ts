import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import type { PreferredFit } from "@/lib/measurement-sections";
import type { StudioClient } from "@/lib/studio-client";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import type { DbStudioClient } from "@/lib/types/database";

const STORAGE_KEY = "feysefit_studio_clients";

function mapRow(row: DbStudioClient): StudioClient {
  const values =
    row.measurement_values && typeof row.measurement_values === "object"
      ? (row.measurement_values as Record<string, string>)
      : {};

  return {
    id: row.legacy_id ?? row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    location: row.location,
    notes: row.notes,
    unit: row.unit === "cm" ? "cm" : "inches",
    preferredFit: (row.preferred_fit as PreferredFit) ?? "regular",
    measurementValues: values,
    measurementRecordedBy:
      (row.measurement_recorded_by as StudioClient["measurementRecordedBy"]) ?? "designer",
    referenceImages: Array.isArray(row.reference_images)
      ? (row.reference_images as string[])
      : [],
    lastFittingAt: row.last_fitting_at ?? undefined,
    measurementUpdatedAt: row.measurement_updated_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readLocalStudioClients(designerLegacyId: string): StudioClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, StudioClient[]>;
    return parsed[designerLegacyId] ?? [];
  } catch {
    return [];
  }
}

function writeLocalStudioClients(designerLegacyId: string, clients: StudioClient[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, StudioClient[]>) : {};
    parsed[designerLegacyId] = clients;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota errors
  }
}

async function resolveDesignerId(designerLegacyId: string) {
  if (!isSupabaseEnabled()) return designerLegacyId;
  const profileId = await resolveDesignerProfileId(designerLegacyId);
  if (!profileId) throw new Error("Designer profile not found");
  return profileId;
}

export async function listStudioClients(designerLegacyId: string): Promise<StudioClient[]> {
  if (!designerLegacyId) return [];

  if (!isSupabaseEnabled()) {
    return readLocalStudioClients(designerLegacyId);
  }

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("studio_clients")
    .select("*")
    .eq("designer_id", designerId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function listAllStudioClientsForAdmin(): Promise<StudioClient[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = createClient();
  const [{ data: clients, error: clientsError }, { data: designers, error: designersError }] =
    await Promise.all([
      supabase.from("studio_clients").select("*").order("updated_at", { ascending: false }),
      supabase.from("designer_profiles").select("id, legacy_id, business_name"),
    ]);
  if (clientsError) throw new Error(clientsError.message);
  if (designersError) throw new Error(designersError.message);

  const designerByProfileId = new Map(
    (designers ?? []).map((row) => [row.id, row])
  );

  return (clients ?? []).map((row) => {
    const designer = designerByProfileId.get(row.designer_id);
    const designerKey = designer?.legacy_id ?? row.designer_id;

    return {
      ...mapRow(row),
      designerProfileId: row.designer_id,
      designerLegacyId: designerKey,
      designerName: designer?.business_name,
    };
  });
}

export async function getStudioClientById(
  designerLegacyId: string,
  clientId: string
): Promise<StudioClient | null> {
  const clients = await listStudioClients(designerLegacyId);
  return clients.find((client) => client.id === clientId) ?? null;
}

export async function createStudioClient(
  designerLegacyId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    location?: string;
    notes?: string;
  }
): Promise<StudioClient> {
  const name = input.name.trim();
  if (!name) throw new Error("Client name is required");

  const legacyId = `sc-${Date.now().toString(36)}`;

  if (!isSupabaseEnabled()) {
    const client: StudioClient = {
      id: legacyId,
      name,
      phone: input.phone?.trim() ?? "",
      email: input.email?.trim() ?? "",
      location: input.location?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      unit: "inches",
      preferredFit: "regular",
      measurementValues: {},
      measurementRecordedBy: "designer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = readLocalStudioClients(designerLegacyId);
    writeLocalStudioClients(designerLegacyId, [client, ...current]);
    return client;
  }

  const designerId = await resolveDesignerId(designerLegacyId);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("studio_clients")
    .insert({
      legacy_id: legacyId,
      designer_id: designerId,
      name,
      phone: input.phone?.trim() ?? "",
      email: input.email?.trim() ?? "",
      location: input.location?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateStudioClientProfile(
  designerLegacyId: string,
  clientId: string,
  patch: {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    notes?: string;
    lastFittingAt?: string;
  }
): Promise<StudioClient> {
  if (!isSupabaseEnabled()) {
    const current = readLocalStudioClients(designerLegacyId);
    const index = current.findIndex((client) => client.id === clientId);
    if (index < 0) throw new Error("Studio client not found");
    const next = {
      ...current[index],
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
      ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
      ...(patch.lastFittingAt !== undefined ? { lastFittingAt: patch.lastFittingAt } : {}),
      updatedAt: new Date().toISOString(),
    };
    current[index] = next;
    writeLocalStudioClients(designerLegacyId, current);
    return next;
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("studio_clients")
    .select("id")
    .or(legacyOrIdFilter(clientId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Studio client not found");

  const { data, error } = await supabase
    .from("studio_clients")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
      ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
      ...(patch.lastFittingAt !== undefined ? { last_fitting_at: patch.lastFittingAt } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function saveStudioClientMeasurements(
  designerLegacyId: string,
  clientId: string,
  patch: {
    unit: "inches" | "cm";
    preferredFit: PreferredFit;
    measurementValues: Record<string, string>;
    measurementRecordedBy?: StudioClient["measurementRecordedBy"];
    lastFittingAt?: string;
  }
): Promise<StudioClient> {
  const now = new Date().toISOString();

  if (!isSupabaseEnabled()) {
    const current = readLocalStudioClients(designerLegacyId);
    const index = current.findIndex((client) => client.id === clientId);
    if (index < 0) throw new Error("Studio client not found");
    const next = {
      ...current[index],
      unit: patch.unit,
      preferredFit: patch.preferredFit,
      measurementValues: patch.measurementValues,
      measurementRecordedBy: patch.measurementRecordedBy ?? "designer",
      ...(patch.lastFittingAt !== undefined ? { lastFittingAt: patch.lastFittingAt } : {}),
      measurementUpdatedAt: now,
      updatedAt: now,
    };
    current[index] = next;
    writeLocalStudioClients(designerLegacyId, current);
    return next;
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("studio_clients")
    .select("id")
    .or(legacyOrIdFilter(clientId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Studio client not found");

  const { data, error } = await supabase
    .from("studio_clients")
    .update({
      unit: patch.unit,
      preferred_fit: patch.preferredFit,
      measurement_values: patch.measurementValues,
      measurement_recorded_by: patch.measurementRecordedBy ?? "designer",
      ...(patch.lastFittingAt !== undefined ? { last_fitting_at: patch.lastFittingAt } : {}),
      measurement_updated_at: now,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteStudioClient(designerLegacyId: string, clientId: string) {
  if (!isSupabaseEnabled()) {
    const current = readLocalStudioClients(designerLegacyId).filter((client) => client.id !== clientId);
    writeLocalStudioClients(designerLegacyId, current);
    return;
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("studio_clients")
    .select("id")
    .or(legacyOrIdFilter(clientId))
    .maybeSingle();
  if (!existing) throw new Error("Studio client not found");

  const { error } = await supabase.from("studio_clients").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);
}

export async function updateStudioClientReferences(
  designerLegacyId: string,
  clientId: string,
  referenceImages: string[]
): Promise<StudioClient> {
  if (!isSupabaseEnabled()) {
    const current = readLocalStudioClients(designerLegacyId);
    const index = current.findIndex((client) => client.id === clientId);
    if (index < 0) throw new Error("Studio client not found");
    current[index] = { ...current[index], referenceImages, updatedAt: new Date().toISOString() };
    writeLocalStudioClients(designerLegacyId, current);
    return current[index];
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("studio_clients")
    .select("id")
    .or(legacyOrIdFilter(clientId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Studio client not found");

  const { data, error } = await supabase
    .from("studio_clients")
    .update({
      reference_images: referenceImages,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}
