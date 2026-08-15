"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsProfileCard } from "@/components/settings/SettingsProfileCard";
import { SettingsBespokeSpecsCard } from "@/components/settings/SettingsBespokeSpecsCard";
import { SettingsSecurityCard } from "@/components/settings/SettingsSecurityCard";
import { SettingsNotificationCards } from "@/components/settings/SettingsNotificationCards";
import { SettingsStudioMarketplaceCard } from "@/components/settings/SettingsStudioMarketplaceCard";
import { DesignerTestimonialsCard } from "@/components/designer/DesignerTestimonialsCard";
import { SettingsAvailabilityCard } from "@/components/settings/SettingsAvailabilityCard";
import { SettingsFooterActions } from "@/components/settings/SettingsFooterActions";
import { SettingsAdminTeamCard } from "@/components/settings/SettingsAdminTeamCard";
import { UnlinkRequestSection } from "@/components/customer/UnlinkRequestSection";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import {
  getSettingsBespokeSpecs,
  getSettingsProfile,
  type SettingsProfile,
} from "@/lib/settings-profile";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { updateCustomerProfile } from "@/lib/services/customerService";
import { updateDesignerProfile, getOwnDesignerContact } from "@/lib/services/designerService";
import { structuredDesignerStoryFields } from "@/lib/designer-profile-fields";
import { updateUserProfile } from "@/lib/services/authService";
import { resolveCurrentCustomer } from "@/lib/customer-display";
import {
  getUserPreferences,
  upsertUserPreferences,
  type UserPreferences,
} from "@/lib/services/preferenceService";
import { saveDesignerAvailability, getDesignerAvailability } from "@/lib/services/availabilityService";
import { toUserFacingSupabaseError } from "@/lib/supabase-errors";
import type { DesignerAvailabilitySettings } from "@/lib/local-customer";
import { saveMeasurementProfile } from "@/lib/services/measurementService";

interface SettingsDraft {
  profile: SettingsProfile;
  unit: "inches" | "cm";
  emailDigests: boolean;
  pushAlerts: boolean;
  twoFactorEnabled: boolean;
  profileVisibility: "connections" | "everyone";
  marketplaceVisible: boolean;
  studioCity: string;
  studioCountry: string;
  offersInPerson: boolean;
  priceRangeMin: string;
  priceRangeMax: string;
  bio: string;
  serviceAreas: string[];
  availability: DesignerAvailabilitySettings;
}

