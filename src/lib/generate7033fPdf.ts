import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TissueRow {
  tissue_category: string;
  tissue_type: string;
  timestamp_value: string;
  recovery_technician: string;
}

interface RecoveryData {
  consent_delivery_method: string;
  packaging_deviation: boolean;
  packaging_notes: string;
  heart_request_needed: boolean;
  heart_request_form_completed: boolean;
  form_completed_by: string;
  lemaitre_donor_number: string;
}

interface DonorInfo {
  donor_code: string | null;
  donor_age: number | null;
  gender: string | null;
  death_date: string | null;
  time_of_death: string | null;
  death_type: string | null;
  death_timezone: string | null;
  external_donor_id: string | null;
  partner_name: string | null;
}

const CONSENT_LABELS: Record<string, string> = {
  portal: 'Uploaded in LeMaitre Partner Portal',
  in_shipper: 'In tissue shipper',
  emailed: 'Emailed to TissueIn@lemaitre.com',
};

export function generate7033fPdf(
  donor: DonorInfo,
  recovery: RecoveryData,
  tissues: TissueRow[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  // ---- Header ----
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LeMaitre', marginL, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('\u00AE', marginL + doc.getTextWidth('LeMaitre') + 0.5, y - 2);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const title = '7033F — Tissue Recovery Form — Cardiovascular';
  doc.text(title, pageW - marginR, y, { align: 'right' });
  y += 8;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ---- Top Fields (2-column layout) ----
  const field = (label: string, value: string, x: number, currentY: number, width: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, x, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(value || '—', x, currentY + 4.5);
    // underline
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(x, currentY + 6, x + width, currentY + 6);
  };

  const colW = contentW / 2 - 5;
  field('Recovery Agency Name:', donor.partner_name || '', marginL, y, colW);
  field('Recovery Agency Donor ID #:', donor.external_donor_id || '', marginL + colW + 10, y, colW);
  y += 14;

  field('Donor Age:', donor.donor_age != null ? String(donor.donor_age) : '', marginL, y, colW * 0.4);
  const sexX = marginL + colW * 0.5;
  field('Sex at Birth:', donor.gender || '', sexX, y, colW * 0.5);
  y += 14;

  // Death details row
  const deathDateStr = donor.death_date ? new Date(donor.death_date).toLocaleDateString() : '';
  field('Date of Death*:', deathDateStr, marginL, y, colW * 0.45);
  field('Time:', donor.time_of_death || '', marginL + colW * 0.5, y, colW * 0.3);

  // Death type checkboxes
  const dtX = marginL + contentW * 0.55;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Type:', dtX, y);
  const deathTypes = ['Asystole', 'LTKA', 'Cross Clamp'];
  let cbX = dtX;
  deathTypes.forEach(dt => {
    cbX += 12;
    const checked = donor.death_type?.toLowerCase().includes(dt.toLowerCase());
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(cbX, y - 3, 3, 3);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('✓', cbX + 0.5, y - 0.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(dt, cbX + 4.5, y);
  });
  y += 7;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('*Brain death is not acceptable. Utilize Cross Clamp or Asystolic Date/Time.', marginL, y);
  y += 6;

  // Time zone
  const tzOptions = ['Eastern', 'Central', 'Mountain', 'Pacific', 'Alaska'];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Time Zone:', marginL, y);
  let tzX = marginL + 18;
  tzOptions.forEach(tz => {
    const checked = donor.death_timezone?.toLowerCase().includes(tz.substring(0, 3).toLowerCase());
    doc.setDrawColor(0);
    doc.rect(tzX, y - 3, 3, 3);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('✓', tzX + 0.5, y - 0.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(tz, tzX + 4.5, y);
    tzX += 25;
  });
  y += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('**Warm Ischemic Time shall not exceed accepted parameters, from time of death to wet ice or cold solution.', marginL, y);
  y += 10;

  // ---- Vascular Tissue Table ----
  const vascularTissues = tissues.filter(t => t.tissue_category === 'vascular');
  const allVascularTypes = ['RIGHT Saphenous Vein', 'LEFT Saphenous Vein', 'RIGHT Femoral Vessels', 'LEFT Femoral Vessels'];

  const vascularRows = allVascularTypes.map(type => {
    const match = vascularTissues.find(t => t.tissue_type === type);
    return [
      type,
      match?.timestamp_value ? new Date(match.timestamp_value).toLocaleString() : 'N/A',
      match?.recovery_technician || 'N/A',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [['Recovered Tissue Type', 'Wet Ice Date & Time', 'Recovery Technician(s) Name']],
    body: [
      [{ content: 'Vascular', rowSpan: 4, styles: { fontStyle: 'bold', valign: 'middle' } }, vascularRows[0][0], vascularRows[0][1], vascularRows[0][2]],
      [vascularRows[1][0], vascularRows[1][1], vascularRows[1][2]],
      [vascularRows[2][0], vascularRows[2][1], vascularRows[2][2]],
      [vascularRows[3][0], vascularRows[3][1], vascularRows[3][2]],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 65, 122], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 20 } },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ---- Cardiac Tissue Table ----
  const cardiacTissues = tissues.filter(t => t.tissue_category === 'cardiac');
  const allCardiacTypes = ['Aortoiliac Artery', 'Heart for Valves', 'Other'];

  const cardiacRows = allCardiacTypes.map(type => {
    const match = cardiacTissues.find(t => t.tissue_type === type);
    return [
      type === 'Heart for Valves' ? 'Heart for Valves (MUST complete Path info below**)' : type,
      match?.timestamp_value ? new Date(match.timestamp_value).toLocaleString() : 'N/A',
      match?.recovery_technician || 'N/A',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [['Recovered Tissue Type', 'Cold Solution Date & Time', 'Recovery Technician(s)']],
    body: [
      [{ content: 'Cardiac', rowSpan: 3, styles: { fontStyle: 'bold', valign: 'middle' } }, cardiacRows[0][0], cardiacRows[0][1], cardiacRows[0][2]],
      [cardiacRows[1][0], cardiacRows[1][1], cardiacRows[1][2]],
      [cardiacRows[2][0], cardiacRows[2][1], cardiacRows[2][2]],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 65, 122], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 20 } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ---- Consent Section ----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Donor Consent/Authorization:', marginL, y);
  y += 5;

  const consentOptions = [
    { key: 'portal', label: 'Uploaded in LeMaitre Partner Portal' },
    { key: 'in_shipper', label: 'In tissue shipper' },
    { key: 'emailed', label: 'Emailed to TissueIn@lemaitre.com' },
  ];
  consentOptions.forEach(opt => {
    doc.setDrawColor(0);
    doc.rect(marginL + 2, y - 3, 3, 3);
    if (recovery.consent_delivery_method === opt.key) {
      doc.setFont('helvetica', 'bold');
      doc.text('✓', marginL + 2.5, y - 0.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(opt.label, marginL + 8, y);
    y += 5;
  });
  y += 3;

  // ---- Packaging ----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Any Notes or Deviations about packaging, or shipping?', marginL, y);
  y += 5;
  doc.setDrawColor(0);
  doc.rect(marginL + 2, y - 3, 3, 3);
  if (!recovery.packaging_deviation) {
    doc.text('✓', marginL + 2.5, y - 0.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('No', marginL + 8, y);

  doc.rect(marginL + 22, y - 3, 3, 3);
  if (recovery.packaging_deviation) {
    doc.setFont('helvetica', 'bold');
    doc.text('✓', marginL + 22.5, y - 0.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.text('Yes, explain below.', marginL + 28, y);
  y += 5;

  if (recovery.packaging_deviation && recovery.packaging_notes) {
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(recovery.packaging_notes, contentW - 10);
    doc.text(lines, marginL + 5, y);
    y += lines.length * 4 + 2;
  }
  y += 3;

  // ---- Heart Request ----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('**All Heart for Valve Donors — Any Heart Requests on this donor?', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.rect(marginL + 2, y - 3, 3, 3);
  if (!recovery.heart_request_needed) {
    doc.setFont('helvetica', 'bold');
    doc.text('✓', marginL + 2.5, y - 0.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.text('No requests, LeMaitre hold', marginL + 8, y);

  doc.rect(marginL + 65, y - 3, 3, 3);
  if (recovery.heart_request_needed) {
    doc.setFont('helvetica', 'bold');
    doc.text('✓', marginL + 65.5, y - 0.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.text('Yes, MUST complete Heart Request Form 7117F', marginL + 71, y);
  y += 8;

  // ---- Blood tubes note ----
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('All blood tubes shall be shipped directly to testing lab — do not send to LeMaitre.', marginL, y);
  y += 8;
  doc.setTextColor(0);

  // ---- Footer fields ----
  const footColW = contentW / 2 - 5;
  field('Form Completed By:', recovery.form_completed_by, marginL, y, footColW);
  field('LeMaitre Donor #:', recovery.lemaitre_donor_number || donor.donor_code || '', marginL + footColW + 10, y, footColW);
  y += 12;

  // ---- Form number footer ----
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140);
  doc.text('FORM # 7033F_vs11    Effective 04/16/2025    Page 1 of 1', marginL, doc.internal.pageSize.getHeight() - 10);

  // Save
  const filename = `7033F_${donor.donor_code || 'donor'}.pdf`;
  doc.save(filename);
}
