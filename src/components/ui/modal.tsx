"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="rounded-ur bg-ur-graphite w-full max-w-lg border p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-center justify-between gap-4">
          <h2
            id="modal-title"
            className="font-display text-2xl font-black uppercase"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            className="size-11 p-0"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
