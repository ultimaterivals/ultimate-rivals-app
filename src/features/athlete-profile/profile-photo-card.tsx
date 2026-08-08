"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import {
  fileSizeBucket,
  safeFailureReason,
} from "@/lib/analytics/engagement-events";
import { trackEngagementEvent } from "@/features/engagement/actions";
import {
  removeAthletePhotoAction,
  saveAthletePhotoAction,
} from "./photo-actions";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type AllowedType = (typeof allowedTypes)[number];

async function assertImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (
    (file.type === "image/png" && !isPng) ||
    (file.type === "image/jpeg" && !isJpeg) ||
    (file.type === "image/webp" && !isWebp)
  ) {
    throw new Error("INVALID_SIGNATURE");
  }
}

async function normalizeToWebp(file: File, focalX: number, focalY: number) {
  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  if (sourceSize < 96) throw new Error("INVALID_DIMENSIONS");
  const maxX = bitmap.width - sourceSize;
  const maxY = bitmap.height - sourceSize;
  const sx = Math.round(maxX * focalX);
  const sy = Math.round(maxY * focalY);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PROCESSING_FAILED");
  context.drawImage(bitmap, sx, sy, sourceSize, sourceSize, 0, 0, 512, 512);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PROCESSING_FAILED"))),
      "image/webp",
      0.86,
    );
  });
}

export function ProfilePhotoCard({
  athleteId,
  publicName,
  currentPhotoUrl,
  currentPhotoPath,
}: {
  athleteId: string;
  publicName: string;
  currentPhotoUrl?: string | null;
  currentPhotoPath?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  const [isPending, startTransition] = useTransition();
  const previewStyle = useMemo(
    () => ({ objectPosition: `${focalX * 100}% ${focalY * 100}%` }),
    [focalX, focalY],
  );

  async function onFile(next: File | null) {
    setMessage("");
    setFile(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (!next) return;
    try {
      if (!allowedTypes.includes(next.type as AllowedType))
        throw new Error("INVALID_TYPE");
      if (next.size > maxBytes) throw new Error("FILE_TOO_LARGE");
      await assertImageSignature(next);
      setFile(next);
      setPreview(URL.createObjectURL(next));
      await trackEngagementEvent({
        eventName: "athlete_photo_upload_started",
        athleteId,
        objectType: "athlete_avatar",
        objectId: athleteId,
        metadata: {
          route: "/athlete/profile",
          source: "profile_photo_block",
          file_type: next.type,
          file_size_bucket: fileSizeBucket(next.size),
        },
      });
    } catch (error) {
      const reason = safeFailureReason(
        error instanceof Error ? error.message : "PROCESSING_FAILED",
      );
      setMessage(errorMessage(reason));
      await trackEngagementEvent({
        eventName: "athlete_photo_upload_failed",
        athleteId,
        objectType: "athlete_avatar",
        objectId: athleteId,
        metadata: {
          route: "/athlete/profile",
          source: "profile_photo_block",
          failure_reason: reason,
        },
      });
    }
  }

  async function upload() {
    if (!file) return;
    const started = performance.now();
    try {
      const blob = await normalizeToWebp(file, focalX, focalY);
      const path = `${athleteId}/${crypto.randomUUID()}.webp`;
      const { error } = await createClient()
        .storage.from("athlete-avatars")
        .upload(path, blob, {
          upsert: false,
          contentType: "image/webp",
          cacheControl: "86400",
        });
      if (error) throw new Error("UPLOAD_FAILED");
      await saveAthletePhotoAction({
        storagePath: path,
        originalType: file.type as AllowedType,
        originalSize: file.size,
        durationMs: Math.round(performance.now() - started),
      });
      setMessage("Foto normalizada e salva com segurança.");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (error) {
      const reason = safeFailureReason(
        error instanceof Error ? error.message : "PROCESSING_FAILED",
      );
      setMessage(errorMessage(reason));
      await trackEngagementEvent({
        eventName: "athlete_photo_upload_failed",
        athleteId,
        objectType: "athlete_avatar",
        objectId: athleteId,
        metadata: {
          route: "/athlete/profile",
          source: "profile_photo_block",
          failure_reason: reason,
        },
      });
    }
  }

  return (
    <Card className="border-ur-gold/40">
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        <AthleteAvatar
          publicName={publicName}
          imageUrl={preview ?? currentPhotoUrl}
          size="xl"
          priority
        />
        <div className="grid gap-4">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
              Foto do perfil
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Identidade visual canônica
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Use JPEG, PNG ou WebP até 5 MB. A imagem é recortada em 1:1,
              normalizada para WebP 512×512 e não usa reconhecimento facial.
            </p>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Selecionar foto do perfil"
            onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
          />
          {preview && (
            <div className="grid gap-3 rounded-ur border border-white/10 p-3">
              <div className="aspect-square max-w-72 overflow-hidden rounded-ur border border-ur-gold/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview do recorte"
                  className="h-full w-full object-cover"
                  style={previewStyle}
                />
              </div>
              <label className="text-sm text-zinc-300">
                Reposicionar horizontalmente
                <input
                  className="mt-2 w-full"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(focalX * 100)}
                  onChange={(event) => setFocalX(Number(event.target.value) / 100)}
                />
              </label>
              <label className="text-sm text-zinc-300">
                Reposicionar verticalmente
                <input
                  className="mt-2 w-full"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(focalY * 100)}
                  onChange={(event) => setFocalY(Number(event.target.value) / 100)}
                />
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => startTransition(() => void upload())}
              disabled={!file || isPending}
            >
              {currentPhotoPath ? "Substituir foto" : "Salvar foto"}
            </Button>
            {currentPhotoPath && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  startTransition(async () => {
                    await removeAthletePhotoAction();
                    setMessage("Foto removida.");
                  })
                }
                disabled={isPending}
              >
                Remover foto
              </Button>
            )}
          </div>
          {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
        </div>
      </div>
    </Card>
  );
}

function errorMessage(reason: string) {
  const messages: Record<string, string> = {
    INVALID_TYPE: "Formato inválido. Use JPEG, PNG ou WebP.",
    FILE_TOO_LARGE: "Arquivo maior que 5 MB.",
    INVALID_SIGNATURE: "O conteúdo do arquivo não confere com o formato.",
    INVALID_DIMENSIONS: "Imagem pequena demais para um recorte nítido.",
    UPLOAD_FAILED: "Não foi possível enviar a foto agora.",
    PERMISSION_DENIED: "Você só pode alterar a própria foto.",
    PROCESSING_FAILED: "Não foi possível processar a imagem.",
  };
  return messages[reason] ?? "Não foi possível processar a imagem.";
}
