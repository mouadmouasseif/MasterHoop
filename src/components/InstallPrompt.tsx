import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("masterHoopInstallDismissed") === "1");
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone;

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || isStandalone || (!promptEvent && !isIos)) return null;

  const close = () => {
    localStorage.setItem("masterHoopInstallDismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    close();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-md rounded-2xl border border-white/10 bg-black/85 p-4 text-white shadow-2xl backdrop-blur-xl md:left-auto">
      <button onClick={close} className="absolute right-3 top-3 rounded-lg p-1 text-white/40 hover:bg-white/10">
        <X size={16} />
      </button>
      <div className="flex gap-3 pr-8">
        <div className="rounded-xl bg-brand-orange/15 p-3 text-brand-orange"><Smartphone size={22} /></div>
        <div>
          <div className="font-black uppercase">Install MasterHoop</div>
          <p className="mt-1 text-sm text-white/55">
            {isIos ? "On iPhone, tap Share, then Add to Home Screen." : "Add the app to your phone for fullscreen training and offline launch."}
          </p>
          {promptEvent && (
            <button onClick={install} className="mt-3 flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase">
              <Download size={15} /> Install App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
