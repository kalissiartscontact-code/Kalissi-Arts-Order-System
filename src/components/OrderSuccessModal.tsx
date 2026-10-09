import React, { useState } from 'react';
import { Order } from '../types';
import { formatDA } from '../services/pricing';
import {
  CheckCircle,
  CheckCircle2,
  Truck,
  Printer,
  PlusCircle,
  Copy,
  Check
} from 'lucide-react';

interface OrderSuccessModalProps {
  order: Order;
  channel?: 'whatsapp' | 'messenger' | null;
  onClose: () => void;
  onNewOrder: () => void;
  onTrackOrder?: (code: string, token: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  channel,
  onClose,
  onNewOrder,
  onTrackOrder
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active channel: link parameter takes priority, falls back to whatsapp (default behavior)
  const activeChannel: 'whatsapp' | 'messenger' = order.channel || channel || 'whatsapp';
  const isMessenger = activeChannel === 'messenger';

  // Kalissi Arts WhatsApp Click-to-Chat
  const KALISSI_WHATSAPP_NUMBER = '213542728551';
  const whatsappMessage = `السلام عليكم، لقد قمت بإرسال طلب.\nرقم طلبي: ${order.orderCode}`;
  const whatsappUrl = `https://wa.me/${KALISSI_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  // Kalissi Arts Messenger Link
  const KALISSI_MESSENGER_URL = (import.meta.env.VITE_KALISSI_MESSENGER_URL as string) || 'https://m.me/kalissiarts';

  const trackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?track=${order.orderCode}&token=${order.orderToken}${activeChannel ? `&channel=${activeChannel}` : ''}`
    : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.orderCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (trackUrl) {
      navigator.clipboard.writeText(trackUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-4 my-6 text-gray-800">
        
        {/* Header Success */}
        <div className="text-center space-y-2 pb-3 border-b border-gray-100">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-8 h-8" />
          </div>
          
          {/* MAIN TITLE — LARGE */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight" dir="rtl">
            تم تسجيل طلبك بنجاح
          </h1>
          <p className="text-xs text-gray-500">
            Commande enregistrée avec succès — Kalissi Arts
          </p>
        </div>

        {/* CRITICAL CONFIRMATION SECTION (CHANNEL SPECIFIC: WHATSAPP OR MESSENGER) */}
        <div
          className={`border-2 rounded-xl p-4 sm:p-5 text-center space-y-3.5 shadow-sm ${
            isMessenger
              ? 'bg-gradient-to-b from-blue-50/90 to-sky-50/40 border-blue-500'
              : 'bg-gradient-to-b from-emerald-50/90 to-green-50/40 border-emerald-500'
          }`}
        >
          {/* Step Title: الخطوة الأخيرة لإتمام طلبك */}
          <div className="space-y-1">
            <div
              className={`inline-block px-3 py-1 text-white rounded-full text-xs font-bold shadow-xs ${
                isMessenger ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              الخطوة الأخيرة لإتمام طلبك
            </div>
            <p className="text-base sm:text-lg font-bold text-gray-900 pt-1 leading-snug" dir="rtl">
              {isMessenger
                ? 'يجب عليك إرسال رقم طلبك عبر Messenger حتى نتمكن من تأكيد طلبك.'
                : 'يجب عليك إرسال رقم طلبك عبر واتساب حتى نتمكن من تأكيد طلبك.'}
            </p>
          </div>

          {/* DISPLAY THE ORDER CODE VERY LARGE */}
          <div
            className={`bg-white border-2 rounded-xl p-3 sm:p-4 shadow-xs space-y-1 ${
              isMessenger ? 'border-blue-400' : 'border-emerald-400'
            }`}
          >
            <span className="text-xs font-bold text-gray-600 uppercase block tracking-wider" dir="rtl">
              رقم طلبك
            </span>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`font-mono text-3xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text select-all ${
                  isMessenger
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-800'
                    : 'bg-gradient-to-r from-emerald-700 to-teal-800'
                }`}
              >
                {order.orderCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                title="نسخ رقم الطلب"
              >
                {copiedCode ? (
                  <Check className={`w-4 h-4 ${isMessenger ? 'text-blue-600' : 'text-emerald-600'}`} />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* LARGE CHANNEL ACTION BUTTON */}
          <div className="pt-1">
            {isMessenger ? (
              /* Messenger Button */
              <a
                href={KALISSI_MESSENGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(order.orderCode);
                  } catch (e) {}
                }}
                className="w-full py-3.5 px-4 bg-[#0084FF] hover:bg-[#0073e6] active:scale-[0.99] text-white rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline"
              >
                <span className="text-2xl leading-none">💬</span>
                <span>إرسال رقم الطلب عبر Messenger</span>
              </a>
            ) : (
              /* WhatsApp Button */
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer no-underline"
              >
                <span className="text-2xl leading-none">💬</span>
                <span>إرسال رقم الطلب عبر واتساب</span>
              </a>
            )}

            {/* Small text below Action button */}
            <p
              className={`text-xs font-semibold mt-2 ${
                isMessenger ? 'text-blue-900' : 'text-emerald-900'
              }`}
              dir="rtl"
            >
              {isMessenger
                ? 'اضغط على الزر، ثم أرسل رقم الطلب داخل Messenger.'
                : 'اضغط على الزر، ثم اضغط على إرسال داخل واتساب.'}
            </p>

            {/* French text below Arabic in smaller text */}
            <p className="text-[11px] text-gray-600 mt-1.5 italic">
              {isMessenger
                ? 'Pour finaliser votre commande, veuillez envoyer votre numéro de commande via Messenger.'
                : 'Pour finaliser votre commande, veuillez envoyer votre numéro de commande via WhatsApp.'}
            </p>
          </div>

        </div>

        {/* Secure tracking link for customer */}
        {order.orderToken && (
          <div className="bg-purple-50/60 p-2.5 rounded-lg border border-purple-200/80 text-left flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-[#8C47FF] block">
                Lien sécurisé de suivi personnel
              </span>
              <span className="text-[11px] text-gray-600 truncate block font-mono">
                {trackUrl}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded bg-white border border-purple-300 text-[#8C47FF] hover:bg-purple-50 transition flex items-center space-x-1 text-xs shrink-0 font-medium cursor-pointer"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Copié !' : 'Copier lien'}</span>
            </button>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Destinataire :</span>
            <span className="text-gray-900 font-medium">{order.customer.fullName}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Téléphone :</span>
            <span className="font-mono text-gray-900">{order.customer.phone}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Mode de livraison :</span>
            <span className="font-medium text-gray-900">
              {order.customer.deliveryType === 'stopdesk' ? 'Stop Desk ZR Express' : 'À Domicile'}
            </span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Destination :</span>
            <span className="text-gray-900 text-right max-w-[200px] truncate">
              {order.customer.deliveryType === 'stopdesk'
                ? order.customer.zrStopDesk
                : `${order.customer.commune} - ${order.customer.address}`}
            </span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Produit & Quantité :</span>
            <span className="text-gray-900">
              {order.cardConfig.quantity.toLocaleString('fr-DZ')} cartes ({order.cardConfig.roundedCorners ? 'Coins arrondis' : 'Coins droits'})
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-bold text-sm">
            <span className="text-gray-900">TOTAL À PAYER (COD) :</span>
            <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8C47FF] to-[#49DBFF]">
              {formatDA(order.pricing.total)}
            </span>
          </div>
        </div>

        {/* Status of Integrations */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center space-x-1.5 text-gray-600 mb-0.5">
              <img
                src="/zr-express-logo.svg"
                alt="ZR Express"
                className="h-3.5 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="font-semibold text-[11px]">ZR Express</span>
            </div>
            <span className="text-[10px] text-gray-700 block truncate">
              {order.zrExpress?.trackingNumber
                ? `Suivi: ${order.zrExpress.trackingNumber}`
                : order.zrExpress?.status === 'failed'
                ? 'Tentative envoyée'
                : 'En attente'}
            </span>
          </div>

          <div className="p-2 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center space-x-1.5 text-gray-600 mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-[11px]">Enregistrement</span>
            </div>
            <span className="text-[10px] text-gray-700 block truncate">
              Commande confirmée & archivée
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          {onTrackOrder && order.orderToken ? (
            <button
              type="button"
              onClick={() => onTrackOrder(order.orderCode, order.orderToken)}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#8C47FF] border border-purple-200 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Suivre ma commande</span>
            </button>
          ) : <div />}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={onNewOrder}
              className="px-4 py-2 bg-gradient-to-r from-[#8C47FF] to-[#49DBFF] hover:opacity-95 text-white rounded text-xs font-bold flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouvelle commande</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
