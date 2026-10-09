import { jsPDF } from 'jspdf';
import { ALGERIAN_WILAYAS } from '../data/wilayas';
import { EXACT_BUSINESS_CARD_PRICES, ROUNDED_CORNERS_RATE_PER_THOUSAND } from '../data/pricing';

export function downloadPricingPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw Header Banner on every page
  const drawBanner = (pageNumber: number, totalPages: number) => {
    // Dark top banner
    doc.setFillColor(24, 24, 27); // Zinc 900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(245, 158, 11); // Amber 500
    doc.text('KALISSI ARTS — GRILLE TARIFAIRE OFFICIELLE', 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Email: KALISSIARTS.SERVICE@GMAIL.COM  |  Tél: +213 660 33 25 39', 14, 16);
    doc.text('Impression Haute Définition & Partenaire Logistique Officiel ZR Express', 14, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11);
    doc.text(`Page ${pageNumber}/${totalPages}`, pageWidth - 14, 16, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setDrawColor(229, 231, 235);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text('Kalissi Arts Algérie — Tarifs contractuels officiels (Cartes de visite & Livraison ZR Express)', 14, pageHeight - 6);
    doc.text('Constantine: 500 DA Domicile / 460 DA Stop Desk', pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const totalPages = 3;

  // ==========================================
  // PAGE 1: CARTES DE VISITE & WILAYAS 01 - 18
  // ==========================================
  drawBanner(1, totalPages);

  // Section 1 Header: Business Card Pricing
  let y = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('1. TARIFS IMPRESSION CARTES DE VISITE (بطاقة زيارة)', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Papier rigide 350g/m² • Pelliculage mat Recto/Verso • Impression Offset Premium', 14, y + 4.5);

  // Business Cards Table Header
  y += 9;
  doc.setFillColor(243, 244, 246);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(14, y, pageWidth - 28, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text('QUANTITÉ (EXEMPLAIRES)', 18, y + 4.2);
  doc.text('PRIX CARTE STANDARD', 90, y + 4.2, { align: 'right' });
  doc.text('OPTION COINS ARRONDIS', 140, y + 4.2, { align: 'right' });
  doc.text('PORTE-CARTES (ÉTUI)', pageWidth - 18, y + 4.2, { align: 'right' });

  // Business Card Rows
  const quantities = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
  y += 6;

  quantities.forEach((qty, idx) => {
    const basePrice = EXACT_BUSINESS_CARD_PRICES[qty] || 0;
    const roundedSupplement = (qty / 1000) * ROUNDED_CORNERS_RATE_PER_THOUSAND;
    const roundedPrice = basePrice + roundedSupplement;

    if (idx % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageWidth - 28, 5.2, 'F');
    }
    doc.setDrawColor(243, 244, 246);
    doc.line(14, y + 5.2, pageWidth - 14, y + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(`${qty.toLocaleString('fr-DZ')} cartes`, 18, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text(`${basePrice.toLocaleString('fr-DZ')} DA`, 90, y + 3.8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(`${roundedPrice.toLocaleString('fr-DZ')} DA (+${roundedSupplement} DA)`, 140, y + 3.8, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text('OFFERT (GRATUIT)', pageWidth - 18, y + 3.8, { align: 'right' });

    y += 5.2;
  });

  // Note Box
  y += 2;
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(14, y, pageWidth - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('• Coins arrondis : +500 DA par tranche de 1 000 cartes.  • Porte-cartes offert gratuitement avec chaque commande.', 17, y + 5);

  // Section 2: Delivery Fees (Wilayas 01 to 16 on Page 1)
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('2. TARIFS DE LIVRAISON ZR EXPRESS — 58 WILAYAS (Dinar Algérien - DA)', 14, y);

  y += 5;
  // Delivery Table Header
  const drawDeliveryTableHeader = (currentY: number) => {
    doc.setFillColor(243, 244, 246);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(14, currentY, pageWidth - 28, 6, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text('N°', 18, currentY + 4.2);
    doc.text('WILAYA DESTINATION', 32, currentY + 4.2);
    doc.text('À DOMICILE', 110, currentY + 4.2, { align: 'right' });
    doc.text('STOP DESK (BUREAU ZR)', 155, currentY + 4.2, { align: 'right' });
    doc.text('RETOUR', pageWidth - 18, currentY + 4.2, { align: 'right' });
  };

  drawDeliveryTableHeader(y);
  y += 6;

  const page1Wilayas = ALGERIAN_WILAYAS.slice(0, 16);
  page1Wilayas.forEach((w, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageWidth - 28, 5.8, 'F');
    }
    doc.setDrawColor(243, 244, 246);
    doc.line(14, y + 5.8, pageWidth - 14, y + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(w.code, 18, y + 4.1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(w.name, 32, y + 4.1);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(`${w.homeDeliveryFee.toLocaleString('fr-FR')} DA`, 110, y + 4.1, { align: 'right' });
    doc.text(`${w.stopdeskDeliveryFee.toLocaleString('fr-FR')} DA`, 155, y + 4.1, { align: 'right' });

    const retour = (w.code === '11' || w.code === '53' || w.code === '54') ? '250 DA' : '200 DA';
    doc.text(retour, pageWidth - 18, y + 4.1, { align: 'right' });

    y += 5.8;
  });

  drawFooter();

  // ==========================================
  // PAGE 2: WILAYAS 17 - 38
  // ==========================================
  doc.addPage();
  drawBanner(2, totalPages);

  y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('TARIFS DE LIVRAISON ZR EXPRESS — WILAYAS 17 À 38', 14, y);

  y += 5;
  drawDeliveryTableHeader(y);
  y += 6;

  const page2Wilayas = ALGERIAN_WILAYAS.slice(16, 38);
  page2Wilayas.forEach((w, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageWidth - 28, 5.8, 'F');
    }
    doc.setDrawColor(243, 244, 246);
    doc.line(14, y + 5.8, pageWidth - 14, y + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(w.code, 18, y + 4.1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(w.name, 32, y + 4.1);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(`${w.homeDeliveryFee.toLocaleString('fr-FR')} DA`, 110, y + 4.1, { align: 'right' });
    doc.text(`${w.stopdeskDeliveryFee.toLocaleString('fr-FR')} DA`, 155, y + 4.1, { align: 'right' });

    const retour = (w.code === '11' || w.code === '53' || w.code === '54') ? '250 DA' : '200 DA';
    doc.text(retour, pageWidth - 18, y + 4.1, { align: 'right' });

    y += 5.8;
  });

  drawFooter();

  // ==========================================
  // PAGE 3: WILAYAS 39 - 58
  // ==========================================
  doc.addPage();
  drawBanner(3, totalPages);

  y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('TARIFS DE LIVRAISON ZR EXPRESS — WILAYAS 39 À 58', 14, y);

  y += 5;
  drawDeliveryTableHeader(y);
  y += 6;

  const page3Wilayas = ALGERIAN_WILAYAS.slice(38);
  page3Wilayas.forEach((w, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y, pageWidth - 28, 5.8, 'F');
    }
    doc.setDrawColor(243, 244, 246);
    doc.line(14, y + 5.8, pageWidth - 14, y + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(w.code, 18, y + 4.1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(w.name, 32, y + 4.1);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(`${w.homeDeliveryFee.toLocaleString('fr-FR')} DA`, 110, y + 4.1, { align: 'right' });
    doc.text(`${w.stopdeskDeliveryFee.toLocaleString('fr-FR')} DA`, 155, y + 4.1, { align: 'right' });

    const retour = (w.code === '11' || w.code === '53' || w.code === '54') ? '250 DA' : '200 DA';
    doc.text(retour, pageWidth - 18, y + 4.1, { align: 'right' });

    y += 5.8;
  });

  drawFooter();

  doc.save('Tarifs_Officiels_Kalissi_Arts_ZR_Express.pdf');
}
