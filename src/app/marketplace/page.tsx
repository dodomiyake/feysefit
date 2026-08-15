import { MarketplacePageClient } from "./MarketplacePageClient";

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  return <MarketplacePageClient initialQuery={firstQueryValue(params.q)} />;
}
