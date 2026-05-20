"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload } from "lucide-react";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function ProofUploader({ winnerId, hasProof }: { winnerId: string; hasProof: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Max file size is 5MB.");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setUploading(false);
      return;
    }

    // Derive extension from MIME to avoid relying on user-controlled filenames.
    const ext = (file.type.split("/")[1] || "png")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${winnerId}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("winner-proofs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const res = await fetch(`/api/winners/${winnerId}/proof`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to register proof.");
      return;
    }
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <span className="btn-outline">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : hasProof ? "Re-upload proof" : "Upload score-card screenshot"}
      </span>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}
