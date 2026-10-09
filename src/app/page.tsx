import { getCurrentUser } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <LandingPage loggedIn={Boolean(user)} />;
}
