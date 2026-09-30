import React, { useState, useEffect } from 'react';
import { Package, Truck, Calendar, MapPin, CheckCircle, Clock, AlertCircle, ArrowLeft, Search } from 'lucide-react';
import { formatDA } from '../services/pricing';

interface CustomerOrderTrackingProps {
  initialCode?: string;
  initialToken?: string;
  onBackToOrder: () => void;
}

export const CustomerOrderTracking: React.FC<CustomerOrderTrackingProps> = ({
  initialCode = '',
  initialToken = '',
  onBackToOrder
}) => {
  const [orderCode, setOrderCode] = useState<string>(initialCode);
  const [orderToken, setOrderToken] = useState<string>(initialToken);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);

  const fetchTrackOrder = async (code: string, token: string) => {
    if (!code.trim() || !token.trim()) {
      setError('Veuillez fournir le code de commande et le jeton de sécurité.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/track?code=${encodeURIComponent(code.trim())}&token=${encodeURIComponent(token.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrderData(data.order);
      } else {
        setError(data.message || 'Commande introuvable ou jeton invalide.');
        setOrderData(null);
      }
    } catch (err: any) {
      setError('Erreur de connexion. Impossible de récupérer le statut.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialToken) {
      fetchTrackOrder(initialCode, initialToken);
    }
  }, [initialCode, initialToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackOrder(orderCode, orderToken);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Reçue / قيد المعالجة</span>;
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Confirmée / تم التأكيد</span>;
      case 'in_production':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">En cours d'impression / في الطباعة</span>;
      case 'shipped_zr':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Expédiée via ZR Express / تم الشحن</span>;
      case 'delivered':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Livrée / تم التوصيل</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Annulée / ملغاة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sm:p-7 max-w-2xl mx-auto text-gray-800 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Suivi de votre commande
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Suivi individuel et sécurisé de colis Kalissi Arts & ZR Express
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToOrder}
          className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Nouvelle commande</span>
        </button>
      </div>

      {/* Lookup Form if not loaded */}
      {(!orderData || error) && (
        <form onSubmit={handleSearch} className="space-y-3 bg-gray-50 p-4 rounded border border-gray-200">
          <p className="text-xs text-gray-600">
            Renseignez votre code commande et le jeton sécurisé reçu lors de votre commande :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Code commande (8 lettres)
              </label>
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                placeholder="Ex : KL9M4R2X"
                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs font-mono tracking-wider focus:outline-none focus:border-[#8C47FF]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Jeton de sécurité
              </label>
              <input
                type="text"
                value={orderToken}
                onChange={(e) => setOrderToken(e.target.value)}
                placeholder="Ex : tok_..."
                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#8C47FF]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] text-white rounded text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Recherche en cours...' : 'Consulter ma commande'}</span>
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Order Details Card */}
      {orderData && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-cyan-50 p-4 rounded-lg border border-purple-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-gray-500 block">
                Code Commande
              </span>
              <span className="font-mono text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#8C47FF] to-[#49DBFF]">
                {orderData.orderCode}
              </span>
              <span className="text-[11px] text-gray-500 block mt-0.5">
                Créée le {new Date(orderData.createdAt).toLocaleDateString('fr-DZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-gray-500 block mb-1">
                Statut
              </span>
              {getStatusBadge(orderData.status)}
            </div>
          </div>

          {/* Delivery & ZR Express Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider pb-1 border-b border-gray-100 flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-[#8C47FF]" />
              <span>Expédition & Livraison ZR Express</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px]">Destinataire :</span>
                <span className="font-semibold text-gray-900">{orderData.customer?.fullName}</span>
              </div>

              <div>
                <span className="text-gray-500 block text-[11px]">Mode de livraison :</span>
                <span className="font-medium text-gray-900">
                  {orderData.customer?.deliveryType === 'stopdesk' ? 'Stop Desk ZR Express' : 'À Domicile'}
                </span>
              </div>

              <div>
                <span className="text-gray-500 block text-[11px]">Wilaya :</span>
                <span className="font-medium text-gray-900">{orderData.customer?.wilayaName}</span>
              </div>

              <div>
                <span className="text-gray-500 block text-[11px]">Destination :</span>
                <span className="font-medium text-gray-900">
                  {orderData.customer?.deliveryType === 'stopdesk'
                    ? (orderData.customer?.zrStopDesk || 'Bureau ZR')
                    : `${orderData.customer?.commune || ''} — ${orderData.customer?.address || ''}`}
                </span>
              </div>

              {orderData.zrExpress?.trackingNumber && (
                <div className="col-span-1 sm:col-span-2 p-2.5 bg-emerald-50 rounded border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Numéro de suivi ZR Express
                    </span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      {orderData.zrExpress.trackingNumber}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-white text-emerald-700 border border-emerald-300 rounded shadow-xs">
                    Colis en cours d'acheminement
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product & Total */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Produit commandé :</span>
              <span className="font-semibold text-gray-900">
                {orderData.cardConfig?.quantity?.toLocaleString('fr-DZ')} Cartes de visite 350g
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Finition :</span>
              <span className="text-gray-900">
                {orderData.cardConfig?.roundedCorners ? 'Coins arrondis' : 'Coins droits'}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Cadeau inclus :</span>
              <span className="font-medium">Support de cartes offert (GRATUIT)</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-bold text-sm">
              <span className="text-gray-900">TOTAL À PAYER À LA LIVRAISON (COD) :</span>
              <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8C47FF] to-[#49DBFF]">
                {formatDA(orderData.pricing?.total || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
