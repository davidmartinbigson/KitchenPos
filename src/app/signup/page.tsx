import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { staffHome } from "@/lib/page-guards";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.type === "owner") redirect("/dashboard");
  if (session?.type === "staff") redirect(staffHome(session.staff.role));
  return <AuthForm mode="signup" />;
}
