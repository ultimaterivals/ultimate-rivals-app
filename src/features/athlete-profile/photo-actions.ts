"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  fileSizeBucket,
  safeFailureReason,
} from "@/lib/analytics/engagement-events";
import { trackEngagementEvent } from "@/features/engagement/actions";

const avatarPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f-]{36}\.webp$/i;

async function getOwnAthlete() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data, error } = await client
    .from("athletes")
    .select("id,avatar_url,avatar_storage_path,show_profile_photo_publicly")
    .eq("profile_id", identity.userId)
    .single();
  if (error || !data) throw new Error("ATHLETE_NOT_FOUND");
  return { client, athlete: data };
}

function assertOwnAvatarPath(path: string, athleteId: string) {
  if (!avatarPathPattern.test(path) || !path.startsWith(`${athleteId}/`)) {
    throw new Error("PERMISSION_DENIED");
  }
}

async function assertNormalizedAvatarObject(
  client: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
) {
  const [folder, fileName] = storagePath.split("/");
  if (!folder || !fileName) throw new Error("PERMISSION_DENIED");
  const { data: objects, error: listError } = await client.storage
    .from("athlete-avatars")
    .list(folder, { limit: 100, search: fileName });
  if (listError) throw new Error("PERMISSION_DENIED");
  const object = objects?.find((item) => item.name === fileName);
  if (!object) throw new Error("UPLOAD_FAILED");
  const size =
    typeof object.metadata?.size === "number" ? object.metadata.size : null;
  const mimeType =
    typeof object.metadata?.mimetype === "string"
      ? object.metadata.mimetype
      : typeof object.metadata?.contentType === "string"
        ? object.metadata.contentType
        : null;
  if (size !== null && (size <= 0 || size > 5 * 1024 * 1024))
    throw new Error("FILE_TOO_LARGE");
  if (mimeType && mimeType !== "image/webp") throw new Error("INVALID_TYPE");
  const { data: blob, error: downloadError } = await client.storage
    .from("athlete-avatars")
    .download(storagePath);
  if (downloadError || !blob) throw new Error("UPLOAD_FAILED");
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!isWebp) throw new Error("INVALID_SIGNATURE");
  if (blob.size <= 0 || blob.size > 5 * 1024 * 1024)
    throw new Error("FILE_TOO_LARGE");
}

export async function saveAthletePhotoAction(input: {
  storagePath: string;
  originalType: "image/jpeg" | "image/png" | "image/webp";
  originalSize: number;
  durationMs: number;
}) {
  const startedAt = Date.now();
  const { client, athlete } = await getOwnAthlete();
  try {
    assertOwnAvatarPath(input.storagePath, athlete.id);
    await assertNormalizedAvatarObject(client, input.storagePath);
    const previousPath = athlete.avatar_storage_path ?? athlete.avatar_url;
    const { error } = await client
      .from("athletes")
      .update({
        avatar_url: input.storagePath,
        avatar_storage_path: input.storagePath,
        avatar_content_type: "image/webp-normalized",
        avatar_file_size_bytes: input.originalSize,
        avatar_updated_at: new Date().toISOString(),
      })
      .eq("id", athlete.id);
    if (error) throw error;
    if (previousPath && previousPath !== input.storagePath) {
      await client.storage.from("athlete-avatars").remove([previousPath]);
      await trackEngagementEvent({
        eventName: "athlete_photo_updated",
        athleteId: athlete.id,
        objectType: "athlete_avatar",
        objectId: athlete.id,
        metadata: {
          route: "/athlete/profile",
          source: "profile_photo_block",
          previous_state: "photo_present",
          new_state: "photo_present",
        },
      });
    }
    await trackEngagementEvent({
      eventName: "athlete_photo_upload_completed",
      athleteId: athlete.id,
      objectType: "athlete_avatar",
      objectId: athlete.id,
      metadata: {
        route: "/athlete/profile",
        source: "profile_photo_block",
        file_type: "webp",
        original_file_type: input.originalType,
        file_size_bucket: fileSizeBucket(input.originalSize),
        duration_ms: Math.max(input.durationMs, Date.now() - startedAt),
        success: true,
      },
    });
    revalidatePath("/athlete/profile");
    revalidatePath("/athlete/ranking");
    revalidatePath("/rankings", "layout");
  } catch (error) {
    if (avatarPathPattern.test(input.storagePath)) {
      await client.storage.from("athlete-avatars").remove([input.storagePath]);
    }
    await trackEngagementEvent({
      eventName: "athlete_photo_upload_failed",
      athleteId: athlete.id,
      objectType: "athlete_avatar",
      objectId: athlete.id,
      metadata: {
        route: "/athlete/profile",
        source: "profile_photo_block",
        failure_reason: safeFailureReason(
          error instanceof Error ? error.message : "PROCESSING_FAILED",
        ),
      },
    });
    throw error;
  }
}

export async function removeAthletePhotoAction() {
  const { client, athlete } = await getOwnAthlete();
  const oldPath = athlete.avatar_storage_path ?? athlete.avatar_url;
  const { error } = await client
    .from("athletes")
    .update({
      avatar_url: null,
      avatar_storage_path: null,
      avatar_content_type: null,
      avatar_file_size_bytes: null,
      avatar_updated_at: new Date().toISOString(),
      show_profile_photo_publicly: false,
    })
    .eq("id", athlete.id);
  if (error) throw error;
  if (oldPath) await client.storage.from("athlete-avatars").remove([oldPath]);
  await trackEngagementEvent({
    eventName: "athlete_photo_removed",
    athleteId: athlete.id,
    objectType: "athlete_avatar",
    objectId: athlete.id,
    metadata: {
      route: "/athlete/profile",
      source: "profile_photo_block",
      previous_state: "photo_present",
      new_state: "photo_removed",
    },
  });
  revalidatePath("/athlete/profile");
  revalidatePath("/athlete/ranking");
  revalidatePath("/rankings", "layout");
}

export async function setAthletePhotoVisibilityAction(formData: FormData) {
  const { client, athlete } = await getOwnAthlete();
  const next = formData.get("showProfilePhotoPublicly") === "on";
  const { error } = await client
    .from("athletes")
    .update({ show_profile_photo_publicly: next })
    .eq("id", athlete.id);
  if (error) throw error;
  await trackEngagementEvent({
    eventName: "athlete_photo_visibility_changed",
    athleteId: athlete.id,
    objectType: "athlete_avatar",
    objectId: athlete.id,
    metadata: {
      route: "/athlete/profile",
      source: "profile_photo_block",
      previous_state: athlete.show_profile_photo_publicly ? "public" : "private",
      new_state: next ? "public" : "private",
    },
  });
  revalidatePath("/athlete/profile");
  revalidatePath("/rankings", "layout");
}
