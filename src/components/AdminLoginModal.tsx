import React, { useState } from 'react';
import { Lock, X, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Veuillez saisir le code administrateur.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('admin_token', data.token);
        onLoginSuccess(data.token);
        onClose();
        setPasscode('');
      } else {
        setError(data.message || 'Code administrateur incorrect.');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg max-w-sm w-full p-5 shadow-xl text-gray-800 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-purple-50 text-[#8C47FF] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">
              Accès Espace Administrateur
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Cette section est strictement réservée à l'administration de Kalissi Arts. Veuillez saisir le mot de passe administrateur :
        </p>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Mot de passe administrateur
            </label>
            <input
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Code d'accès admin"
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white rounded text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Connexion</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
