import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface ConfirmOrderPageProps {
  onBackToHome?: () => void;
}

export const ConfirmOrderPage: React.FC<ConfirmOrderPageProps> = ({ onBackToHome }) => {
  const [orderCodeInput, setOrderCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'already_confirmed' | 'error'>('idle');
  const [responseMessage, setResponseMessage] = useState('');
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string>('');

  // Prefill order number from query string if available (?order=... or ?code=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const codeFromUrl = params.get('order') || params.get('code') || '';
        if (codeFromUrl.trim()) {
          setOrderCodeInput(codeFromUrl.trim());
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = orderCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setStatus('error');
      setResponseMessage('يرجى إدخال رقم الطلب الخاص بك.');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setResponseMessage('');

    try {
      const res = await fetch('/api/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: cleanCode })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setConfirmedCode(cleanCode);
        setConfirmedDate(data.confirmedAt || new Date().toISOString());
        setResponseMessage(data.message || 'تم تأكيد طلبك بنجاح! شكراً لثقتكم.');
      } else if (res.status === 409 || data.alreadyConfirmed) {
        // Order was already confirmed before -> REJECT
        setStatus('already_confirmed');
        setConfirmedCode(cleanCode);
        setConfirmedDate(data.confirmedAt || null);
        setResponseMessage(
          data.message || 'عذراً، هذا الطلب تم تأكيده من قبل ولا يمكن تأكيده مرة أخرى.'
        );
      } else {
        setStatus('error');
        setResponseMessage(data.message || 'حدث خطأ أثناء تأكيد الطلب. يرجى التحقق من الرقم والمحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error('Erreur confirmation commande:', err);
      setStatus('error');
      setResponseMessage('تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setOrderCodeInput('');
    setResponseMessage('');
    setConfirmedDate(null);
    setConfirmedCode('');
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8">
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] p-6 sm:p-8 text-gray-800">
        
        {/* Brand Header */}
        <div className="text-center pb-6 border-b border-gray-100 flex flex-col items-center">
          <img
            src="/photo-de-page.png"
            alt="Kalissi Arts Logo"
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-400/60 shadow-md mb-3"
          />
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight" dir="rtl">
            تأكيد الطلب
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Confirmation de commande — Kalissi Arts
          </p>
        </div>

        {/* State: IDLE or ERROR (Form) */}
        {(status === 'idle' || status === 'error') && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-center">
              <p className="text-xs sm:text-sm text-amber-900 font-medium" dir="rtl">
                يرجى إدخال رقم الطلب الخاص بك الممنوح لك لتأكيد طلبيتك نهائياً.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Veuillez saisir votre numéro de commande pour valider définitivement votre commande.
              </p>
            </div>

            {status === 'error' && responseMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs sm:text-sm animate-shake">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span dir="rtl">{responseMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="order-code-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider text-right" dir="rtl">
                رقم الطلب (Numéro de commande) *
              </label>
              <div className="relative">
                <input
                  id="order-code-input"
                  type="text"
                  value={orderCodeInput}
                  onChange={(e) => setOrderCodeInput(e.target.value)}
                  placeholder="ex: ABC12345 أو ORD-XXXXXX"
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50/80 border-2 border-gray-200 rounded-xl text-base font-mono text-center tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                رقم الطلب يتكون من الرمز الممنوح لك عند التسجيل
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !orderCodeInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق والتأكيد...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-base" dir="rtl">تأكيد الطلب الآن</span>
                </>
              )}
            </button>

            {onBackToHome && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="text-xs text-gray-500 hover:text-gray-800 underline transition cursor-pointer"
                >
                  العودة إلى الصفحة الرئيسية (Accueil)
                </button>
              </div>
            )}
          </form>
        )}

        {/* State: SUCCESS */}
        {status === 'success' && (
          <div className="mt-6 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-gray-900" dir="rtl">
                تم تأكيد طلبك بنجاح!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-700 font-semibold" dir="rtl">
                شكراً لثقتكم في Kalissi Arts.
              </p>
              <p className="text-xs text-gray-500">
                Votre commande a été confirmée avec succès.
              </p>
            </div>

            {/* Order details box */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-center space-y-1.5">
              <p className="text-xs text-emerald-800 font-medium">رقم الطلب المؤكد:</p>
              <div className="text-lg font-black font-mono tracking-widest text-emerald-950 bg-white py-1 px-3 rounded-lg border border-emerald-200 inline-block">
                {confirmedCode}
              </div>
              {confirmedDate && (
                <p className="text-[11px] text-emerald-600">
                  تاريخ التأكيد: {formatDate(confirmedDate)}
                </p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-600 text-center" dir="rtl">
              🚚 طلبك الآن قيد المعالجة والتجهيز وسيتم شحنه في أقرب وقت عبر <strong>ZR Express</strong> والدفع عند الاستلام.
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                تأكيد طلب آخر
              </button>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>الصفحة الرئيسية</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* State: ALREADY CONFIRMED (REJECTED) */}
        {status === 'already_confirmed' && (
          <div className="mt-6 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-red-700" dir="rtl">
                هذا الطلب تم تأكيده من قبل!
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 font-medium" dir="rtl">
                تم رفض إعادة التأكيد لأن هذا الطلب قد تم تأكيده مسبقاً.
              </p>
              <p className="text-xs text-gray-500">
                Cette commande a déjà été confirmée auparavant.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
              <p className="text-xs text-red-800 font-medium">رقم الطلب الذي تم إدخاله:</p>
              <div className="text-base font-black font-mono tracking-wider text-red-950 bg-white py-1 px-3 rounded-lg border border-red-200 inline-block">
                {confirmedCode}
              </div>
              {confirmedDate && (
                <p className="text-[11px] text-red-700">
                  تم تأكيده بتاريخ: {formatDate(confirmedDate)}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2" dir="rtl">
                ✅ لا داعي للقلق، طلبك محفوظ في النظام ويتم التجهيز للشحن عبر ZR Express.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                إدخال رقم طلب آخر
              </button>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  العودة للرئيسية
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
