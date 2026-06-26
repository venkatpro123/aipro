import React, { useState, useEffect } from 'react';
import { canPromptInstall, promptInstall, dismissInstallPrompt, applyServiceWorkerUpdate } from '../services/pwaService';

export const PWAInstallPrompt: React.FC = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleInstallAvailable = () => {
      if (canPromptInstall()) {
        setShowInstall(true);
      }
    };

    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setShowInstall(false);
  };

  const handleUpdateNow = () => {
    applyServiceWorkerUpdate();
  };

  if (!showInstall && !showUpdate) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(var(--toast-bottom, 20px))',
      right: '20px',
      maxWidth: '320px',
      background: '#0b1020',
      border: '1px solid #00f5ff',
      borderRadius: '12px',
      padding: '16px',
      zIndex: 999,
      boxShadow: '0 8px 32px rgba(0,245,255,0.1)',
    }}>
      {showUpdate ? (
        <>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600'}}>Update Available</h3>
          <p style={{margin: '0 0 12px 0', fontSize: '13px', color: '#999'}}>A new version of HumanProof is ready!</p>
          <div style={{display: 'flex', gap: '8px'}}>
            <button
              onClick={handleUpdateNow}
              style={{
                flex: 1,
                padding: '8px',
                background: '#00f5ff',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Update Now
            </button>
            <button
              onClick={() => setShowUpdate(false)}
              style={{
                flex: 1,
                padding: '8px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600'}}>Install App</h3>
          <p style={{margin: '0 0 12px 0', fontSize: '13px', color: '#999'}}>Get offline access and native app feel.</p>
          <div style={{display: 'flex', gap: '8px'}}>
            <button
              onClick={handleInstall}
              style={{
                flex: 1,
                padding: '8px',
                background: '#00f5ff',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1,
                padding: '8px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
};
