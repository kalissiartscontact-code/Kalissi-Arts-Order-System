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
            src="/photo-de-page.jpg"
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
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1.5 border-b border-gray-100">
            Options de finition
          </h2>

          <div className="space-y-3">
            
            {/* Distinctive Option Card with French & Arabic */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                cardConfig.roundedCorners
                  ? 'bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border-[#8C47FF] shadow-xs'
                  : 'bg-white border-purple-200/90 hover:border-purple-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                      Coins arrondis
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#8C47FF]" dir="rtl">
                      • زوايا منحنية
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[#8C47FF] bg-purple-100/90 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Finition payante optionnelle
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Découpe soignée aux 4 angles arrondis pour un rendu moderne et élégant (+500 DA / 1 000 cartes).
                  </p>
                </div>

                {/* Segmented Choice: Non (Default) vs Oui */}
                <div className="flex items-center gap-1.5 shrink-0 bg-gray-100/90 p-1 rounded-lg border border-gray-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: false }))}
                    className={`px-3.5 py-2 rounded-md font-bold transition cursor-pointer ${
                      !cardConfig.roundedCorners
                        ? 'bg-white text-gray-900 shadow-xs border border-gray-300/80'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Non (+0 DA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: true }))}
                    className={`px-3.5 py-2 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      cardConfig.roundedCorners
                        ? 'bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] text-white shadow-xs'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <span>Oui (+{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Demonstration of Corner Cutting */}
            <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">
                  Présentation visuelle de la découpe :
                </span>
                <span className="text-[11px] text-gray-500">
                  Cliquez sur un modèle pour choisir
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Modèle 1 : Carte Coins droits (90°) */}
                <div
                  onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: false }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    !cardConfig.roundedCorners
                      ? 'border-[#8C47FF] bg-gradient-to-b from-purple-50/60 to-white text-gray-950 ring-2 ring-[#8C47FF]/20 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        !cardConfig.roundedCorners ? 'border-[#8C47FF]' : 'border-gray-400'
                      }`}>
                        {!cardConfig.roundedCorners && (
                          <span className="w-2 h-2 rounded-full bg-[#8C47FF]" />
                        )}
                      </span>
                      <span className="font-extrabold text-gray-900 text-xs sm:text-sm">
                        Coins droits • زوايا قائمة
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      Inclus (+0 DA)
                    </span>
                  </div>

                  {/* Visual Demonstration Card: Straight 90° with red arrow and "90°" label */}
                  <div className="w-full h-32 sm:h-36 bg-white border-2 border-slate-700 rounded-none relative shadow-sm my-2 flex items-center justify-center overflow-hidden">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest select-none">
                      Carte 350g — Angles 90°
                    </span>

                    {/* Explanatory Red Overlay with Arrow & 90° label */}
                    <svg className="absolute top-0 right-0 w-28 h-28 pointer-events-none overflow-visible" viewBox="0 0 100 100">
                      <defs>
                        <marker id="red-arrow-straight" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                          <polygon points="0 0, 6 3, 0 6" fill="#DC2626" />
                        </marker>
                      </defs>
                      {/* 90° Corner square marker */}
                      <path d="M 70 8 L 94 8 L 94 32" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                      {/* Red straight arrow pointing directly to the 90° apex */}
                      <line x1="38" y1="64" x2="88" y2="14" stroke="#DC2626" strokeWidth="2.5" markerEnd="url(#red-arrow-straight)" />
                      {/* "90°" Label beside the arrow */}
                      <text x="20" y="82" fill="#DC2626" fontWeight="900" fontSize="16" fontFamily="sans-serif">90°</text>
                    </svg>
                  </div>

                  <p className="text-[11px] text-gray-500 text-center">
                    Coins carrés vifs standards (format classique sans supplément)
                  </p>
                </div>

                {/* Modèle 2 : Carte Coins arrondis (زوايا منحنية) */}
                <div
                  onClick={() => setCardConfig(prev => ({ ...prev, roundedCorners: true }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                    cardConfig.roundedCorners
                      ? 'border-[#8C47FF] bg-gradient-to-b from-purple-50/80 to-white text-gray-950 ring-2 ring-[#8C47FF]/30 shadow-md'
                      : 'border-purple-200/80 bg-purple-50/20 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        cardConfig.roundedCorners ? 'border-[#8C47FF]' : 'border-gray-400'
                      }`}>
                        {cardConfig.roundedCorners && (
                          <span className="w-2 h-2 rounded-full bg-[#8C47FF]" />
                        )}
                      </span>
                      <span className="font-extrabold text-[#8C47FF] text-xs sm:text-sm">
                        Coins arrondis • زوايا منحنية
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] px-2 py-0.5 rounded shadow-2xs">
                      +{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)}
                    </span>
                  </div>

                  {/* Visual Demonstration Card: Smoothly rounded corners with red curved arrow */}
                  <div className="w-full h-32 sm:h-36 bg-white border-2 border-[#8C47FF] rounded-2xl relative shadow-sm my-2 flex items-center justify-center overflow-hidden">
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest select-none">
                      Carte 350g — Coins Arrondis
                    </span>

                    {/* Explanatory Red Overlay with Curved Arrow & Arc */}
                    <svg className="absolute top-0 right-0 w-28 h-28 pointer-events-none overflow-visible" viewBox="0 0 100 100">
                      <defs>
                        <marker id="red-arrow-curved" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                          <polygon points="0 0, 6 3, 0 6" fill="#DC2626" />
                        </marker>
                      </defs>
                      {/* Red dashed arc tracing the rounded corner curvature */}
                      <path d="M 64 6 A 22 22 0 0 1 94 36" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeDasharray="3 3" />
                      {/* Red curved arrow pointing directly to the rounded corner contour */}
                      <path d="M 34 66 Q 66 66 78 30" fill="none" stroke="#DC2626" strokeWidth="2.5" markerEnd="url(#red-arrow-curved)" />
                      {/* Red text label beside curved arrow */}
                      <text x="10" y="84" fill="#DC2626" fontWeight="900" fontSize="13" fontFamily="sans-serif">Arrondi</text>
                    </svg>
                  </div>

                  <p className="text-[11px] text-[#8C47FF] font-medium text-center">
                    Angles polis et arrondis par découpe spécifique (+500 DA / 1 000 cartes)
                  </p>
                </div>

              </div>

              {/* Dynamic Price Display */}
              {cardConfig.roundedCorners ? (
                <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8C47FF] shrink-0" />
                    <span className="font-bold text-purple-950">
                      Option active : Coins arrondis (زوايا منحنية)
                    </span>
                  </div>
                  <span className="font-extrabold text-[#8C47FF] text-xs sm:text-sm">
                    +{formatDA(Math.round((cardConfig.quantity || 1000) / 1000) * 500)} pour vos {cardConfig.quantity.toLocaleString('fr-DZ')} cartes (+500 DA / 1 000 cartes)
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Option standard sélectionnée : Coins droits (Angles 90° inclus)</span>
                  <span className="text-gray-500 font-semibold">+500 DA / 1 000 cartes si activé</span>
                </div>
              )}

              {/* Red arrow UI disclaimer */}
              <p className="text-[10px] text-gray-400 italic text-center">
                * Les flèches rouges et annotations (90°, Arrondi) sont des repères visuels explicatifs de l'interface et ne figurent pas sur l'impression finale de vos cartes de visite.
              </p>

            </div>
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
