import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/admin");
  if (session.profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-wide py-4 md:py-10 flex flex-col md:flex-row gap-4 md:gap-6">
        <AdminNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
