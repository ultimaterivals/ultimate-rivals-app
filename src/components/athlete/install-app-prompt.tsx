"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    if (window.localStorage.getItem("ur-install-dismissed") === "1") return;
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !promptEvent) return null;
  const dismiss = () => {
    window.localStorage.setItem("ur-install-dismissed", "1");
    setVisible(false);
  };
  const install = async () => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "dismissed")
      window.localStorage.setItem("ur-install-dismissed", "1");
    setVisible(false);
  };
  return (
    <aside
      className="rounded-ur border-ur-gold/30 bg-ur-graphite fixed right-4 bottom-20 left-4 z-30 mx-auto flex max-w-md items-center gap-3 border p-4 shadow-2xl lg:right-6 lg:bottom-6 lg:left-auto"
      aria-label="Instalar aplicativo"
    >
      <Download className="text-ur-gold shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <strong className="block text-sm">Instalar Ultimate Rivals</strong>
        <span className="text-xs text-zinc-400">
          Acesso rápido, em tela cheia.
        </span>
      </div>
      <button
        onClick={install}
        className="bg-ur-gold text-ur-black min-h-11 cursor-pointer rounded-lg px-3 text-xs font-black"
      >
        INSTALAR
      </button>
      <button
        onClick={dismiss}
        aria-label="Agora não"
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:text-white"
      >
        <X size={18} />
      </button>
    </aside>
  );
}
