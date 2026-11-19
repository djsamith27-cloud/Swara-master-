import React, { useState } from 'react';
import { MonitorDown, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { LanguageMode } from '../types/studio';

interface PWAInstallButtonProps {
  lang: LanguageMode;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            void install();
          } else {
            setShowGuide(true);
          }
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-200 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
      >
        <MonitorDown className="w-3.5 h-3.5 text-amber-400" />
        {lang === 'si' ? 'App එක Install කරන්න' : 'Install App'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-[#111722] border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-slate-100">
              {isIOS
                ? lang === 'si'
                  ? 'iPhone / iPad මත Install කරන විදිහ'
                  : 'Install on iPhone / iPad'
                : lang === 'si'
                  ? 'Swara Studio App එක Install / Download කරන්න'
                  : 'Install Swara Studio App'}
            </h3>

            {isIOS ? (
              <ol className="text-xs sm:text-sm text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  {lang === 'si'
                    ? 'Safari පහළ තීරුවේ Share බොත්තම ඔබන්න.'
                    : 'Tap the Share icon in the Safari toolbar.'}
                </li>
                <li>
                  {lang === 'si'
                    ? '"Add to Home Screen" තෝරන්න.'
                    : 'Scroll down and tap "Add to Home Screen".'}
                </li>
              </ol>
            ) : (
              <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
                <p>
                  {lang === 'si'
                    ? 'Chrome හෝ Edge browser එකේ address bar එකේ දකුණු පස ඇති "Install" icon එක click කර Phone/PC එකට App එක install කරගන්න පුළුවන්.'
                    : 'Click the Install icon on the right side of your Chrome or Edge address bar to install Swara Studio onto your device.'}
                </p>
                <p className="text-xs text-slate-400">
                  {lang === 'si'
                    ? 'නැතිනම් පහත බොත්තමෙන් තනි Offline HTML App file එක download කරගන්න:'
                    : 'Or download the standalone offline HTML app file directly:'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <a
                href="./swara-studio.html"
                download="Swara-Studio.html"
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap"
              >
                {lang === 'si' ? 'Offline HTML ගන්න' : 'Download HTML App'}
              </a>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {lang === 'si' ? 'වසන්න' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ lang: LanguageMode }> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {lang === 'si'
          ? 'Offline Mode — Browser DSP සහ Mastering ක්‍රියාත්මකයි'
          : 'Offline Mode — Browser DSP & Mastering Active'}
      </span>
    </div>
  );
};
