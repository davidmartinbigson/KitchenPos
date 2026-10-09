import { requireOwnerPage } from "@/lib/page-guards";
import { SettingsForm } from "@/components/settings/settings-form";

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
        language: user.language === "ur" ? "ur" : "en",
      }}
    />
  );
}
