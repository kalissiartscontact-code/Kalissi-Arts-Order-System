import React, { useState } from 'react';
import { Order } from '../types';
import { formatDA } from '../services/pricing';
import { CheckCircle2, Copy, Check, PlusCircle, ArrowLeft } from 'lucide-react';

interface CustomerOrderSuccessViewProps {
  order: Order;
  onNewOrder: () => void;
}

export const CustomerOrderSuccessView: React.FC<CustomerOrderSuccessViewProps> = ({
  order,
  onNewOrder
}) => {
  const [copied, setCopied] = useState(false);

  // Kalissi Arts WhatsApp contact and prefilled message
  const KALISSI_WHATSAPP_NUMBER = '213542728551';
  const whatsappMessage = `السلام عليكم، لقد قمت بإرسال طلب.\nرقم طلبي: ${order.orderCode}`;
  const whatsappUrl = `https://wa.me/${KALISSI_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(order.orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fallback
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8">
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] p-6 sm:p-8 text-gray-800 space-y-6">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight" dir="rtl">
            تم تسجيل طلبك بنجاح!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Votre commande a été enregistrée avec succès — Kalissi Arts
          </p>
        </div>

        {/* WhatsApp Call to Action Box */}
        <div className="bg-gradient-to-b from-emerald-50/90 to-green-50/40 border-2 border-emerald-500 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-xs">
          <div className="inline-block px-3.5 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs">
            الخطوة الأخيرة لإتمام وتأكيد طلبك
          </div>

          <p className="text-base sm:text-lg font-bold text-gray-900" dir="rtl">
            يُرجى إرسال رقم طلبك عبر واتساب حتى نبدأ فوراً في تجهيز طلبيتك:
          </p>

          {/* Large Order Code Display */}
          <div className="bg-white border-2 border-emerald-300 rounded-xl p-4 shadow-inner space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block" dir="rtl">
              رقم طلبك (Numéro de commande)
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-700 select-all">
                {order.orderCode}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                title="نسخ رقم الطلب"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Big Official WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline text-center"
          >
            <span className="text-2xl leading-none">💬</span>
            <span dir="rtl">إرسال رقم الطلب عبر WhatsApp</span>
          </a>

          <p className="text-xs text-emerald-900 font-medium" dir="rtl">
            عند النقر على الزر، سيتم فتح تطبيق واتساب تلقائياً مع كتابة رقم طلبك جاهزاً للإرسال.
          </p>
        </div>

        {/* Order Details Summary */}
        <div className="bg-gray-50/80 rounded-xl p-4 sm:p-5 border border-gray-200 text-sm space-y-2.5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2" dir="rtl">
            ملخص تفاصيل الطلب
          </h2>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-gray-200/60">
            <span className="text-gray-500">الزبون:</span>
            <span className="font-bold text-gray-900">{order.customer.fullName}</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-gray-200/60">
            <span className="text-gray-500">رقم الهاتف:</span>
            <span className="font-mono font-bold text-gray-900">{order.customer.phone}</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-gray-200/60">
            <span className="text-gray-500">الولاية والتوصيل:</span>
            <span className="font-semibold text-gray-900">
              {order.customer.wilayaName} ({order.customer.deliveryType === 'stopdesk' ? 'Stop Desk ZR Express' : 'À Domicile'})
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-gray-200/60">
            <span className="text-gray-500">الكمية:</span>
            <span className="font-bold text-gray-900">{order.cardConfig.quantity} carte(s)</span>
          </div>

          <div className="flex justify-between items-center text-sm sm:text-base pt-2 font-black">
            <span className="text-gray-900">المبلغ الإجمالي عند الاستلام (COD):</span>
            <span className="text-emerald-700 font-mono text-lg">{formatDA(order.pricing.total)}</span>
          </div>
        </div>

        {/* Action: Create another order */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onNewOrder}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-gray-500" />
            <span>طلب جديد (Passer une autre commande)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
