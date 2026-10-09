import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, RefreshCw, ArrowLeft, KeyRound } from 'lucide-react';

interface AdminLoginScreenProps {
  onLoginSuccess: (token: string) => void;
  onBackToHome?: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onLoginSuccess,
  onBackToHome
}) => {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Veuillez saisir le mot de passe administrateur.');
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
        setPasscode('');
      } else {
        setError(data.message || 'Code administrateur incorrect.');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[540px] flex items-center justify-center py-10 px-4">
      {/* Flou d'arrière-plan / Blurred Aura Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center -z-10">
        <div className="w-80 h-80 bg-[#8C47FF]/25 rounded-full blur-3xl transform -translate-x-16 -translate-y-12" />
        <div className="w-80 h-80 bg-[#49DBFF]/25 rounded-full blur-3xl transform translate-x-16 translate-y-12" />
      </div>

      {/* Écran de connexion flou / Frosted Glass Login Screen */}
      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/70 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-gray-800">
        
        {/* En-tête avec logo et icône de cadenas */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src="/photo-de-page.png"
              alt="Kalissi Arts"
              className="w-18 h-18 rounded-full object-cover border-2 border-amber-400 shadow-md mx-auto"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#8C47FF] text-white rounded-full flex items-center justify-center shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Espace Administration
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Cette section est strictement protégée par mot de passe. Veuillez vous authentifier pour accéder aux données et à la gestion des commandes.
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-gray-500" />
              <span>Mot de passe administrateur</span>
            </label>
            <input
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Entrez le mot de passe..."
              className="w-full bg-white/90 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#8C47FF] focus:ring-2 focus:ring-[#8C47FF]/20 transition shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Vérification...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        {/* Lien de retour vers l'espace client */}
        {onBackToHome && (
          <div className="pt-2 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium inline-flex items-center space-x-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à la page des commandes (Client)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
