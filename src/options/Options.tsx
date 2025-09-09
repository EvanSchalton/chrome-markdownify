import { JSX, useEffect, useState } from 'react';

interface Settings {
  debugMode: boolean;
}

export default function Options(): JSX.Element {
  const [settings, setSettings] = useState<Settings>({
    debugMode: false,
  });
  const [saved, setSaved] = useState(false);

  // Load settings on mount
  useEffect(() => {
    chrome.storage.sync.get(['debugMode'], (result) => {
      setSettings({
        debugMode: result.debugMode || false,
      });
    });
  }, []);

  // Handle toggle change
  const handleDebugToggle = () => {
    const newSettings = { ...settings, debugMode: !settings.debugMode };
    setSettings(newSettings);
    // Auto-save on toggle
    chrome.storage.sync.set(newSettings, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className='min-h-screen' style={{ backgroundColor: '#f5f5dc' }}>
      <div className='mx-auto max-w-2xl p-8'>
        {/* Header */}
        <div className='mb-8 flex items-center gap-3'>
          <img src='/icon48.png' alt='Markdownify' className='h-12 w-12' />
          <div>
            <h1 className='text-2xl font-bold' style={{ color: '#2d5f3f' }}>
              Chrome Markdownify Settings
            </h1>
            <p className='text-sm' style={{ color: '#4a7c59' }}>
              Configure your extension preferences
            </p>
          </div>
        </div>

        {/* Settings Card */}
        <div className='rounded-lg bg-white p-6 shadow-md'>
          <h2
            className='mb-4 text-lg font-semibold'
            style={{ color: '#2d5f3f' }}
          >
            Developer Options
          </h2>

          {/* Debug Mode Toggle */}
          <div className='flex items-center justify-between border-b py-4'>
            <div>
              <label
                htmlFor='debugMode'
                className='text-sm font-medium text-gray-700'
              >
                Debug Mode
              </label>
              <p className='mt-1 text-xs text-gray-500'>
                Enable console logging for troubleshooting issues
              </p>
            </div>
            <button
              id='debugMode'
              type='button'
              onClick={handleDebugToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.debugMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role='switch'
              aria-checked={settings.debugMode}
            >
              <span className='sr-only'>Enable debug mode</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.debugMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Debug Mode Info */}
          {settings.debugMode && (
            <div className='mt-4 rounded border border-blue-200 bg-blue-50 p-3'>
              <p className='text-xs text-blue-700'>
                <strong>Debug mode is active.</strong> Open the browser console
                when using the extension to see detailed logs. Right-click the
                extension popup and select "Inspect" to view console output.
              </p>
            </div>
          )}

          {/* Future Settings Placeholder */}
          <div className='mt-6 border-t pt-6'>
            <h3 className='mb-2 text-sm font-medium text-gray-500'>
              More settings coming soon
            </h3>
            <p className='text-xs text-gray-400'>
              Future options: Markdown formatting preferences, clipboard
              behavior, and more.
            </p>
          </div>
        </div>

        {/* Save Notification */}
        {saved && (
          <div className='mt-4 rounded border border-green-200 bg-green-50 p-3'>
            <p className='text-sm text-green-700'>
              ✓ Settings saved successfully
            </p>
          </div>
        )}

        {/* Footer */}
        <div className='mt-8 text-center'>
          <p className='text-xs text-gray-500'>Chrome Markdownify v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
