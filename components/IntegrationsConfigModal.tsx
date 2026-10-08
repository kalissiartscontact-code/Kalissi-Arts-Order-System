import React, { useState, useEffect } from 'react';
import { IntegrationStatus } from '../types';
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  Lock,
  ShieldCheck,
  LogOut
} from 'lucide-react';

interface IntegrationsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: IntegrationStatus | null;
  onRefreshStatus: () => void;
  adminToken?: string | null;
  onAdminLogin?: (token: string) => void;
  onAdminLogout?: () => void;
}

export const IntegrationsConfigModal: React.FC<IntegrationsConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  adminToken,
  onAdminLogin,
  onAdminLogout
}) => {
  const [zrTenant, setZrTenant] = useState<string>('');
  const [zrApiKey, setZrApiKey] = useState<string>('');
  const [zrApiBaseUrl, setZrApiBaseUrl] = useState<string>('https://api.zrexpress.app');

  const [saving, setSaving] = useState<boolean>(false);
  const [testingZr, setTestingZr] = useState<boolean>(false);
  const [zrTestResult, setZrTestResult] = useState<{ success: boolean; message: string; httpStatus?: number } | null>(null);

  // Admin auth state within modal
  const [currentToken, setCurrentToken] = useState<string | null>(
    adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null)
  );
  const [passcode, setPasscode] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (adminToken) {
      setCurrentToken(adminToken);
    } else {
      const saved = sessionStorage.getItem('admin_token');
      if (saved) setCurrentToken(saved);
    }
  }, [adminToken, isOpen]);

  const getAuthHeaders = (): Record<string, string> => {
    const token = currentToken || sessionStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-admin-token': token
    };
  };

  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Veuillez saisir le code administrateur.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('admin_token', data.token);
        setCurrentToken(data.token);
        if (onAdminLogin) onAdminLogin(data.token);
        setPasscode('');
        setAuthError(null);
      } else {
        setAuthError(data.message || 'Code administrateur incorrect.');
      }
    } catch {
      setAuthError('Erreur de communication avec le serveur.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          xTenant: zrTenant || undefined,
          xApiKey: zrApiKey || undefined,
          zrApiBaseUrl: zrApiBaseUrl || undefined
        })
      });

      if (res.status === 401) {
        setCurrentToken(null);
        sessionStorage.removeItem('admin_token');
        setAuthError('Session administrateur expirée. Veuillez vous reconnecter.');
        return;
      }

      const data = await res.json();
      if (data.success) {
        alert('Configuration enregistrée avec succès.');
        onRefreshStatus();
      } else {
        alert(data.message || 'Erreur lors de la sauvegarde.');
      }
    } catch {
      alert('Erreur réseau lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestZR = async () => {
    setTestingZr(true);
    setZrTestResult(null);
    try {
      const res = await fetch('/api/config/test-zr', {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        setCurrentToken(null);
        sessionStorage.removeItem('admin_token');
        setAuthError('Session administrateur expirée. Veuillez vous reconnecter.');
        return;
      }

      const data = await res.json();
      setZrTestResult({
        success: data.success,
        message: data.message,
        httpStatus: data.httpStatus
      });
    } catch (err: any) {
      setZrTestResult({
        success: false,
        message: `Erreur réseau : ${err?.message}`
      });
    } finally {
      setTestingZr(false);
    }
  };

  if (!isOpen) return null;

  const zrConfigured = status?.zrExpress?.configured;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-lg max-w-xl w-full p-6 shadow-xl space-y-5 my-6 text-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Key className="w-4 h-4 text-[#8C47FF]" />
              <span>Configuration Logistique ZR Express</span>
              {currentToken && (
                <span className="text-[10px] bg-purple-50 text-[#8C47FF] border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                  Admin authentifié
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Paramètres de connexion API ZR Express pour l'expédition automatique
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {currentToken && onAdminLogout && (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('admin_token');
                  setCurrentToken(null);
                  onAdminLogout();
                }}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-sm font-semibold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Auth Gate if not authenticated */}
        {!currentToken ? (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 text-[#8C47FF] rounded-lg mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-gray-900">
                  Accès Administrateur Requis
                </h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  La modification des identifiants API nécessite une authentification administrateur.
                </p>
              </div>
            </div>

            <form onSubmit={handleUnlockAdmin} className="space-y-2 pt-2">
              {authError && (
                <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Saisissez le code d'accès administrateur"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-1.5 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white rounded text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Déverrouiller les Paramètres</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ZR Express Status Banner */}
            <div className={`p-3 rounded border flex items-start space-x-2.5 ${
              zrConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {zrConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold block text-xs">
                  {zrConfigured ? 'ZR Express Connecté & Opérationnel' : 'Clés API ZR Express Requises'}
                </span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {status?.zrExpress?.detail || 'Plateforme api.zrexpress.app'}
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-gray-700 font-semibold block mb-0.5">
                  Tenant ID (X-Tenant / ZR_TENANT)
                </label>
                <input
                  type="text"
                  value={zrTenant}
                  onChange={(e) => setZrTenant(e.target.value)}
                  placeholder="ec5394f7-ffb2-4791-8a48-1ae281103c77"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] font-mono"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-0.5">
                  Clé API (X-Api-Key / ZR_API_KEY)
                </label>
                <input
                  type="password"
                  value={zrApiKey}
                  onChange={(e) => setZrApiKey(e.target.value)}
                  placeholder="Saisissez votre clé API ZR Express"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] font-mono"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-0.5">
                  Base URL (ZR_API_BASE_URL)
                </label>
                <input
                  type="text"
                  value={zrApiBaseUrl}
                  onChange={(e) => setZrApiBaseUrl(e.target.value)}
                  placeholder="https://api.zrexpress.app"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] font-mono"
                />
              </div>
            </div>

            {/* Connection Test */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                disabled={testingZr}
                onClick={handleTestZR}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium flex items-center space-x-1.5 border border-gray-300 transition cursor-pointer shrink-0 text-xs"
              >
                {testingZr ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3 text-[#8C47FF]" />}
                <span>Tester la connexion ZR Express</span>
              </button>
              {zrTestResult && (
                <div className={`text-[11px] p-1.5 rounded border ${
                  zrTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {zrTestResult.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveConfig}
                className="px-4 py-1.5 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white font-semibold rounded text-xs transition disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
