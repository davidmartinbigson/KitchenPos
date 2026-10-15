import { requireOwnerPage } from "@/lib/page-guards";
import { SettingsForm } from "@/components/settings/settings-form";
import { parseAddons } from "@/lib/addons";
import { normalizePaymentMethods } from "@/lib/payment-methods";
import { parseMenuTheme } from "@/lib/menu-theme";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOwnerPage({ ownerOnly: true });

  return (
    <SettingsForm
      initial={{
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        currency: user.currency,
        country: user.country,
        city: (user as { city?: string }).city ?? "",
        area: (user as { area?: string }).area ?? "",
        language: user.language === "ur" ? "ur" : "en",
        dailyOrderReset: user.dailyOrderReset,
        addons: parseAddons(user.addons),
        tableCount: user.tableCount,
        receiptHeader: user.receiptHeader,
        receiptFooter: user.receiptFooter,
        receiptLogo: user.receiptLogo,
        receiptSize: user.receiptSize,
        taxRate: (user as { taxRate?: number }).taxRate ?? 0,
        googleReviewUrl: (user as { googleReviewUrl?: string }).googleReviewUrl ?? "",
        paymentMethods: normalizePaymentMethods((user as { paymentMethods?: unknown }).paymentMethods),
        menuTheme: parseMenuTheme((user as { menuTheme?: unknown }).menuTheme),
      }}
    />
  );
}
