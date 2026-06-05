import { useEffect, useId, useState } from "react";
import { Camera, X } from "lucide-react";

export default function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const reactId = useId().replace(/:/g, "");
  const scannerId = `masterhoop-qr-${reactId}`;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let scanner: import("html5-qrcode").Html5QrcodeScanner | null = null;
    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (cancelled) return;

        scanner = new Html5QrcodeScanner(
          scannerId,
          { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
          false,
        );
        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            setOpen(false);
          },
          () => undefined,
        );
      } catch (err) {
        console.warn("QR scanner unavailable:", err);
        setError("Scanner QR indisponible. Verifie la permission camera.");
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scanner?.clear().catch(() => undefined);
    };
  }, [onScan, open, scannerId]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded-xl border border-white/10 px-4 text-white/70"
        title="Scanner QR"
      >
        <Camera size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-black uppercase text-brand-orange">Scanner QR MasterHoop</div>
                <div className="text-xs text-white/45">masterhoop://player/MH-xxxxxx</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 p-2 text-white/70">
                <X size={18} />
              </button>
            </div>
            <div id={scannerId} className="overflow-hidden rounded-xl bg-black text-sm text-white" />
            {error && <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
