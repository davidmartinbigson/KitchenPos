import { requireOwnerPage } from "@/lib/page-guards";
import { SettingsForm } from "@/components/settings/settings-form";
import { parseAddons } from "@/lib/addons";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOwnerPage();

  return (
    <SettingsForm
      initial={{
        name: user.name,
        email: user.email,
        shopName: user.shopName,
        currency: user.currency,
        country: user.country,
        language: user.language === "ur" ? "ur" : "en",
        dailyOrderReset: user.dailyOrderReset,
        addons: parseAddons(user.addons),
        tableCount: user.tableCount,
      }}
    />
  );
}
