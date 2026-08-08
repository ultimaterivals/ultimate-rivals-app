"use client";

import { useEffect, useRef } from "react";
import {
  type EngagementEventName,
  type EngagementMetadata,
} from "@/lib/analytics/engagement-events";
import { trackEngagementEvent } from "./actions";

export function EngagementViewEvent({
  eventName,
  athleteId,
  objectType,
  objectId,
  metadata,
  dedupKey,
}: {
  eventName: EngagementEventName;
  athleteId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  metadata?: EngagementMetadata;
  dedupKey: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void trackEngagementEvent({
      eventName,
      athleteId,
      objectType,
      objectId,
      metadata,
    });
  }, [athleteId, dedupKey, eventName, metadata, objectId, objectType]);
  return null;
}

export function EngagementClick({
  eventName,
  athleteId,
  objectType,
  objectId,
  metadata,
  children,
}: {
  eventName: EngagementEventName;
  athleteId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  metadata?: EngagementMetadata;
  children: React.ReactNode;
}) {
  return (
    <span
      onClick={() => {
        void trackEngagementEvent({
          eventName,
          athleteId,
          objectType,
          objectId,
          metadata,
        });
      }}
    >
      {children}
    </span>
  );
}
