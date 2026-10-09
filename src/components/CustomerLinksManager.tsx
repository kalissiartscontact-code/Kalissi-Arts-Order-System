import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export interface CustomerLinkItem {
  id: string;
  token: string;
  createdAt: string;
  status: 'active' | 'used';
  copied: boolean;
  usedAt?: string;
  orderCode?: string;
}

interface CustomerLinksManagerProps {
  adminToken?: string | null;
}

export const CustomerLinksManager: React.FC<CustomerLinksManagerProps> = ({ adminToken }) => {
  const [links, setLinks] = useState<CustomerLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState<Record<string, boolean>>({});

  const getAuthHeaders = (): Record<string, string> => {
    const token = adminToken || sessionStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-admin-token': token
    };
  };

  const fetchLinks = async () => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null);
    if (!token) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customer-links', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error fetching customer links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [adminToken]);

  const handleGenerate10 = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/customer-links/generate', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error generating links:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (link: CustomerLinkItem) => {
    const fullUrl = `${window.location.origin}/order?token=${link.token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch (e) {
      // Fallback
    }

    // Mark as copied locally and immediately disable
    setCopiedLocal(prev => ({ ...prev, [link.id]: true }));

    // Persist copied state on server
    try {
      await fetch(`/api/admin/customer-links/${link.id}/copy`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      setLinks(prev =>
        prev.map(l => (l.id === link.id ? { ...l, copied: true } : l))
      );
    } catch (e) {
      console.error('Failed to persist copy status:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customer-links/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (e) {
      console.error('Failed to delete link:', e);
    }
  };

  const activeCount = links.filter(l => l.status === 'active').length;
  const usedCount = links.filter(l => l.status === 'used').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4 text-xs text-gray-800">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5" dir="rtl">
              <span>روابط الزبائن</span>
              <span className="text-xs text-gray-400 font-normal">(Liens Clients)</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Usage Unique
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5" dir="rtl">
            روابط خاصة لكل زبون لإنشاء طلبية واحدة. يتم قفل الرابط فور استعماله تلقائياً.
          </p>
        </div>

        {/* Action Button: Generate 10 Links */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLinks}
            className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleGenerate10}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {generating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" />
            )}
            <span>Generate 10 Links</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50/80 p-2.5 rounded-lg border border-gray-200 text-center">
          <span className="text-[10px] text-gray-500 block">Total Liens</span>
          <span className="text-sm font-bold text-gray-900">{links.length}</span>
        </div>
        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 text-center">
          <span className="text-[10px] text-emerald-700 block">Disponibles (Actifs)</span>
          <span className="text-sm font-bold text-emerald-800">{activeCount} 🟢</span>
        </div>
        <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-200/80 text-center">
          <span className="text-[10px] text-red-700 block">Utilisés (Used)</span>
          <span className="text-sm font-bold text-red-800">{usedCount} 🔴</span>
        </div>
      </div>

      {/* Links List */}
      {loading && links.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
          <p>Chargement des liens...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 p-6 space-y-2">
          <LinkIcon className="w-6 h-6 text-gray-400 mx-auto" />
          <p className="text-gray-600 font-semibold" dir="rtl">
            لا توجد روابط حالياً.
          </p>
          <p className="text-[11px] text-gray-400">
            Cliquez sur "Generate 10 Links" pour générer vos 10 premiers liens clients uniques.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {links.map((link, idx) => {
              const isCopied = Boolean(copiedLocal[link.id] || link.copied);
              const isUsed = link.status === 'used';
              const fullUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/order?token=${link.token}`
                : `/order?token=${link.token}`;

              return (
                <div
                  key={link.id}
                  className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                    isUsed
                      ? 'bg-red-50/40 opacity-75'
                      : isCopied
                      ? 'bg-gray-100/60 opacity-60'
                      : 'bg-white hover:bg-gray-50/60'
                  }`}
                >
                  {/* Left: Link index, URL & Status */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-gray-400 w-5 text-right shrink-0">
                      #{links.length - idx}
                    </span>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isUsed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <span>Used 🔴</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span>Active 🟢</span>
                        </span>
                      )}
                    </div>

                    {/* URL string */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-xs truncate select-all transition-opacity ${
                            isUsed
                              ? 'text-red-700 font-semibold'
                              : isCopied
                              ? 'text-gray-400 opacity-50 font-normal'
                              : 'text-gray-900 font-semibold'
                          }`}
                          title={fullUrl}
                        >
                          {fullUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>Créé : {new Date(link.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {link.orderCode && (
                          <span className="text-emerald-700 font-bold">
                            • Commande : #{link.orderCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Copy & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Grand Bouton Turquoise (#16A085) du Lien Client */}
                    <button
                      type="button"
                      onClick={() => handleCopy(link)}
                      disabled={isCopied || isUsed}
                      style={{ backgroundColor: isCopied ? '#9ca3af' : isUsed ? '#d1d5db' : '#16A085' }}
                      className={`px-4 sm:px-6 py-2.5 rounded-xl text-white transition-all shadow-md hover:shadow-lg flex flex-col items-center justify-center text-center cursor-pointer min-w-[210px] sm:min-w-[240px] ${
                        isCopied || isUsed ? 'cursor-not-allowed opacity-75' : 'hover:opacity-95 active:scale-[0.99]'
                      }`}
                      title={isCopied ? 'Déjà copié' : 'Copier le lien'}
                    >
                      <span className="text-sm sm:text-base font-black text-white tracking-wide" dir="rtl">
                        {isCopied ? 'تم نسخ الرابط ✓' : 'اضغط هنا لإكمال طلبك'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-white/95 font-medium mt-0.5">
                        {isCopied ? 'Lien copié' : 'Cliquez ici pour compléter votre commande'}
                      </span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer self-center"
                      title="Supprimer ce lien"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
