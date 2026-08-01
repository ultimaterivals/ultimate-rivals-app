"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { updateTeamLogoAction } from "./actions";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export function TeamLogoUpload({ teamId }: { teamId: string }) {
  const [message, setMessage] = useState("");
  async function upload(formData: FormData) {
    const file = formData.get("logo");
    if (
      !(file instanceof File) ||
      !allowed.has(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Use JPEG, PNG ou WebP de até 5 MB.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
    const path = `${teamId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await createClient()
      .storage.from("team-logos")
      .upload(path, file);
    if (error) {
      setMessage(error.message);
      return;
    }
    const update = new FormData();
    update.set("teamId", teamId);
    update.set("logoUrl", path);
    await updateTeamLogoAction(update);
    setMessage("Escudo atualizado.");
  }
  return (
    <form action={upload} className="grid gap-3">
      <input
        name="logo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
      />
      <Button type="submit">Atualizar escudo</Button>
      {message && (
        <p role="status" className="text-sm text-zinc-300">
          {message}
        </p>
      )}
    </form>
  );
}
