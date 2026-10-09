import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { formatDA } from '../services/pricing';
import { ALGERIAN_WILAYAS } from '../data/wilayas';
import { CustomerLinksManager } from './CustomerLinksManager';
import { downloadPricingPdf } from '../services/pricingPdf';
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Truck,
  Eye,
  Download,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  FileText,
  Link as LinkIcon,
  ListOrdered
} from 'lucide-react';

interface AdminDashboardProps {
  onRefreshStats?: () => void;
  openConfigModal: () => void;
  adminToken?: string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  openConfigModal,
  adminToken
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'orders' | 'links'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);

  // Bulk selection controls
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = adminToken || sessionStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-admin-token': token
    };
  };

  const fetchOrders = async () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null);
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (wilayaFilter !== 'all') params.append('wilaya', wilayaFilter);

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        setOrders([]);
        return;
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setDuplicateCount(data.duplicateCount || 0);
      // Clean selected IDs that no longer exist
      setSelectedOrderIds(prev => prev.filter(id => (data.orders || []).some((o: Order) => o.id === id)));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, wilayaFilter, adminToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Selection toggle handlers
  const isAllSelected = orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Permanent Delete Handler
  const handleConfirmDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderIds: selectedOrderIds })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedOrderIds([]);
        setIsDeleteDialogOpen(false);
        fetchOrders();
      } else {
        alert(`Erreur : ${data.message || 'Impossible de supprimer les commandes.'}`);
      }
    } catch (err: any) {
      alert(`Erreur réseau : ${err?.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoading(`status_${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      alert('Erreur lors du changement de statut.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateZRColis = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.zrExpress?.trackingNumber) {
      const confirmRetry = confirm(
        `Cette commande possède déjà le n° de suivi ZR : ${order.zrExpress.trackingNumber}.\nVoulez-vous ré-essayer ?`
      );
      if (!confirmRetry) return;
    }

    setActionLoading(`zr_${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/create-zr-colis`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        alert(`Colis ZR Express créé avec succès !\nN° de Suivi : ${data.trackingNumber}`);
      } else {
        alert(`Échec de création du colis ZR Express : ${data.message || data.error || 'Erreur inconnue'}`);
      }
      fetchOrders();
    } catch (err: any) {
      alert(`Erreur réseau : ${err?.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('Aucune commande à exporter.');
      return;
    }

    const headers = [
      'Code Commande',
      'Date Création',
      'Client',
      'Téléphone',
      'Produit',
      'Quantité',
      'Coins Arrondis',
      'Wilaya',
      'Type Livraison',
      'Commune / Bureau ZR',
      'Adresse',
      'Total (DA)',
      'Statut',
      'Suivi ZR Express',
      'ID Colis ZR'
    ];

    const rows = orders.map(o => [
      o.orderCode,
      new Date(o.createdAt).toLocaleString('fr-DZ'),
      `"${o.customer.fullName.replace(/"/g, '""')}"`,
      `"${o.customer.phone}"`,
      `"${o.cardConfig.product || 'Carte de visite'}"`,
      o.cardConfig.quantity,
      o.cardConfig.roundedCorners ? 'Oui' : 'Non',
      `"${o.customer.wilayaName}"`,
      o.customer.deliveryType === 'stopdesk' ? 'Stop Desk' : 'À Domicile',
      `"${(o.customer.deliveryType === 'stopdesk' ? o.customer.zrStopDesk : o.customer.commune) || ''}"`,
      `"${(o.customer.address || '').replace(/"/g, '""')}"`,
      o.pricing.total,
      o.status,
      o.zrExpress?.trackingNumber || '',
      o.zrExpress?.parcelId || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `commandes_kalissi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCardsPrinted = orders.reduce((acc, o) => acc + (o.cardConfig.quantity || 0), 0);
  const totalCODRevenue = orders.reduce((acc, o) => acc + (o.pricing.total || 0), 0);

  return (
    <div className="space-y-4 text-xs text-gray-800">

      {/* Top Admin Navigation & Utility Bar */}
      <div className="bg-white p-2.5 rounded-xl border border-gray-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveAdminTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
              activeAdminTab === 'orders'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Commandes (الطلبيات)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('links')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
              activeAdminTab === 'links'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
            <span dir="rtl">روابط الزبائن (Liens)</span>
          </button>
        </div>

        {/* Price List PDF Button */}
        <button
          type="button"
          onClick={downloadPricingPdf}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-lg shadow-2xs hover:shadow transition cursor-pointer"
          title="Télécharger la grille tarifaire complète ZR Express (58 wilayas) en format PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span dir="rtl">تحميل قائمة الأسعار (PDF)</span>
        </button>

      </div>

      {activeAdminTab === 'links' ? (
        <CustomerLinksManager adminToken={adminToken} />
      ) : (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
          <span className="text-[11px] text-gray-500 font-medium block">Total Commandes</span>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{orders.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Actives</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
          <span className="text-[11px] text-gray-500 font-medium block">Total Cartes</span>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {totalCardsPrinted.toLocaleString('fr-DZ')}
          </p>
          <span className="text-[10px] text-[#8C47FF]">Exemplaires</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
          <span className="text-[11px] text-gray-500 font-medium block">Chiffre COD Estimé</span>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">
            {formatDA(totalCODRevenue)}
          </p>
          <span className="text-[10px] text-gray-400">À l'encaissement</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-medium">Intégrations</span>
            <button
              onClick={openConfigModal}
              className="text-[11px] text-[#8C47FF] hover:underline font-medium cursor-pointer"
            >
              Gérer
            </button>
          </div>
          <div className="text-[10px] text-gray-600 mt-1 flex items-center gap-1.5">
            <img src="/zr-express-logo.svg" alt="ZR Express" className="h-3 w-auto object-contain" referrerPolicy="no-referrer" />
            <span>& Google Sheets</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Bulk Actions Bar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher code, client, téléphone, commune..."
            className="w-full bg-white border border-gray-300 rounded pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF]"
          />
        </form>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 rounded px-2.5 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">Tous statuts</option>
            <option value="new">Nouveau</option>
            <option value="confirmed">Confirmé</option>
            <option value="in_production">En tirage</option>
            <option value="shipped_zr">Expédié ZR</option>
            <option value="delivered">Livré</option>
            <option value="cancelled">Annulé</option>
            <option value="duplicate_blocked">Doublon</option>
          </select>

          {/* Wilaya Filter */}
          <select
            value={wilayaFilter}
            onChange={(e) => setWilayaFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 rounded px-2.5 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">58 Wilayas</option>
            {ALGERIAN_WILAYAS.map(w => (
              <option key={w.code} value={w.code}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchOrders}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded transition cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-[#8C47FF]/10 to-[#49DBFF]/10 border border-[#8C47FF]/30 hover:bg-purple-100 text-[#8C47FF] rounded text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar (Shows when 1 or more items selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 text-xs">
              {selectedOrderIds.length} commande(s) sélectionnée(s) sur {orders.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded transition cursor-pointer"
            >
              Désélectionner tout
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded transition flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer ({selectedOrderIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                {/* Select All Checkbox */}
                <th className="py-2.5 px-3 w-8">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-[#8C47FF] focus:ring-[#8C47FF] cursor-pointer"
                      title={isAllSelected ? "Désélectionner tout" : "Sélectionner tout"}
                    />
                  </div>
                </th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3">Produit & Tirage</th>
                <th className="py-2.5 px-3">Poids</th>
                <th className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1">
                    <img src="/zr-express-logo.svg" alt="ZR Express" className="h-3 w-auto object-contain inline-block" referrerPolicy="no-referrer" />
                    <span>ZR Express</span>
                  </span>
                </th>
                <th className="py-2.5 px-3">Total (DA)</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3">Actions</th>
                <th className="py-2.5 px-3 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-[#8C47FF]" />
                    <span>Chargement des commandes...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-400">
                    Aucune commande trouvée.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`transition cursor-pointer ${
                        isSelected ? 'bg-purple-50/50' : 'hover:bg-gray-50/80'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Individual Order Checkbox */}
                      <td className="py-2.5 px-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(order.id, e as any)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#8C47FF] focus:ring-[#8C47FF] cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Code & Date */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#8C47FF] block">
                          {order.orderCode}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {new Date(order.createdAt).toLocaleDateString('fr-DZ', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-gray-900 block truncate max-w-[130px]">
                          {order.customer.fullName}
                        </span>
                        <span className="font-mono text-gray-500 text-[11px] block">
                          {order.customer.phone}
                        </span>
                      </td>

                      {/* Destination */}
                      <td className="py-2.5 px-3 max-w-[170px]">
                        <span className="font-medium text-gray-800 block">
                          {order.customer.wilayaName} ({order.customer.wilayaCode})
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {order.customer.deliveryType === 'stopdesk'
                            ? `Stop Desk : ${order.customer.zrStopDesk || 'Bureau ZR'}`
                            : `Domicile : ${order.customer.commune}`}
                        </span>
                      </td>

                      {/* Produit & Quantité */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-gray-900 block">
                          {order.cardConfig.quantity.toLocaleString('fr-DZ')} cartes
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {order.cardConfig.product || 'Cartes 350g'} ({order.cardConfig.roundedCorners ? 'Coins arrondis' : 'Coins droits'})
                        </span>
                      </td>

                      {/* Poids */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-gray-900 block text-xs">
                          {(order.weightKg || order.pricing?.weightKg || ((order.cardConfig.quantity / 1000) * 1.7)).toFixed(1)} kg
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          ZR Express
                        </span>
                      </td>

                      {/* ZR Express Details (Tracking & Parcel ID) */}
                      <td className="py-2.5 px-3 max-w-[140px]">
                        {order.zrExpress?.trackingNumber ? (
                          <>
                            <span className="font-mono text-[11px] font-semibold text-blue-700 block truncate">
                              {order.zrExpress.trackingNumber}
                            </span>
                            <span className="text-[9px] text-gray-400 block truncate" title={order.zrExpress.parcelId}>
                              ID: {order.zrExpress.parcelId?.slice(0, 8)}...
                            </span>
                          </>
                        ) : order.zrExpress?.status === 'failed' ? (
                          <span className="text-[10px] text-red-600 font-medium block">
                            Échec envoi ZR
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 block">
                            Non expédié
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {formatDA(order.pricing.total)}
                      </td>

                      {/* Status Selector */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          disabled={actionLoading === `status_${order.id}`}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="text-[11px] px-2 py-0.5 rounded border border-gray-300 font-medium focus:outline-none bg-white cursor-pointer"
                        >
                          <option value="new">Nouveau</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="in_production">En tirage</option>
                          <option value="shipped_zr">Expédié ZR</option>
                          <option value="delivered">Livré</option>
                          <option value="cancelled">Annulé</option>
                          <option value="duplicate_blocked">Doublon</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleCreateZRColis(order.id)}
                            title={order.zrExpress?.trackingNumber ? `ZR: ${order.zrExpress.trackingNumber}` : 'Envoyer à ZR Express'}
                            className="p-1 rounded text-gray-400 hover:text-[#8C47FF] hover:bg-purple-50 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Details icon */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Permanent Deletion */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-900">
                  Confirmation de suppression
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Supprimer définitivement les commandes sélectionnées ?
                </p>
                <p className="text-[11px] text-gray-400">
                  ({selectedOrderIds.length} commande(s) seront effacées de manière irréversible).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <span>Supprimer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-lg max-w-lg w-full p-5 shadow-xl space-y-3.5 my-6 text-gray-800">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Code Commande</span>
                <span className="font-mono text-lg font-bold text-[#8C47FF]">
                  {selectedOrder.orderCode}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-700 text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Complete Compact Information */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-3 rounded border border-gray-200">
              <div>
                <span className="text-gray-500 block">Date de création :</span>
                <span className="font-medium text-gray-900">
                  {new Date(selectedOrder.createdAt).toLocaleString('fr-DZ')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Statut actuel :</span>
                <span className="font-bold text-gray-900 capitalize">{selectedOrder.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Nom du client :</span>
                <span className="font-medium text-gray-900">{selectedOrder.customer.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Téléphone :</span>
                <span className="font-mono font-medium text-gray-900">{selectedOrder.customer.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Mode de livraison :</span>
                <span className="font-medium text-gray-900">
                  {selectedOrder.customer.deliveryType === 'stopdesk' ? 'Stop Desk ZR' : 'À Domicile'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Wilaya :</span>
                <span className="font-medium text-gray-900">{selectedOrder.customer.wilayaName} ({selectedOrder.customer.wilayaCode})</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Point de destination / Adresse :</span>
                <span className="font-medium text-gray-900">
                  {selectedOrder.customer.deliveryType === 'stopdesk'
                    ? selectedOrder.customer.zrStopDesk
                    : `${selectedOrder.customer.commune} — ${selectedOrder.customer.address}`}
                </span>
              </div>
            </div>

            {/* Product, Weight & ZR Express Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded border border-gray-200 bg-white">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Tirage</span>
                <span className="font-bold text-gray-900 text-xs block mt-0.5">
                  {selectedOrder.cardConfig.quantity.toLocaleString('fr-DZ')} cartes
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {selectedOrder.cardConfig.product || 'Cartes 350g'} • {selectedOrder.cardConfig.roundedCorners ? 'Coins arrondis (+500 DA/1k)' : 'Coins droits'}
                </span>
              </div>

              <div className="p-2.5 rounded border border-gray-200 bg-white">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Poids du Colis</span>
                <span className="font-bold text-gray-900 text-xs block mt-0.5">
                  {(selectedOrder.weightKg || selectedOrder.pricing?.weightKg || ((selectedOrder.cardConfig.quantity / 1000) * 1.7)).toFixed(1)} kg
                </span>
                <span className="text-[10px] text-emerald-600 font-medium block">
                  Transmis à ZR Express
                </span>
              </div>

              <div className="p-2.5 rounded border border-gray-200 bg-white">
                <span className="text-gray-500 flex items-center gap-1 text-[10px] uppercase font-semibold">
                  <img src="/zr-express-logo.svg" alt="ZR Express" className="h-2.5 w-auto object-contain" referrerPolicy="no-referrer" />
                  <span>Expédition ZR Express</span>
                </span>
                <span className="font-bold text-blue-700 text-xs block mt-0.5 truncate">
                  {selectedOrder.zrExpress?.trackingNumber || 'Non généré'}
                </span>
                <span className="text-[9px] text-gray-400 block truncate" title={selectedOrder.zrExpress?.parcelId}>
                  ID: {selectedOrder.zrExpress?.parcelId || '—'}
                </span>
              </div>
            </div>

            {/* Pricing details */}
            <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Prix de base impression :</span>
                <span className="font-semibold text-gray-900">{formatDA(selectedOrder.pricing.cardsBasePrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Finition coins arrondis :</span>
                <span className="font-semibold text-gray-900">{formatDA(selectedOrder.pricing.roundedCornersFee)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frais de livraison :</span>
                <span className="font-semibold text-gray-900">{formatDA(selectedOrder.pricing.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Support carte offert :</span>
                <span>GRATUIT — مجاني</span>
              </div>
              <div className="pt-1.5 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                <span>TOTAL À PAYER (COD) :</span>
                <span className="text-[#8C47FF] text-base">{formatDA(selectedOrder.pricing.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCreateZRColis(selectedOrder.id)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-[#8C47FF]/10 to-[#49DBFF]/10 border border-[#8C47FF]/30 hover:bg-purple-100 text-[#8C47FF] rounded text-xs font-semibold transition cursor-pointer"
                >
                  Envoyer à ZR Express
                </button>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
