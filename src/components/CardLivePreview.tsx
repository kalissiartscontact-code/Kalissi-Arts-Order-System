import React, { useState } from 'react';
import { CardOrderConfig, PricingBreakdown } from '../types';
import { formatDA } from '../services/pricing';
import { CreditCard, Sparkles, Gift, ShieldCheck, Check, Layers, RotateCw } from 'lucide-react';

interface CardLivePreviewProps {
  cardConfig: CardOrderConfig;
  pricing: PricingBreakdown;
  customerName?: string;
  customerPhone?: string;
}

export const CardLivePreview: React.FC<CardLivePreviewProps> = ({
  cardConfig,
  pricing,
  customerName,
  customerPhone
}) => {
  const [activeSide, setActiveSide] = useState<'recto' | 'verso'>('recto');

  const displayName = customerName?.trim() || "VOTRE NOM & PRÉNOM";
  const displayPhone = customerPhone?.trim() || "05XX XX XX XX";
  const displayActivity = cardConfig.cardActivity?.trim() || "Activité / Profession / Entreprise";
  const thousands = Math.round((cardConfig.quantity || 1000) / 1000);

  return (
    <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="font-serif text-lg font-bold text-amber-100">
              Aperçu en Direct • بطاقة زيارة
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Format standard 8.5 × 5.4 cm • Papier couché mat 350g haute tenue
          </p>
        </div>

        {/* Flip Card Button */}
        <button
          type="button"
          onClick={() => setActiveSide(activeSide === 'recto' ? 'verso' : 'recto')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs bg-stone-800 hover:bg-stone-750 text-amber-300 border border-stone-700 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{activeSide === 'recto' ? 'Voir Verso' : 'Voir Recto'}</span>
        </button>
      </div>

      {/* Realistic 3D Business Card Presentation Stage */}
      <div className="my-6 min-h-[260px] sm:min-h-[290px] flex flex-col items-center justify-center relative">
        
        {/* Glow backdrop */}
        <div className="absolute w-72 h-44 bg-gradient-to-tr from-amber-500/15 via-yellow-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Shadow stack under cards (volume effect) */}
        <div className="relative">
          {thousands > 1 && (
            <div className={`absolute -bottom-2.5 left-2 right-2 h-full bg-stone-800/70 border border-stone-750 shadow-md ${
              cardConfig.roundedCorners ? 'rounded-2xl' : 'rounded-sm'
            }`} />
          )}
          {thousands > 3 && (
            <div className={`absolute -bottom-5 left-4 right-4 h-full bg-stone-850/60 border border-stone-800 shadow-sm ${
              cardConfig.roundedCorners ? 'rounded-2xl' : 'rounded-sm'
            }`} />
          )}

          {/* Master Business Card */}
          <div
            className={`w-[320px] sm:w-[360px] h-[195px] sm:h-[215px] p-6 transition-all duration-500 relative flex flex-col justify-between shadow-2xl cursor-pointer select-none ${
              cardConfig.roundedCorners ? 'rounded-2xl border-2' : 'rounded-none border'
            } ${
              activeSide === 'recto'
                ? 'bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-stone-100 border-amber-500/40 shadow-amber-950/40'
                : 'bg-gradient-to-br from-stone-950 via-neutral-900 to-black text-amber-100 border-stone-700 shadow-black'
            }`}
            onClick={() => setActiveSide(activeSide === 'recto' ? 'verso' : 'recto')}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
            }}
          >
            {/* Subtle texture shimmer */}
            <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />

            {/* Corner style badge */}
            <div className="absolute top-3 right-3">
              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-mono font-bold ${
                cardConfig.roundedCorners
                  ? 'bg-amber-400 text-stone-950 shadow'
                  : 'bg-stone-800 text-stone-300 border border-stone-700'
              }`}>
                {cardConfig.roundedCorners ? 'Coins Arrondis' : 'Coins Droits'}
              </span>
            </div>

            {activeSide === 'recto' ? (
              <>
                {/* Recto Top: Brand Mark */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-serif font-black text-sm shadow">
                    K
                  </div>
                  <div>
                    <span className="font-serif font-bold text-xs tracking-wider text-amber-200">
                      KALISSI ARTS
                    </span>
                    <span className="text-[9px] text-stone-400 block tracking-widest uppercase">
                      Impression Haute Précision
                    </span>
                  </div>
                </div>

                {/* Recto Middle: Customer Info */}
                <div className="my-auto py-2">
                  <h4 className="font-serif text-base sm:text-lg font-bold text-stone-100 tracking-wide uppercase line-clamp-1">
                    {displayName}
                  </h4>
                  <p className="text-[11px] text-amber-400 font-medium tracking-wider mt-0.5 line-clamp-1">
                    {displayActivity}
                  </p>
                </div>

                {/* Recto Bottom: Contact line */}
                <div className="flex items-center justify-between text-[11px] text-stone-300 border-t border-stone-800 pt-2 font-mono">
                  <span>Tél : {displayPhone}</span>
                  <span className="text-[10px] text-stone-400">Algerie 350g/m²</span>
                </div>
              </>
            ) : (
              /* Verso */
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-serif font-bold text-xl shadow">
                  KA
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-amber-200 uppercase tracking-widest">
                    {displayName}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-serif">
                    بطاقة عمل احترافية • طباعة أوفست عالية الجودة
                  </p>
                </div>
                <div className="text-[10px] text-stone-400 font-mono pt-1">
                  {displayPhone}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quantity Stack Tag */}
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-xs bg-stone-950 text-amber-300 font-mono px-3 py-1 rounded-full border border-amber-500/30 shadow">
            Tirage de {pricing.quantity.toLocaleString('fr-DZ')} cartes
          </span>
          {cardConfig.roundedCorners && (
            <span className="text-xs bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-500/30">
              Finition coins arrondis (+{formatDA(pricing.roundedCornersFee)})
            </span>
          )}
        </div>

      </div>

      {/* Free Gift Cardholder Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-yellow-500/15 border border-amber-500/30 flex items-center space-x-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow">
          <Gift className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-amber-200">
              Support carte offert • حامل بطاقات هدية
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase font-bold">
              GRATUIT — مجاني
            </span>
          </div>
          <p className="text-[11px] text-stone-300 mt-0.5">
            Étui pratique antichoc pour transporter et distribuer vos cartes de visite.
          </p>
        </div>
      </div>

      {/* Price Summary Breakdown Footer */}
      <div className="pt-3 border-t border-stone-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Prix des cartes ({pricing.quantity.toLocaleString('fr-DZ')} ex) :</span>
          <span className="font-semibold text-stone-200">
            {pricing.isPricePendingSheets && pricing.cardsBasePrice === 0
              ? 'Tarif Google Sheets PRICING'
              : formatDA(pricing.cardsBasePrice)}
          </span>
        </div>

        {cardConfig.roundedCorners && (
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Finition Coins Arrondis (+500 DA / 1000) :</span>
            <span>+{formatDA(pricing.roundedCornersFee)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Support carte offert (حامل بطاقات هدية) :</span>
          <span className="text-emerald-400 font-medium">GRATUIT — مجاني</span>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Frais de livraison ZR Express :</span>
          <span>{pricing.shippingFee > 0 ? formatDA(pricing.shippingFee) : 'Calculé selon Wilaya'}</span>
        </div>

        <div className="pt-2 border-t border-stone-800 flex items-baseline justify-between">
          <div>
            <span className="text-xs text-stone-300 font-semibold block">TOTAL ESTIMÉ À PAYER :</span>
            <span className="text-[10px] text-stone-400">Paiement à la livraison après inspection</span>
          </div>
          <span className="font-serif text-2xl font-bold text-amber-300">
            {pricing.isPricePendingSheets && pricing.cardsBasePrice === 0
              ? 'En attente PRICING'
              : formatDA(pricing.total)}
          </span>
        </div>
      </div>

    </div>
  );
};
