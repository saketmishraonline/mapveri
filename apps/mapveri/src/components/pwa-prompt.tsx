import { useState } from 'react';
import { Download, WifiOff, X, Smartphone } from 'lucide-react';
import { usePwaInstall, useOnlineStatus } from '@/lib/pwa';

export function PwaPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {/* Offline Status Pill */}
      {!isOnline && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full border border-[#d97706]/40 bg-[#fffbeb] px-4 py-1.5 text-xs font-bold text-[#b45309] shadow-lg backdrop-blur-md animate-bounce"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={14} className="text-[#d97706]" />
          <span>Offline Mode — Viewing cached Boisar map & pins</span>
        </div>
      )}

      {/* Install PWA Prompt Banner (bottom right on desktop, bottom sheet on mobile) */}
      {isInstallable && !dismissed && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-[9998] max-w-sm rounded-2xl border border-[#c4d0c6] bg-[#f8f5ea]/95 p-4 shadow-2xl backdrop-blur-md transition sm:bottom-6 sm:right-6">
          <div className="flex items-start gap-3">
            <img
              src="/pwa-192x192.png"
              alt="MapVeri App Icon"
              className="h-11 w-11 rounded-xl shadow-md border border-[#e2e2d7]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-bold text-[#172a3a]">Install MapVeri</h4>
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg p-1 text-[#708079] hover:bg-[#e8e8dc]"
                  aria-label="Dismiss install prompt"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="mt-1 text-xs text-[#60716d] leading-4">
                Install as a standalone app on your device for instant offline access and native map experience.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={promptInstall}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2d6b60] px-3 py-1.5 text-xs font-bold text-[#f8f5ea] shadow-xs hover:bg-[#20574e] transition"
                >
                  <Download size={13} />
                  Install App
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#708079] hover:bg-[#e8e8dc] transition"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Compact Install Button for Navbar / Sidebar
export function PwaInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  if (isInstalled || !isInstallable) return null;

  return (
    <button
      onClick={promptInstall}
      className="flex items-center gap-2 rounded-lg bg-[#f1c744]/20 border border-[#f1c744]/40 px-3 py-2 text-xs font-bold text-[#172a3a] hover:bg-[#f1c744]/30 transition"
      title="Install MapVeri to device"
    >
      <Smartphone size={15} className="text-[#8a6c20]" />
      <span>Install App</span>
    </button>
  );
}
