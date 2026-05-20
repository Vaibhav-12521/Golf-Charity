import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { CharityRow } from "./row";

export const dynamic = "force-dynamic";

export default async function AdminCharitiesPage() {
  const admin = createAdminClient();
  const { data: charities } = await admin.from("charities").select("*").order("featured", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Charities</h1>
          <p className="text-ink-600 mt-1">Manage every charity in the directory.</p>
        </div>
        <Link href="/admin/charities/new" className="btn-brand">+ New charity</Link>
      </header>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50">
            <tr className="text-left text-ink-600">
              <th className="px-4 py-3">Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Spotlight</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(charities || []).map((c) => (
              <CharityRow key={c.id} charity={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