export function SettingsContent() {
  const {
    role,
    authUser,
    measurementUnit,
    setMeasurementUnit,
    marketplaceApprovals,
    isDesignerMarketplaceLive,
    setDesignerMarketplaceVisibility,
    showToast,
    getDesignerById,
    customers,
    refreshAppData,
  } = useApp();
  const { ensureReauth } = useReauth();
  const useSupabase = isSupabaseEnabled();

  const isDesigner = role === "designer";
  const isCustomer = role === "customer";
  const isAdmin = role === "admin";
  const designerId = authUser?.designerId;

  const isDesignerPending = Boolean(
    designerId &&
      marketplaceApprovals.some((a) => a.designerId === designerId && a.status === "pending")
  );
  const liveMarketplaceVisible =
    (designerId ? isDesignerMarketplaceLive(designerId) : false) || isDesignerPending;

  const savedProfile = useMemo(
    () =>
      getSettingsProfile(role, {
        authUser,
        designer: designerId ? getDesignerById(designerId) : null,
        customer: resolveCurrentCustomer(customers, authUser),
      }),
    [role, authUser, designerId, getDesignerById, customers]
  );
  const bespokeSpecs = useMemo(() => getSettingsBespokeSpecs(role), [role]);

  const profileSyncKey = useMemo(() => {
    const customer = resolveCurrentCustomer(customers, authUser);
    const designer = designerId ? getDesignerById(designerId) : null;
    return [
      authUser?.id ?? "",
      authUser?.profileImage ?? "",
      customer?.profileImage ?? "",
      designer?.profileImage ?? "",
      customer?.name ?? "",
      customer?.phone ?? "",
      designer?.designerName ?? "",
      designer?.yearsExperience != null ? String(designer.yearsExperience) : "",
      designer?.bio ?? "",
      (designer?.serviceAreas ?? []).join("|"),
      designer?.offersInPersonAppointments ? "1" : "0",
    ].join("|");
  }, [authUser, customers, designerId, getDesignerById]);

  const designer = designerId ? getDesignerById(designerId) : null;

  const [ownDesignerPhone, setOwnDesignerPhone] = useState("");

  const buildDraft = useCallback(
    (prefs?: UserPreferences, availability?: DesignerAvailabilitySettings): SettingsDraft => ({
      profile: {
        ...savedProfile,
        phone: isDesigner ? ownDesignerPhone || savedProfile.phone : savedProfile.phone,
      },
      unit: prefs?.measurementUnit ?? measurementUnit,
      emailDigests: prefs?.emailDigests ?? true,
      pushAlerts: prefs?.pushAlerts ?? true,
      twoFactorEnabled: prefs?.twoFactorEnabled ?? false,
      profileVisibility: prefs?.profileVisibility ?? "connections",
      marketplaceVisible: liveMarketplaceVisible,
      studioCity: designer?.city ?? designer?.location.split(",")[0]?.trim() ?? "",
      studioCountry: designer?.country ?? designer?.location.split(",").slice(-1)[0]?.trim() ?? "",
      offersInPerson: designer?.offersInPersonAppointments ?? false,
      priceRangeMin: designer?.priceRangeMin != null ? String(designer.priceRangeMin) : "",
      priceRangeMax: designer?.priceRangeMax != null ? String(designer.priceRangeMax) : "",
      bio: designer?.bio ?? "",
      serviceAreas: designer?.serviceAreas ?? [],
      availability: availability ?? {
        slotMinutes: designer?.appointmentSlotMinutes ?? 30,
        offeredMeetingModes: designer?.offeredMeetingModes ?? ["in_person", "video", "phone"],
        dates: [],
      },
    }),
    [savedProfile, measurementUnit, liveMarketplaceVisible, designer, isDesigner, ownDesignerPhone]
  );

  const [draft, setDraft] = useState<SettingsDraft>(() => buildDraft());
  const [savedSnapshot, setSavedSnapshot] = useState<SettingsDraft>(() => buildDraft());
  const [editingProfile, setEditingProfile] = useState(false);
  const profileSyncedKeyRef = useRef<string | null>(null);
  const loadedPreferencesRef = useRef<UserPreferences | null>(null);

  useEffect(() => {
    if (!authUser?.id) return;
    void getUserPreferences(authUser.id).then((prefs) => {
      loadedPreferencesRef.current = prefs;
      if (editingProfile) return;
      setDraft((current) => {
        const next = buildDraft(prefs, current.availability);
        if (current.profile.avatar && current.profile.avatar !== next.profile.avatar) {
          return { ...next, profile: { ...next.profile, avatar: current.profile.avatar } };
        }
        return next;
      });
      setSavedSnapshot((current) => {
        const next = buildDraft(prefs, current.availability);
        return next;
      });
      if (!isAdmin) setMeasurementUnit(prefs.measurementUnit);
    });
  }, [authUser?.id, buildDraft, editingProfile, isAdmin, setMeasurementUnit]);

  useEffect(() => {
    if (editingProfile) return;
    if (profileSyncedKeyRef.current === profileSyncKey) return;
    profileSyncedKeyRef.current = profileSyncKey;
    setDraft((current) => {
      const next = buildDraft(loadedPreferencesRef.current ?? undefined, current.availability);
      if (current.profile.avatar && current.profile.avatar !== next.profile.avatar) {
        return { ...next, profile: { ...next.profile, avatar: current.profile.avatar } };
      }
      return next;
    });
    setSavedSnapshot((current) =>
      buildDraft(loadedPreferencesRef.current ?? undefined, current.availability)
    );
  }, [buildDraft, editingProfile, profileSyncKey]);

  useEffect(() => {
    if (!isDesigner || !useSupabase) return;
    let cancelled = false;
    void getOwnDesignerContact()
      .then((phone) => {
        if (cancelled) return;
        setOwnDesignerPhone(phone);
        if (editingProfile) return;
        setDraft((current) => ({
          ...current,
          profile: { ...current.profile, phone },
        }));
        setSavedSnapshot((current) => ({
          ...current,
          profile: { ...current.profile, phone },
        }));
      })
      .catch(() => {
        // Phone column may be missing until the contact/service-areas patch is applied.
      });
    return () => {
      cancelled = true;
    };
  }, [designerId, editingProfile, isDesigner, useSupabase]);

  useEffect(() => {
    if (!isDesigner || !designerId) return;
    let cancelled = false;
    void getDesignerAvailability(designerId).then((availability) => {
      if (cancelled) return;
      setDraft((current) => ({ ...current, availability }));
      setSavedSnapshot((current) => ({ ...current, availability }));
    });
    return () => {
      cancelled = true;
    };
  }, [designerId, isDesigner]);

  const handleDiscard = () => {
    setDraft(savedSnapshot);
    setEditingProfile(false);
    showToast("Changes discarded");
  };

  const handleSave = () => {
    void (async () => {
      let profileSaved = false;

      try {
        const phoneChanged =
          (isCustomer || isDesigner) &&
          draft.profile.phone.trim() !== savedSnapshot.profile.phone.trim();
        if (phoneChanged) {
          const ok = await ensureReauth({ purpose: "change your phone number" });
          if (!ok) return;
        }

        let savedAvailability = draft.availability;

        if (useSupabase) {
          if (isDesigner && designerId) {
            const priceMin = draft.priceRangeMin.trim()
              ? Number.parseFloat(draft.priceRangeMin)
              : null;
            const priceMax = draft.priceRangeMax.trim()
              ? Number.parseFloat(draft.priceRangeMax)
              : null;
            const yearsExperience = draft.profile.yearsExperience?.trim()
              ? Number.parseInt(draft.profile.yearsExperience, 10)
              : null;
            const story = structuredDesignerStoryFields({
              bio: draft.bio,
              phone: draft.profile.phone,
              serviceAreas: draft.serviceAreas,
              tagline: designer?.tagline ?? "",
            });
            setOwnDesignerPhone(story.phone);
            await updateDesignerProfile(designerId, {
              designerName: draft.profile.fullName,
              specialty: draft.profile.professionalRole,
              location: draft.profile.location,
              profileImage: draft.profile.avatar,
              city: draft.studioCity,
              country: draft.studioCountry,
              offersInPerson: draft.offersInPerson,
              priceRangeMin: Number.isFinite(priceMin) ? priceMin : null,
              priceRangeMax: Number.isFinite(priceMax) ? priceMax : null,
              yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
              bio: story.bio,
              phone: story.phone,
              serviceAreas: story.serviceAreas,
              tagline: story.tagline,
            });
            savedAvailability = await saveDesignerAvailability(designerId, draft.availability);
            setDesignerMarketplaceVisibility(designerId, draft.marketplaceVisible);
          } else if (isCustomer && authUser?.customerId) {
            await updateCustomerProfile(authUser.customerId, {
              name: draft.profile.fullName,
              location: draft.profile.location,
              phone: draft.profile.phone,
              profileImage: draft.profile.avatar,
            });
          } else if (isAdmin && authUser?.id) {
            await updateUserProfile(authUser.id, {
              name: draft.profile.fullName,
              profileImage: draft.profile.avatar,
            });
          }
          await refreshAppData();
          profileSyncedKeyRef.current = null;
          profileSaved = true;
        } else if (isDesigner && designerId) {
          savedAvailability = await saveDesignerAvailability(designerId, draft.availability);
          setDesignerMarketplaceVisibility(designerId, draft.marketplaceVisible);
          profileSaved = true;
        }

        if (isCustomer && authUser?.customerId && useSupabase) {
          await saveMeasurementProfile(authUser.customerId, { unit: draft.unit }, draft.profile.fullName);
        }

        if (!isAdmin && authUser?.id) {
          try {
            const savedPrefs = await upsertUserPreferences(authUser.id, {
              measurementUnit: draft.unit,
              emailDigests: draft.emailDigests,
              pushAlerts: draft.pushAlerts,
              profileVisibility: draft.profileVisibility,
              twoFactorEnabled: draft.twoFactorEnabled,
            });
            loadedPreferencesRef.current = savedPrefs;
          } catch (prefsError) {
            const message =
              prefsError instanceof Error ? prefsError.message : "Could not save preferences";
            if (profileSaved) {
              setSavedSnapshot(draft);
              setEditingProfile(false);
              if (!isAdmin) setMeasurementUnit(draft.unit);
              showToast(
                message.includes("user_preferences")
                  ? "Profile saved. Preference settings need a database update — run supabase/patch-user-preferences.sql in Supabase."
                  : `Profile saved, but preferences could not be saved: ${message}`,
                "error"
              );
              return;
            }
            throw prefsError;
          }
        }

        if (!isAdmin) {
          setMeasurementUnit(draft.unit);
        }
        const nextDraft = { ...draft, availability: savedAvailability };
        setDraft(nextDraft);
        setSavedSnapshot(nextDraft);
        setEditingProfile(false);
        showToast("Settings saved successfully");
      } catch (error) {
        showToast(toUserFacingSupabaseError(error, "Could not save settings"), "error");
      }
    })();
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
      <header className="mb-8 lg:mb-10">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          Account Settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted lg:text-base">
          {isAdmin
            ? "Update your admin profile and account security for the FeyseFit operations portal."
            : "Manage your digital atelier profile, bespoke measurements, and security preferences to ensure a seamless luxury experience."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
        <SettingsProfileCard
          profile={draft.profile}
          editing={editingProfile}
          onEdit={() => setEditingProfile(true)}
          onChange={(profile) => setDraft((current) => ({ ...current, profile }))}
          variant={isAdmin ? "admin" : "default"}
          showPhone={isCustomer || isDesigner}
          showYearsExperience={isDesigner}
        />

        {!isAdmin && (
          <SettingsBespokeSpecsCard
            unit={draft.unit}
            specs={bespokeSpecs}
            onUnitChange={(unit) => setDraft((current) => ({ ...current, unit }))}
            fitProfileHref={isDesigner ? "/clients/measurements" : "/measurements"}
            fitProfileLabel={isDesigner ? "Manage client measurements" : "Update Fit Profile"}
          />
        )}

        {isDesigner && (
          <SettingsAvailabilityCard
            availability={draft.availability}
            onChange={(availability) => setDraft((current) => ({ ...current, availability }))}
          />
        )}

        {isDesigner && (
          <SettingsStudioMarketplaceCard
            city={draft.studioCity}
            country={draft.studioCountry}
            offersInPerson={draft.offersInPerson}
            priceRangeMin={draft.priceRangeMin}
            priceRangeMax={draft.priceRangeMax}
            bio={draft.bio}
            serviceAreas={draft.serviceAreas}
            onCityChange={(studioCity) => setDraft((current) => ({ ...current, studioCity }))}
            onCountryChange={(studioCountry) =>
              setDraft((current) => ({ ...current, studioCountry }))
            }
            onOffersInPersonChange={(offersInPerson) =>
              setDraft((current) => ({ ...current, offersInPerson }))
            }
            onPriceRangeMinChange={(priceRangeMin) =>
              setDraft((current) => ({ ...current, priceRangeMin }))
            }
            onPriceRangeMaxChange={(priceRangeMax) =>
              setDraft((current) => ({ ...current, priceRangeMax }))
            }
            onBioChange={(bio) => setDraft((current) => ({ ...current, bio }))}
            onServiceAreasChange={(serviceAreas) =>
              setDraft((current) => ({ ...current, serviceAreas }))
            }
          />
        )}

        {isAdmin && <SettingsAdminTeamCard />}

        <SettingsSecurityCard
          twoFactorEnabled={draft.twoFactorEnabled}
          onTwoFactorChange={(twoFactorEnabled) =>
            setDraft((current) => ({ ...current, twoFactorEnabled }))
          }
          profileVisibility={draft.profileVisibility}
          onProfileVisibilityChange={(profileVisibility) =>
            setDraft((current) => ({ ...current, profileVisibility }))
          }
          isDesigner={isDesigner}
          showProfileVisibility={!isAdmin}
          className={isAdmin ? "lg:col-span-12" : "lg:col-span-5"}
          marketplaceVisible={draft.marketplaceVisible}
          marketplacePending={isDesignerPending}
          onMarketplaceChange={(marketplaceVisible) =>
            setDraft((current) => ({ ...current, marketplaceVisible }))
          }
        />

        {!isAdmin ? (
          <div className="flex flex-col gap-6 lg:col-span-7">
            <SettingsNotificationCards
              emailDigests={draft.emailDigests}
              pushAlerts={draft.pushAlerts}
              onEmailDigestsChange={(emailDigests) =>
                setDraft((current) => ({ ...current, emailDigests }))
              }
              onPushAlertsChange={(pushAlerts) =>
                setDraft((current) => ({ ...current, pushAlerts }))
              }
            />
          </div>
        ) : null}

        <SettingsFooterActions
          onDiscard={handleDiscard}
          onSave={handleSave}
          showDeactivateAccount={!isAdmin}
        />
      </div>

      {isDesigner && (
        <div className="mt-8">
          <DesignerTestimonialsCard />
        </div>
      )}

      {isCustomer && (
        <div className="mt-8">
          <UnlinkRequestSection />
        </div>
      )}
    </div>
  );
}
