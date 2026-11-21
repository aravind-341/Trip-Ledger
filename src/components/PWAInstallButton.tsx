import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-[#0F2557] dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] px-4 py-2'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-[#0F2557] dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 ${
            compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] px-4 py-2'
          }`}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close instructions"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5">
                <li>Tap the Share icon in the Safari toolbar.</li>
                <li>Scroll down and tap Add to Home Screen.</li>
                <li>Tap Add to launch Trip Expense Tracker offline.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#0F2557] dark:bg-[#4338CA] text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 flex items-center gap-2 rounded-xl bg-[#0F2557] dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-white shadow-lg border border-slate-700/40"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-300 shrink-0" />
      <span>Offline mode — data saves locally on this device.</span>
    </div>
  );
};
