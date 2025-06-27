import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

export function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between md:max-w-sm md:left-auto">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm">Install BOARDING</p>
          <p className="text-xs opacity-90">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <Button
          onClick={installApp}
          size="sm"
          variant="secondary"
          className="bg-white text-blue-600 hover:bg-gray-100 text-xs px-3 py-1"
        >
          Install
        </Button>
        <Button
          onClick={() => setDismissed(true)}
          size="sm"
          variant="ghost"
          className="text-white hover:bg-blue-700 p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}