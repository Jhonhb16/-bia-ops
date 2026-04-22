import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function HomePage() {
  const session = getSession();

  if (session?.role === "ceo") redirect("/dashboard/ceo");
  if (session?.role === "expert") redirect("/dashboard/expert");
  if (session?.role === "client" && session.clientId) redirect(`/dashboard/cliente/${session.clientId}`);

  redirect("/auth/login");
}
