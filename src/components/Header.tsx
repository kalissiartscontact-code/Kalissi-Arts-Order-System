import React, { useState, useRef } from 'react';
import { Package, Settings, PlusCircle, ListOrdered, ShieldCheck, Lock, LogOut, Upload } from 'lucide-react';
import { IntegrationStatus } from '../types';

interface HeaderProps {
  currentView: 'order' | 'admin';
  setCurrentView: (view: 'order' | 'admin') => void;
  openConfigModal: () => void;
  integrationStatus: IntegrationStatus | null;
  isAdminAuthenticated: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  openConfigModal,
  integrationStatus,
  isAdminAuthenticated,
  onOpenAdminLogin,
  onAdminLogout
}) => {
  const [logoSrc, setLogoSrc] = useState('/photo-de-page.jpg');
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheetsOk = integrationStatus?.googleSheets?.configured;
  const zrOk = integrationStatus?.zrExpress?.configured;

  const handleCommandesClick = () => {
    if (!isAdminAuthenticated) {
      onOpenAdminLogin();
    } else {
      setCurrentView('admin');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            filename: 'photo-de-page.jpg'
          })
        });
        if (res.ok) {
          setImgError(false);
          setLogoSrc(`/photo-de-page.jpg?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Erreur upload logo:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/90 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 select-none group">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!imgError ? (
              <div
                onClick={() => setCurrentView('order')}
                title="Kalissi Arts - Cliquez pour aller à la commande"
                className="cursor-pointer"
              >
                <img
                  src={logoSrc}
                  onError={() => setImgError(true)}
                  alt="Kalissi Arts - Graphic Design"
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/60 shadow-md shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Cliquez pour sélectionner photo-de-page.jpg depuis votre ordinateur"
                className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500 bg-amber-50/90 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100 transition shadow-inner shrink-0 text-center px-1"
              >
                <Upload className="w-5 h-5 text-amber-600 mb-0.5 animate-bounce" />
                <span className="text-[9px] font-bold text-amber-800 leading-tight">
                  {isUploading ? 'Import...' : 'Importer logo'}
                </span>
              </div>
            )}

            <div
              onClick={() => setCurrentView('order')}
              className="cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">
                  KALISSI ARTS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                Système d'expédition de la carte de visite
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* View Switcher: Nouvelle commande vs Gestion */}
            <div className="flex items-center bg-gray-100/90 p-1 rounded-lg border border-gray-200 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setCurrentView('order')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md transition cursor-pointer ${
                  currentView === 'order'
                    ? 'bg-white text-gray-900 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 font-medium'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#8C47FF]" />
                <span className="text-xs sm:text-sm">Nouvelle commande</span>
              </button>

              <button
                type="button"
                onClick={handleCommandesClick}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md transition cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-white text-gray-900 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 font-medium'
                }`}
              >
                <ListOrdered className="w-4 h-4 text-gray-600" />
                <span className="text-xs sm:text-sm">Commandes</span>
                {!isAdminAuthenticated && (
                  <Lock className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
                )}
              </button>
            </div>

            {/* Integrations Settings Button */}
            <button
              type="button"
              onClick={openConfigModal}
              title="Configuration API ZR Express (Admin)"
              className="flex items-center space-x-2 text-xs sm:text-sm px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-lg text-gray-700 transition cursor-pointer shadow-2xs"
            >
              <div className="flex items-center space-x-1">
                <span className={`w-2.5 h-2.5 rounded-full ${zrOk ? 'bg-emerald-500' : 'bg-amber-400'}`} title={zrOk ? 'ZR Express Connecté' : 'ZR Express Non Configuré'} />
              </div>
              <Settings className="w-4 h-4 text-gray-600" />
            </button>

            {/* Admin Badge or Login Button */}
            {isAdminAuthenticated ? (
              <div className="flex items-center space-x-1.5 pl-1.5 border-l border-gray-200">
                <span className="hidden md:inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Admin</span>
                </span>
                <button
                  type="button"
                  onClick={onAdminLogout}
                  title="Déconnexion Administrateur"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                title="Connexion Administrateur"
                className="hidden sm:flex items-center space-x-1.5 text-xs sm:text-sm px-3 py-2 text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition cursor-pointer shadow-2xs font-medium"
              >
                <Lock className="w-4 h-4 text-gray-500" />
                <span>Admin</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
