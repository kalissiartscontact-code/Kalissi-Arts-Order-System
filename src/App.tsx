import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { BusinessCardOrderForm } from './components/BusinessCardOrderForm';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { AdminDashboard } from './components/AdminDashboard';
import { IntegrationsConfigModal } from './components/IntegrationsConfigModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CustomerInfo, CardOrderConfig, Order, IntegrationStatus } from './types';
import { calculateCardOrderPricing } from './services/pricing';

const INITIAL_CUSTOMER: CustomerInfo = {
  fullName: '',
  phone: '',
  secondaryPhone: '',
  wilayaCode: '', // Default placeholder visually shows Alger, not forced as active value
  wilayaName: '',
  deliveryType: 'stopdesk', // Par défaut : STOP DESK
  commune: '',
  zrStopDesk: '',
  address: '',
  orderNotes: ''
};

const INITIAL_CARD_CONFIG: CardOrderConfig = {
  quantity: 1000,
  roundedCorners: false, // Par défaut : NON
  freeCardHolderGift: true,
  cardholderColor: 'Noir',
  cardName: '',
  cardActivity: ''
};

function detectChannelFromUrl(): 'whatsapp' | 'messenger' | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const rawChannel = params.get('channel')?.toLowerCase().trim();
    if (rawChannel === 'messenger') return 'messenger';
    if (rawChannel === 'whatsapp') return 'whatsapp';
  } catch (e) {
    // ignore
  }
  return null;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'order' | 'admin'>('order');

  // Channel tracking: comes ONLY from link parameter (?channel=whatsapp or ?channel=messenger)
  const [channel, setChannel] = useState<'whatsapp' | 'messenger' | null>(() => {
    const fromUrl = detectChannelFromUrl();
    if (fromUrl) {
      try {
        sessionStorage.setItem('kalissi_order_channel', fromUrl);
      } catch (e) {}
      return fromUrl;
    }
    try {
      const stored = sessionStorage.getItem('kalissi_order_channel');
      if (stored === 'messenger' || stored === 'whatsapp') {
        return stored;
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    const fromUrl = detectChannelFromUrl();
    if (fromUrl && fromUrl !== channel) {
      setChannel(fromUrl);
      try {
        sessionStorage.setItem('kalissi_order_channel', fromUrl);
      } catch (e) {}
    }
  }, []);

  // Admin authentication state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Customer state: Par défaut STOP DESK
  const [customer, setCustomer] = useState<CustomerInfo>(INITIAL_CUSTOMER);

  // Business Card Configuration: Par défaut Coins arrondis NON
  const [cardConfig, setCardConfig] = useState<CardOrderConfig>(INITIAL_CARD_CONFIG);

  // Key to cleanly remount form on reset
  const [formKey, setFormKey] = useState<number>(0);

  // Reset entire order form to its initial/default state
  const handleResetOrderForm = () => {
    setCreatedOrder(null);
    setCustomer({ ...INITIAL_CUSTOMER });
    setCardConfig({ ...INITIAL_CARD_CONFIG });
    setFormKey(prev => prev + 1);
    setCurrentView('order');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Success modal
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Integrations modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = adminToken || sessionStorage.getItem('admin_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-admin-token'] = token;
      }
      const res = await fetch('/api/config/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch (err) {
      console.error('Failed to load integration status:', err);
    }
  }, [adminToken]);

  // Verify stored token on startup
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      }).then(res => {
        if (!res.ok) {
          sessionStorage.removeItem('admin_token');
          setAdminToken(null);
          if (currentView === 'admin') setCurrentView('order');
        }
      }).catch(() => {});
    }
    fetchIntegrationStatus();
  }, [adminToken, fetchIntegrationStatus]);

  const handleAdminLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-admin-token': adminToken
        }
      }).catch(() => {});
    }
    sessionStorage.removeItem('admin_token');
    setAdminToken(null);
    if (currentView === 'admin') {
      setCurrentView('order');
    }
    fetchIntegrationStatus();
  };

  const handleAdminLoginSuccess = (token: string) => {
    sessionStorage.setItem('admin_token', token);
    setAdminToken(token);
    setIsAdminLoginOpen(false);
    fetchIntegrationStatus();
  };

  // Live dynamic pricing
  const pricing = useMemo(() => {
    return calculateCardOrderPricing(cardConfig, customer);
  }, [cardConfig, customer]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-gray-50 to-slate-100 text-gray-900 flex flex-col font-sans antialiased selection:bg-[#8C47FF]/20">
      
      {/* Clean Professional Header */}
      <Header
        currentView={currentView}
        setCurrentView={(view) => {
          if (view === 'admin' && !adminToken) {
            setIsAdminLoginOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        openConfigModal={() => setIsConfigModalOpen(true)}
        integrationStatus={integrationStatus}
        isAdminAuthenticated={Boolean(adminToken)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
        
        {currentView === 'order' ? (
          /* Formulaire de création de commande centré (Style ZR Express) */
          <BusinessCardOrderForm
            key={formKey}
            customer={customer}
            setCustomer={setCustomer}
            cardConfig={cardConfig}
            setCardConfig={setCardConfig}
            pricing={pricing}
            channel={channel}
            onOrderSuccess={(order) => setCreatedOrder(order)}
          />
        ) : (
          /* Vue Administration & Suivi des commandes (Admin Only) */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Gestion des commandes
                </h1>
                <p className="text-xs text-gray-500">
                  Suivi des expéditions ZR Express et gestion des commandes
                </p>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded transition cursor-pointer"
              >
                Paramètres API & Webhooks
              </button>
            </div>

            <AdminDashboard
              adminToken={adminToken}
              onRefreshStats={fetchIntegrationStatus}
              openConfigModal={() => setIsConfigModalOpen(true)}
            />
          </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kalissi Arts Algérie — Impression Cartes de Visite & Logistique ZR Express</span>
          <span className="text-[11px] text-gray-400">© {new Date().getFullYear()} — Tous droits réservés</span>
        </div>
      </footer>

      {/* Order Success Modal */}
      {createdOrder && (
        <OrderSuccessModal
          order={createdOrder}
          channel={createdOrder.channel || channel}
          onClose={handleResetOrderForm}
          onNewOrder={handleResetOrderForm}
        />
      )}

      {/* Integrations Modal */}
      <IntegrationsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        status={integrationStatus}
        onRefreshStatus={fetchIntegrationStatus}
        adminToken={adminToken}
        onAdminLogin={handleAdminLoginSuccess}
        onAdminLogout={handleAdminLogout}
      />

      {/* Dedicated Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={(token) => {
          handleAdminLoginSuccess(token);
          setCurrentView('admin');
        }}
      />

    </div>
  );
}
