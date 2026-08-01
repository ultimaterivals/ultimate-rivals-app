"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
export function AvatarUpload({ athleteId }: { athleteId: string }) {
  const [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState("");
  async function upload() {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Use JPEG, PNG ou WebP de até 5 MB.");
      return;
    }
    const extension = file.type.split("/")[1];
    const path = `${athleteId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await createClient()
      .storage.from("athlete-avatars")
      .upload(path, file, { upsert: false, contentType: file.type });
    setMessage(error ? error.message : "Avatar enviado com segurança.");
  }
  return (
    <div className="grid gap-3">
      <input
        aria-label="Avatar"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" onClick={upload}>
        Enviar avatar
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
