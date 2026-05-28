import { RefreshCw, SwitchCamera, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CameraSelectorProps = {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
};

export default function CameraSelector({
  devices,
  selectedDeviceId,
  onSelect,
  onRefresh,
  disabled,
}: CameraSelectorProps) {
  const [permissionLabel, setPermissionLabel] = useState("Camera");
  const activeIndex = Math.max(0, devices.findIndex((device) => device.deviceId === selectedDeviceId));
  const activeDevice = devices[activeIndex];

  useEffect(() => {
    setPermissionLabel(activeDevice?.label || `Camera ${activeIndex + 1}`);
  }, [activeDevice, activeIndex]);

  const activeLabel = useMemo(() => {
    const label = permissionLabel.toLowerCase();
    if (label.includes("back") || label.includes("rear") || label.includes("environment")) return "Back camera";
    if (label.includes("front") || label.includes("face") || label.includes("user")) return "Front camera";
    if (label.includes("usb") || label.includes("webcam")) return "External webcam";
    return permissionLabel;
  }, [permissionLabel]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const next = devices[(activeIndex + 1) % devices.length];
    onSelect(next.deviceId);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Video size={15} className="shrink-0 text-brand-neon" />
          <span className="truncate text-[10px] font-black uppercase tracking-widest text-white/70">
            {activeLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="rounded-lg border border-white/10 p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label="Refresh cameras"
          title="Refresh cameras"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <select
        value={selectedDeviceId}
        onChange={(event) => onSelect(event.target.value)}
        disabled={disabled || devices.length === 0}
        className="mb-2 w-full rounded-xl border border-white/10 bg-white/10 p-2 text-xs text-white outline-none"
      >
        {devices.length === 0 && <option value="">No camera detected</option>}
        {devices.map((device, index) => (
          <option key={device.deviceId || `camera-${index}`} value={device.deviceId}>
            {device.label || `Camera ${index + 1}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={switchCamera}
        disabled={disabled || devices.length < 2}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <SwitchCamera size={14} /> Switch Camera
      </button>
    </div>
  );
}
