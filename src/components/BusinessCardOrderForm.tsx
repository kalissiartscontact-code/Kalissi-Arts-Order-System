import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CustomerInfo, CardOrderConfig, PricingBreakdown, Order } from '../types';
import { ALGERIAN_WILAYAS, Wilaya } from '../data/wilayas';
import { BUSINESS_CARD_PRICING } from '../data/pricing';
import { formatDA } from '../services/pricing';
import { validateBusinessCardOrder } from '../services/validation';
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
  User,
  Phone,
  MapPin,
  Building2,
  Home,
  CreditCard,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface BusinessCardOrderFormProps {
  customer: CustomerInfo;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  cardConfig: CardOrderConfig;
  setCardConfig: React.Dispatch<React.SetStateAction<CardOrderConfig>>;
  pricing: PricingBreakdown;
  channel?: 'whatsapp' | 'messenger' | null;
  onOrderSuccess: (order: Order) => void;
}

export const BusinessCardOrderForm: React.FC<BusinessCardOrderFormProps> = ({
  customer,
  setCustomer,
  cardConfig,
  setCardConfig,
  pricing,
  channel,
  onOrderSuccess
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    existingOrderCode?: string;
    minutesAgo?: number;
  } | null>(null);

  // Product selection & confirmation modal
  const [selectedProduct, setSelectedProduct] = useState<string>('Carte de visite / بطاقة زيارة');
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);

  // Customer One-Time Link Token Tracking
  const customerLinkToken = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        return params.get('token') || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }, []);

  const [linkVerification, setLinkVerification] = useState<{
    checking: boolean;
    valid: boolean;
    isUsed: boolean;
    message?: string;
  }>({
    checking: Boolean(customerLinkToken),
    valid: true,
    isUsed: false
  });

  useEffect(() => {
    if (!customerLinkToken) {
      setLinkVerification({ checking: false, valid: true, isUsed: false });
      return;
    }

    fetch(`/api/customer-links/verify?token=${encodeURIComponent(customerLinkToken)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 410 || data.status === 'used') {
          setLinkVerification({
            checking: false,
            valid: false,
            isUsed: true,
            message: data.message || 'هذا الرابط تم استخدامه من قبل ولا يمكن إعادة استخدامه (Used 🔴).'
          });
        } else if (!res.ok || data.valid === false) {
          setLinkVerification({
            checking: false,
            valid: false,
            isUsed: false,
            message: data.message || 'هذا الرابط غير صالح أو غير موجود.'
          });
        } else {
          setLinkVerification({
            checking: false,
            valid: true,
            isUsed: false
          });
        }
      })
      .catch(() => {
        setLinkVerification({ checking: false, valid: true, isUsed: false });
      });
  }, [customerLinkToken]);

  // Active Wilaya (defaults visually to Alger for lists, but user must actively select a wilaya)
  const currentWilaya: Wilaya = useMemo(() => {
    return ALGERIAN_WILAYAS.find(w => w.code === customer.wilayaCode) || ALGERIAN_WILAYAS[15]; // Alger fallback
  }, [customer.wilayaCode]);

  // Anti-abuse, Honeypot & Turnstile Protection
  const formLoadedAt = useRef<number>(Date.now()).current;
  const [hpField, setHpField] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Initialize Turnstile only if site key is configured
  useEffect(() => {
    const siteKey = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey || !turnstileContainerRef.current) return;

    const renderTurnstile = () => {
      if ((window as any).turnstile && turnstileContainerRef.current && turnstileWidgetId.current === null) {
        try {
          turnstileWidgetId.current = (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(''),
            'error-callback': () => setTurnstileToken('')
          });
        } catch (e) {
          console.warn('Turnstile render warning:', e);
        }
      }
    };

    if ((window as any).turnstile) {
      renderTurnstile();
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval);
          renderTurnstile();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Searchable Wilaya Combobox state
  const [isWilayaOpen, setIsWilayaOpen] = useState<boolean>(false);
  const [wilayaSearch, setWilayaSearch] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const wilayaComboboxRef = useRef<HTMLDivElement>(null);
  const wilayaSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter Wilayas by keyboard search (startsWith priority, then includes)
  const filteredWilayas = useMemo(() => {
    if (!wilayaSearch.trim()) return ALGERIAN_WILAYAS;
    const term = wilayaSearch.trim().toLowerCase();
    return ALGERIAN_WILAYAS.filter(w =>
      w.name.toLowerCase().startsWith(term) ||
      w.code.startsWith(term) ||
      w.name.toLowerCase().includes(term) ||
      w.arabicName.includes(term)
    );
  }, [wilayaSearch]);

  // Close Wilaya dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wilayaComboboxRef.current && !wilayaComboboxRef.current.contains(event.target as Node)) {
        setIsWilayaOpen(false);
        setWilayaSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredWilayas]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isWilayaOpen && wilayaSearchInputRef.current) {
      wilayaSearchInputRef.current.focus();
    }
  }, [isWilayaOpen]);

  const handleWilayaSelect = (code: string) => {
    const selected = ALGERIAN_WILAYAS.find(w => w.code === code);
    if (!selected) return;

    setCustomer(prev => ({
      ...prev,
      wilayaCode: selected.code,
      wilayaName: selected.name,
      commune: selected.communes[0] || 'Centre',
      zrStopDesk: selected.zrStopDesks[0] || `Bureau ZR ${selected.name} Centre`
    }));

    setIsWilayaOpen(false);
    setWilayaSearch('');

    if (errors.wilayaCode) {
      setErrors(prev => ({ ...prev, wilayaCode: '' }));
    }
  };

  const handleWilayaKeyDown = (e: React.KeyboardEvent) => {
    if (!isWilayaOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsWilayaOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredWilayas.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredWilayas.length) % Math.max(1, filteredWilayas.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredWilayas[highlightedIndex]) {
        handleWilayaSelect(filteredWilayas[highlightedIndex].code);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsWilayaOpen(false);
      setWilayaSearch('');
    }
  };

  const handleDeliveryTypeChange = (type: 'stopdesk' | 'domicile') => {
    setCustomer(prev => ({
      ...prev,
      deliveryType: type,
      zrStopDesk: prev.wilayaCode ? (prev.zrStopDesk || currentWilaya.zrStopDesks[0] || `Bureau ZR ${currentWilaya.name} Centre`) : '',
      commune: prev.wilayaCode ? (prev.commune || currentWilaya.communes[0] || 'Centre') : ''
    }));
  };

  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Carte de visite / بطاقة زيارة') {
      setSelectedProduct(val);
      return;
    }
    setPendingProduct(val);
  };

  const handleConfirmProduct = () => {
    if (pendingProduct) {
      setSelectedProduct(pendingProduct);
    }
    setPendingProduct(null);
  };

  const handleCancelProduct = () => {
    setPendingProduct(null);
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomer(prev => ({ ...prev, fullName: val }));
    if (!val.trim()) {
      setErrors(prev => ({ ...prev, fullName: 'Le nom complet du client est obligatoire / الإسم الكامل إجباري.' }));
    } else if (val.trim().length < 2) {
      setErrors(prev => ({ ...prev, fullName: 'Le nom doit comporter au moins 2 caractères.' }));
    } else {
      setErrors(prev => ({ ...prev, fullName: '' }));
    }
  };

  /**
   * Phone Input Handler (Strict Prefix & Realtime UX):
   * - 05: RED
   * - 06: GREEN
   * - 07: BLUE
   * - 05, 06, 07 are all valid: DO NOT show error while typing valid prefix
   * - If user types invalid first two digits (01, 02, 03, 04, 08, 09...):
   *   STOP input immediately and show: "Le numéro doit commencer par 05, 06 ou 07."
   * - Max 10 digits, 11th digit never accepted.
   * - If submitted with < 10 digits: "Le numéro doit contenir 10 chiffres."
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // digits only

    // Empty
    if (!rawVal) {
      setCustomer(prev => ({ ...prev, phone: '' }));
      setErrors(prev => ({ ...prev, phone: '' }));
      return;
    }

    // First digit check: Must start with 0
    if (rawVal[0] !== '0') {
      setErrors(prev => ({ ...prev, phone: 'Le numéro doit commencer par 05, 06 ou 07.' }));
      return; // Do not accept non-zero first digit
    }

    // Second digit check: Must be 5, 6, or 7
    if (rawVal.length >= 2) {
      const prefix = rawVal.slice(0, 2);
      if (prefix !== '05' && prefix !== '06' && prefix !== '07') {
        // STOP input immediately and show simple message
        setErrors(prev => ({ ...prev, phone: 'Le numéro doit commencer par 05, 06 ou 07.' }));
        // Retain '0' and refuse invalid second digit
        setCustomer(prev => ({ ...prev, phone: '0' }));
        return;
      }
    }

    // Valid prefix entered (0, 05, 06, or 07):
    // Do NOT show an error message while typing a valid prefix!
    const valid10 = rawVal.slice(0, 10);
    setCustomer(prev => ({ ...prev, phone: valid10 }));
    setErrors(prev => ({ ...prev, phone: '' }));
  };

  const handleSubmit = async (ignoreDuplicate = false) => {
    // If phone has fewer than 10 digits, show error only at submission:
    if (!customer.phone || customer.phone.length < 10) {
      setErrors(prev => ({
        ...prev,
        phone: 'Le numéro doit contenir 10 chiffres.'
      }));
    }

    const validation = validateBusinessCardOrder(customer, {
      ...cardConfig,
      product: selectedProduct
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstKey = Object.keys(validation.errors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return; // DO NOT SAVE, DO NOT CALL ZR EXPRESS
    }

    setErrors({});
    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          cardConfig: {
            ...cardConfig,
            product: selectedProduct
          },
          channel: channel || undefined,
          ignoreDuplicateWarning: ignoreDuplicate,
          turnstileToken: turnstileToken || undefined,
          formLoadedAt,
          hp_field: hpField || undefined,
          customerLinkToken: customerLinkToken || undefined
        })
      });

      const data = await response.json();

      if (response.status === 410) {
        setLinkVerification({
          checking: false,
          valid: false,
          isUsed: true,
          message: data.message || 'هذا الرابط تم استخدامه من قبل ولا يمكن إعادة استخدامه.'
        });
        setIsSubmitting(false);
        return;
      }

      if (response.status === 409 && data.isDuplicate) {
        setDuplicateWarning({
          message: data.message,
          existingOrderCode: data.existingOrderCode,
          minutesAgo: data.minutesAgo
        });
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          alert(data.message || "Impossible d'enregistrer la commande.");
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onOrderSuccess(data.order);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Erreur de connexion : ${err?.message || 'Vérifiez votre connexion internet.'}`);
    }
  };

  if (linkVerification.checking) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-8 sm:p-12 text-center text-gray-500 max-w-lg mx-auto space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        <p className="text-sm font-semibold text-gray-700" dir="rtl">
          جاري التحقق من صلاحية رابط الطلب...
        </p>
        <p className="text-xs text-gray-400">
          Vérification de la validité de votre lien...
        </p>
      </div>
    );
  }

  if (linkVerification.isUsed || !linkVerification.valid) {
    return (
      <div className="bg-white rounded-2xl border border-red-200/90 shadow-md p-6 sm:p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-9 h-9" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-red-950" dir="rtl">
            {linkVerification.isUsed ? 'هذا الرابط تم استخدامه من قبل! (Used 🔴)' : 'رابط غير صالح'}
          </h2>
          <p className="text-xs sm:text-sm text-red-800 font-medium" dir="rtl">
            {linkVerification.message || 'عذراً، هذا الرابط مخصص للاستخدام لمرة واحدة فقط وقد تم إنشاء طلبية به مسبقاً.'}
          </p>
        </div>
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] text-gray-600" dir="rtl">
          كل رابط عميل في Kalissi Arts هو رابط مخصص للاستخدام لمرة واحدة فقط. بعد إنشاء الطلب بنجاح تنتهي صلاحية الرابط تلقائياً لحماية أمان بياناتكم.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] p-6 sm:p-8 max-w-3xl mx-auto text-gray-800">
      
      {/* Form Title */}
      <div className="pb-4 mb-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <img
            src="/photo-de-page.png"
            alt="Kalissi Arts Logo"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-400/50 shadow-sm shrink-0"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Ajouter une commande
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Formulaire de création de colis</span>
              <img
                src="/zr-express-logo.svg"
                alt="ZR Express"
                className="h-5 sm:h-5.5 w-auto object-contain inline-block align-middle"
                referrerPolicy="no-referrer"
              />
              <span>— Kalissi Arts</span>
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gradient-to-r from-[#8C47FF]/10 to-[#49DBFF]/10 text-[#8C47FF] border border-[#8C47FF]/30 rounded self-start sm:self-center">
          Paiement COD à la livraison
        </span>
      </div>

      <div className="space-y-6">

        {/* 1. DÉTAILS DE LA COMMANDE */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Détails de la commande
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Type de livraison <span className="text-red-500">*</span>
            </label>

            {/* Segmented Radio Options: Stop Desk (Default) vs À domicile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <button
                type="button"
                onClick={() => handleDeliveryTypeChange('stopdesk')}
                className={`flex items-center justify-between gap-3 py-3 px-3.5 rounded-lg border text-xs sm:text-sm transition cursor-pointer ${
                  customer.deliveryType === 'stopdesk'
                    ? 'border-[#8C47FF] bg-gradient-to-r from-[#8C47FF]/10 to-[#49DBFF]/10 text-gray-900 font-bold ring-1.5 ring-[#8C47FF]'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    customer.deliveryType === 'stopdesk' ? 'border-[#8C47FF]' : 'border-gray-400'
                  }`}>
                    {customer.deliveryType === 'stopdesk' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#8C47FF] to-[#49DBFF]" />
                    )}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap text-left">
                    <Building2 className="w-4 h-4 text-[#8C47FF] shrink-0" />
                    <span className="font-bold text-gray-900">Stop Desk Bureau</span>
                    <img
                      src="/zr-express-logo.svg"
                      alt="ZR Express"
                      className="h-5 sm:h-5.5 w-auto object-contain inline-block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDeliveryTypeChange('domicile')}
                className={`flex items-center justify-between gap-3 py-3 px-3.5 rounded-lg border text-xs sm:text-sm transition cursor-pointer ${
                  customer.deliveryType === 'domicile'
                    ? 'border-[#8C47FF] bg-gradient-to-r from-[#8C47FF]/10 to-[#49DBFF]/10 text-gray-900 font-bold ring-1.5 ring-[#8C47FF]'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    customer.deliveryType === 'domicile' ? 'border-[#8C47FF]' : 'border-gray-400'
                  }`}>
                    {customer.deliveryType === 'domicile' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#8C47FF] to-[#49DBFF]" />
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-left">
                    <Home className="w-4 h-4 text-[#8C47FF] shrink-0" />
                    <div>
                      <span className="font-bold text-gray-900 block">À domicile</span>
                      <span className="text-[10px] text-gray-500 font-normal block leading-tight">Livraison directement à votre porte</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 2. INFORMATIONS DU CLIENT */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Informations du client
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Nom complet */}
            <div id="field-fullName">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <User className="w-4 h-4 text-[#8C47FF]" />
                <span>Nom complet</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customer.fullName}
                onChange={handleFullNameChange}
                placeholder="Ex : Karim Benali"
                className={`w-full bg-white border rounded px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            {/* Téléphone principal (Prefix colored: 05 Red, 06 Green, 07 Blue) */}
            <div id="field-phone">
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-[#8C47FF]" />
                  <span>Téléphone principal</span>
                  <span className="text-red-500">*</span>
                </label>
                {/* Visual operator indicator badge */}
                {customer.phone.startsWith('05') && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    05 • Ooredoo
                  </span>
                )}
                {customer.phone.startsWith('06') && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    06 • Mobilis
                  </span>
                )}
                {customer.phone.startsWith('07') && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    07 • Djezzy
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={customer.phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  placeholder="Ex : 0550123456"
                  className={`w-full bg-white border rounded px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  } ${
                    customer.phone.length >= 2 ? 'text-transparent caret-gray-900 selection:bg-purple-100' : 'text-gray-900'
                  }`}
                />

                {/* Formatted colored prefix overlay: 05 Red, 06 Green, 07 Blue */}
                {customer.phone.length >= 2 && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-xs font-mono tracking-wider">
                    <span
                      className={`font-bold ${
                        customer.phone.startsWith('05')
                          ? 'text-red-600'
                          : customer.phone.startsWith('06')
                          ? 'text-emerald-600'
                          : customer.phone.startsWith('07')
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {customer.phone.slice(0, 2)}
                    </span>
                    <span className="text-gray-900">{customer.phone.slice(2)}</span>
                  </div>
                )}
              </div>

              {errors.phone ? (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.phone}</p>
              ) : (
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  10 chiffres (05 Ooredoo en rouge, 06 Mobilis en vert, 07 Djezzy en bleu)
                </span>
              )}
            </div>

          </div>
        </section>

        {/* 3. DESTINATION DE LA COMMANDE */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Destination de la commande
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Wilaya: Searchable Combobox supporting typing C, A, B... */}
            <div id="field-wilayaCode" className="relative" ref={wilayaComboboxRef}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <MapPin className="w-4 h-4 text-[#8C47FF]" />
                <span>Wilaya</span>
                <span className="text-red-500">*</span>
              </label>

              {/* Main Trigger / Selector */}
              <div
                tabIndex={0}
                onClick={() => setIsWilayaOpen(prev => !prev)}
                onKeyDown={handleWilayaKeyDown}
                className={`w-full bg-white border rounded px-3 py-2 text-xs flex items-center justify-between cursor-pointer focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] transition ${
                  errors.wilayaCode ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <span
                  className={
                    customer.wilayaCode
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-400 font-normal'
                  }
                >
                  {customer.wilayaCode
                    ? `${customer.wilayaCode} - ${customer.wilayaName}`
                    : 'Alger'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                    isWilayaOpen ? 'rotate-180 text-[#8C47FF]' : ''
                  }`}
                />
              </div>

              {/* Searchable Dropdown Menu */}
              {isWilayaOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden text-xs">
                  {/* Search input for letters (C, A, B...) */}
                  <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      ref={wilayaSearchInputRef}
                      type="text"
                      value={wilayaSearch}
                      onChange={(e) => setWilayaSearch(e.target.value)}
                      onKeyDown={handleWilayaKeyDown}
                      placeholder="Taper une lettre (ex : C, A, B) ou nom..."
                      className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                    {wilayaSearch && (
                      <button
                        type="button"
                        onClick={() => setWilayaSearch('')}
                        className="text-gray-400 hover:text-gray-600 px-1 text-[11px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filtered Wilayas List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {filteredWilayas.length > 0 ? (
                      filteredWilayas.map((w, idx) => {
                        const isSelected = customer.wilayaCode === w.code;
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <div
                            key={w.code}
                            onClick={() => handleWilayaSelect(w.code)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                              isHighlighted
                                ? 'bg-purple-50 text-[#8C47FF]'
                                : isSelected
                                ? 'bg-gray-50 font-semibold text-gray-900'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">
                              <span className="font-mono text-gray-400 mr-2 text-[11px]">
                                {w.code}
                              </span>
                              <span>{w.name}</span>
                              <span className="text-gray-400 text-[10px] ml-1.5 font-normal">
                                ({w.arabicName})
                              </span>
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#8C47FF] shrink-0" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-[11px]">
                        Aucune wilaya ne correspond à "{wilayaSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errors.wilayaCode && (
                <p className="text-[11px] text-red-600 mt-1">{errors.wilayaCode}</p>
              )}
            </div>

            {/* Condition: If Stop Desk -> Bureau ZR Express */}
            {customer.deliveryType === 'stopdesk' && (
              <div id="field-zrStopDesk">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1 flex-wrap">
                  <Building2 className="w-4 h-4 text-[#8C47FF]" />
                  <span>Bureau Stop Desk</span>
                  <img
                    src="/zr-express-logo.svg"
                    alt="ZR Express"
                    className="h-5 sm:h-5.5 w-auto object-contain inline-block"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={customer.zrStopDesk || ''}
                  onChange={(e) => {
                    setCustomer(prev => ({ ...prev, zrStopDesk: e.target.value }));
                    if (errors.zrStopDesk) setErrors(prev => ({ ...prev, zrStopDesk: '' }));
                  }}
                  className={`w-full bg-white border rounded px-3 py-2 text-xs focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] ${
                    customer.zrStopDesk ? 'text-gray-900' : 'text-gray-400'
                  } ${
                    errors.zrStopDesk ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled hidden className="text-gray-400">
                    Sélectionner un bureau ZR Express
                  </option>
                  {currentWilaya.zrStopDesks.map((hub) => (
                    <option key={hub} value={hub} className="text-gray-900">
                      {hub}
                    </option>
                  ))}
                </select>
                {errors.zrStopDesk && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.zrStopDesk}</p>
                )}
              </div>
            )}

            {/* Condition: If À domicile -> Commune */}
            {customer.deliveryType === 'domicile' && (
              <div id="field-commune">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 text-[#8C47FF]" />
                  <span>Commune</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={customer.commune || ''}
                  onChange={(e) => {
                    setCustomer(prev => ({ ...prev, commune: e.target.value }));
                    if (errors.commune) setErrors(prev => ({ ...prev, commune: '' }));
                  }}
                  className={`w-full bg-white border rounded px-3 py-2 text-xs focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] ${
                    customer.commune ? 'text-gray-900' : 'text-gray-400'
                  } ${
                    errors.commune ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled hidden className="text-gray-400">
                    Sélectionner la commune
                  </option>
                  {currentWilaya.communes.map((c) => (
                    <option key={c} value={c} className="text-gray-900">
                      {c}
                    </option>
                  ))}
                </select>
                {errors.commune && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.commune}</p>
                )}
              </div>
            )}

            {/* Condition: If À domicile -> Adresse de livraison */}
            {customer.deliveryType === 'domicile' && (
              <div className="sm:col-span-2" id="field-address">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                  <Home className="w-4 h-4 text-[#8C47FF]" />
                  <span>Adresse de livraison complète (À domicile)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customer.address || ''}
                  onChange={(e) => {
                    setCustomer(prev => ({ ...prev, address: e.target.value }));
                    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                  }}
                  placeholder="Ex : N° 14, Rue Larbi Ben M'hidi, Bâtiment B, 2ème étage"
                  className={`w-full bg-white border rounded px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF] ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.address && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>
                )}
              </div>
            )}

          </div>

          {/* CADEAU SOUS LA SECTION DESTINATION */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-emerald-50 border-2 border-emerald-500 shadow-xs text-emerald-950">
              <div className="flex items-center space-x-3">
                <span className="text-3xl leading-none shrink-0 filter drop-shadow-xs">🎁</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-black tracking-tight text-emerald-900">
                      Support carte offert
                    </span>
                    <span className="text-sm sm:text-base font-bold text-emerald-800" dir="rtl">
                      • حامل بطاقات هدية
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Offert gracieusement avec chaque commande de cartes de visite
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs sm:text-sm tracking-wide shadow-xs uppercase">
                  GRATUIT — مجاني
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PRODUIT */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Produit
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Produit (Default: Carte de visite / بطاقة زيارة) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 text-[#8C47FF]" />
                <span>Type de produit</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProduct}
                onChange={handleProductSelectChange}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF]"
              >
                <option value="Carte de visite / بطاقة زيارة">
                  Carte de visite / بطاقة زيارة (350g Recto/Verso)
                </option>
                <option value="Flyer">Flyer</option>
                <option value="Dépliant">Dépliant</option>
                <option value="Brochure / Catalogue">Autre produit disponible</option>
              </select>
            </div>

            {/* Quantité de cartes */}
            <div id="field-quantity">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Layers className="w-4 h-4 text-[#8C47FF]" />
                <span>Quantité d'exemplaires</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={cardConfig.quantity}
                onChange={(e) => setCardConfig(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-gray-900 font-medium focus:outline-none focus:border-[#8C47FF] focus:ring-1 focus:ring-[#8C47FF]"
              >
                {BUSINESS_CARD_PRICING.map(tier => (
                  <option key={tier.quantity} value={tier.quantity}>
                    {tier.label} {tier.hasExplicitPrice ? `— ${formatDA(tier.basePrice)}` : '— Tarif PRICING'}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* 5. OPTIONS (COINS ARRONDIS / زوايا منحنية) */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wider">
                Finition des angles & découpe • نوع زوايا البطاقة
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choisissez le style des 4 coins de vos cartes de visite
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Étape 2/3
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Quick Segmented Toggle Bar */}
            <div className="bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-gray-700 px-2 hidden sm:inline">
                Style des coins sélectionné :
              </span>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: false }))}
                  className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !cardConfig.roundedCorners
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-none bg-current shrink-0 border border-white/40" />
                  <span>Coins droits (Inclus)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: true }))}
                  className={`py-2 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    cardConfig.roundedCorners
                      ? 'bg-[#16A085] text-white shadow-md shadow-[#16A085]/30 ring-2 ring-[#16A085]/40'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50/60'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0 border border-white/40" />
                  <span>Coins arrondis (+{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)})</span>
                  <span className="hidden sm:inline text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">Top</span>
                </button>
              </div>
            </div>

            {/* Visual Comparison Cards (Two Distinct Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              
              {/* Option 1 : Coins Droits (90° - Strictement Carrés) */}
              <div
                onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: false }))}
                className={`rounded-2xl border-2 p-5 cursor-pointer transition-all relative flex flex-col justify-between overflow-hidden ${
                  !cardConfig.roundedCorners
                    ? 'border-slate-800 bg-slate-50/80 shadow-md ring-2 ring-slate-800/15'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40 shadow-xs'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-none border-2 flex items-center justify-center shrink-0 ${
                      !cardConfig.roundedCorners ? 'border-slate-900 bg-slate-900' : 'border-gray-400 bg-white'
                    }`}>
                      {!cardConfig.roundedCorners && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        Coins droits (90°)
                      </h3>
                      <span className="text-xs sm:text-sm font-bold text-slate-600 block" dir="rtl">
                        زوايا قائمة حادة (90°)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-slate-700 bg-slate-200/80 border border-slate-300 px-2.5 py-1 rounded-md shrink-0">
                    Inclus (+0 DA)
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  Découpe standard à angles droits nets. Format rectangulaire classique et sobre.
                </p>

                {/* Big Visual Mockup: Strictly Square Card */}
                <div className="w-full h-44 sm:h-48 bg-gradient-to-b from-slate-100 to-slate-200/90 rounded-none border-2 border-slate-300 p-4 relative flex items-center justify-center shadow-inner overflow-hidden my-1">
                  
                  {/* Miniature Physical Card: Sharp 90° Angles */}
                  <div className="w-64 sm:w-72 h-32 sm:h-36 bg-white border-2 border-slate-800 rounded-none shadow-md relative flex flex-col justify-between p-3 select-none">
                    
                    {/* Top Right 90° Corner Focus Callout */}
                    <div className="absolute -top-1 -right-1 w-16 h-16 pointer-events-none">
                      {/* Geometric Square Angle Marker */}
                      <svg className="w-full h-full text-red-600 overflow-visible" viewBox="0 0 60 60">
                        {/* Red 90-degree square indicator */}
                        <path d="M 32 4 L 56 4 L 56 28" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="square" />
                        <rect x="42" y="4" width="14" height="14" fill="#DC2626" fillOpacity="0.15" stroke="#DC2626" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-none bg-slate-800 text-white font-serif font-black text-[9px] flex items-center justify-center">K</span>
                        <span className="font-extrabold text-[10px] text-slate-800 tracking-wider">KALISSI ARTS</span>
                      </div>
                      <span className="text-[9px] font-black font-mono text-red-700 bg-red-100 px-1.5 py-0.5 rounded-none border border-red-300">
                        ANGLE 90°
                      </span>
                    </div>

                    <div className="text-center py-1">
                      <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide block uppercase">
                        CARTE 350g • COINS DROITS
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block" dir="rtl">
                        زوايا مربعة حادة
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-slate-200 pt-1">
                      <span>Angles vifs 90°</span>
                      <span className="text-slate-700 font-bold">Standard 85×55mm</span>
                    </div>
                  </div>

                  {/* Corner Label Badge */}
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-none">
                    📐 Coins carrément nets
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className={`inline-block w-full py-2 px-3 rounded-xl text-xs font-extrabold transition ${
                    !cardConfig.roundedCorners
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                    {!cardConfig.roundedCorners ? '✓ Option active (Coins droits)' : 'Choisir Coins droits'}
                  </span>
                </div>
              </div>

              {/* Option 2 : Coins Arrondis (Prestige & Modernité — Mis en valeur) */}
              <div
                onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: true }))}
                className={`rounded-2xl border-2 p-5 cursor-pointer transition-all relative flex flex-col justify-between overflow-hidden ${
                  cardConfig.roundedCorners
                    ? 'border-[#16A085] bg-gradient-to-b from-teal-50/70 via-emerald-50/40 to-white shadow-lg ring-3 ring-[#16A085]/25 scale-[1.01]'
                    : 'border-[#16A085]/40 bg-gradient-to-b from-teal-50/30 to-white hover:border-[#16A085] hover:shadow-md'
                }`}
              >
                {/* Highlight Ribbon / Tag */}
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 via-[#16A085] to-emerald-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <span>⭐</span>
                  <span>Option Recommandée • الأكثر طلباً</span>
                </div>

                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3 pt-3 sm:pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      cardConfig.roundedCorners ? 'border-[#16A085] bg-[#16A085]' : 'border-gray-400 bg-white'
                    }`}>
                      {cardConfig.roundedCorners && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-[#16A085] leading-tight flex items-center gap-1.5">
                        <span>Coins arrondis</span>
                        <span className="text-amber-500 text-sm">✨</span>
                      </h3>
                      <span className="text-xs sm:text-sm font-black text-emerald-800 block" dir="rtl">
                        زوايا منحنية دائرية (فخمة)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#16A085] to-emerald-600 px-3 py-1 rounded-lg shadow-xs shrink-0">
                    +{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)}
                  </span>
                </div>

                <p className="text-xs text-gray-700 mb-3 font-medium">
                  Finition haut de gamme aux 4 angles polis et arrondis. Rendu prestige, moderne et résistant aux plis.
                </p>

                {/* Big Visual Mockup: Clearly Rounded Card */}
                <div className="w-full h-44 sm:h-48 bg-gradient-to-b from-teal-100/70 to-emerald-100/80 rounded-2xl border-2 border-teal-200 p-4 relative flex items-center justify-center shadow-inner overflow-hidden my-1">
                  
                  {/* Miniature Physical Card: Prominently Rounded Corners */}
                  <div className="w-64 sm:w-72 h-32 sm:h-36 bg-white border-2 border-[#16A085] rounded-[28px] sm:rounded-[32px] shadow-lg relative flex flex-col justify-between p-3 select-none ring-2 ring-[#16A085]/30">
                    
                    {/* Top Right Curved Radius Focus Callout */}
                    <div className="absolute -top-1 -right-1 w-16 h-16 pointer-events-none">
                      <svg className="w-full h-full text-emerald-600 overflow-visible" viewBox="0 0 60 60">
                        <defs>
                          <marker id="red-arrow-curved" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="#DC2626" />
                          </marker>
                        </defs>
                        {/* Red curved dashed arc following the round contour */}
                        <path d="M 22 4 A 34 34 0 0 1 56 38" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="4 3" />
                        {/* Arrow curving to the arc */}
                        <path d="M 16 36 Q 38 36 48 18" fill="none" stroke="#DC2626" strokeWidth="2.5" markerEnd="url(#red-arrow-curved)" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#16A085] text-white font-serif font-black text-[9px] flex items-center justify-center">K</span>
                        <span className="font-extrabold text-[10px] text-[#16A085] tracking-wider">KALISSI ARTS</span>
                      </div>
                      <span className="text-[9px] font-black font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        ARRONDI DOUX ⌒
                      </span>
                    </div>

                    <div className="text-center py-1">
                      <span className="text-xs sm:text-sm font-black text-[#16A085] tracking-wide block uppercase">
                        CARTE 350g • COINS ARRONDIS
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold block" dir="rtl">
                        زوايا ناعمة منحنية بدقة
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-emerald-700 font-mono border-t border-teal-100 pt-1">
                      <span>Rayon R=6mm courbe</span>
                      <span className="text-[#16A085] font-extrabold">Finition Prestige</span>
                    </div>
                  </div>

                  {/* Corner Label Badge */}
                  <div className="absolute bottom-2 left-2 bg-[#16A085] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <span>✨</span>
                    <span>Angles nettement arrondis</span>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className={`inline-block w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition ${
                    cardConfig.roundedCorners
                      ? 'bg-gradient-to-r from-[#16A085] to-emerald-600 text-white shadow-md shadow-[#16A085]/30'
                      : 'bg-emerald-50 text-[#16A085] hover:bg-emerald-100 border border-emerald-200'
                  }`}>
                    {cardConfig.roundedCorners ? '✓ Option active (Coins arrondis)' : 'Sélectionner Coins arrondis (+500 DA / 1k)'}
                  </span>
                </div>
              </div>

            </div>

            {/* Dynamic Status / Pricing Recap Banner */}
            {cardConfig.roundedCorners ? (
              <div className="p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-[#16A085] rounded-xl text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#16A085] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    ✓
                  </div>
                  <div>
                    <span className="font-black text-gray-900 block sm:inline">
                      Option confirmée : Coins arrondis (زوايا منحنية)
                    </span>
                    <span className="text-xs text-gray-600 sm:ml-2 block sm:inline">
                      — Vos {cardConfig.quantity.toLocaleString('fr-DZ')} cartes bénéficieront de la découpe matricielle arrondie
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right sm:text-left">
                  <span className="font-black text-[#16A085] text-sm sm:text-base font-mono">
                    +{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)}
                  </span>
                  <span className="text-[10px] text-gray-500 block font-normal">
                    (+500 DA par 1 000 cartes)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-none bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    90°
                  </div>
                  <span className="font-semibold">
                    Option standard sélectionnée : Coins droits (Angles 90° carrés inclus sans supplément)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: true }))}
                  className="text-[11px] font-black text-[#16A085] hover:underline self-end sm:self-auto cursor-pointer"
                >
                  Activer Coins arrondis (+{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)}) →
                </button>
              </div>
            )}

            <p className="text-[10px] text-gray-400 italic text-center">
              * Les repères géométriques (90°, arc de cercle) sont présentés à titre indicatif pour illustrer la découpe des bords.
            </p>

          </div>
        </section>

        {/* 6. RÉSUMÉ DU PRIX */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Résumé du prix
          </h2>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Prix des cartes ({cardConfig.quantity.toLocaleString('fr-DZ')} exemplaires) :</span>
              <span className="font-semibold text-gray-900">{formatDA(pricing.cardsBasePrice)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Coins arrondis :</span>
              <span className="font-semibold text-gray-900">
                {cardConfig.roundedCorners ? `+${formatDA(pricing.roundedCornersFee)}` : '0 DA'}
              </span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Support carte offert :</span>
              <span>GRATUIT — مجاني</span>
            </div>

            <div className="flex justify-between items-center text-gray-600">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>Frais de livraison ({customer.wilayaName || 'Alger'} — {customer.deliveryType === 'stopdesk' ? 'Stop Desk' : 'À Domicile'}) :</span>
                <img
                  src="/zr-express-logo.svg"
                  alt="ZR Express"
                  className="h-3 w-auto object-contain inline-block"
                  referrerPolicy="no-referrer"
                />
              </span>
              <span className="font-semibold text-gray-900">{formatDA(pricing.shippingFee)}</span>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-baseline justify-between">
              <div>
                <span className="text-sm font-bold text-gray-900 block">TOTAL À PAYER :</span>
                <span className="text-[10px] text-gray-500">Paiement en espèces lors de la réception</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-gray-900 tracking-tight">
                  {formatDA(pricing.total)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Duplicate Warning Prompt */}
        {duplicateWarning && (
          <div className="p-3.5 rounded bg-amber-50 border border-amber-300 text-amber-900 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Attention : Commande similaire déjà enregistrée</span>
                <p className="text-[11px] text-amber-800 mt-0.5">{duplicateWarning.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                Confirmer quand même
              </button>
            </div>
          </div>
        )}

        {/* Validation Errors Summary Banner */}
        {Object.keys(errors).length > 0 && Object.values(errors).some(Boolean) && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Veuillez corriger les champs requis manquants ou invalides :</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700 pl-1">
              {Object.entries(errors).map(([key, err]) => err ? (
                <li key={key}>{err}</li>
              ) : null)}
            </ul>
          </div>
        )}

        {/* Invisible Anti-bot Honeypot Field */}
        <div className="opacity-0 absolute -z-50 pointer-events-none h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
          <label htmlFor="hp_company_field">Ne pas remplir ce champ</label>
          <input
            type="text"
            id="hp_company_field"
            name="hp_company_field"
            value={hpField}
            onChange={(e) => setHpField(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Cloudflare Turnstile Container (renders if site key is configured) */}
        <div ref={turnstileContainerRef} className="empty:hidden my-2 flex justify-center" />

        {/* 7. CRÉER */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="w-full py-3 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 active:scale-[0.99] text-white font-bold rounded text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Création en cours...</span>
              </>
            ) : (
              <span>Créer la commande — {formatDA(pricing.total)}</span>
            )}
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Non-Business Card Product */}
      {pendingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">
                Confirmer le choix du produit ?
              </h3>
              <p className="text-xs text-gray-600">
                Vous avez choisi : <span className="font-semibold text-[#8C47FF]">{pendingProduct}</span>
              </p>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Le service d'impression par défaut est la Carte de Visite 350g. Souhaitez-vous confirmer ce changement ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancelProduct}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmProduct}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white rounded text-xs font-bold transition cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
