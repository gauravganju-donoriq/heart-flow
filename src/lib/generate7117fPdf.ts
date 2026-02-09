import jsPDF from 'jspdf';

interface HeartRequestData {
  request_type: string;
  circumstances_of_death: string;
  me_coroner_name: string;
  me_institution: string;
  me_address: string;
  me_city_state_zip: string;
  me_telephone: string;
  height_method: string;
  weight_method: string;
  consented_for_research: boolean;
  return_heart: boolean;
  histologic_slides_requested: boolean;
  form_completed_by: string;
  form_completed_date: string;
}

interface DonorInfo {
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  donor_age?: number | null;
  height_inches?: number | null;
  weight_kgs?: number | null;
  cause_of_death?: string | null;
  external_donor_id?: string | null;
  din?: string | null;
  partner_name?: string | null;
}

export function generate7117fPdf(donor: DonorInfo, form: HeartRequestData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LeMaitre', marginL, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('\u00AE', marginL + doc.getTextWidth('LeMaitre') + 0.5, y - 2);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Heart Request Form', pageW - marginR, y, { align: 'right' });
  y += 6;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('Any updates or changes MUST be submitted through LeMaitre Partner Portal and/or Pathology@LeMaitre.com', marginL, y);
  y += 4;
  doc.text('LeMaitre will hold all hearts received without completed requests for 90 days.', marginL, y);
  y += 6;
  doc.setTextColor(0);

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // Helper
  const field = (label: string, value: string, x: number, currentY: number, width: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, x, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(value || '—', x, currentY + 4.5);
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(x, currentY + 6, x + width, currentY + 6);
  };

  const checkbox = (label: string, checked: boolean, x: number, currentY: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, currentY - 3, 3, 3);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('✓', x + 0.5, currentY - 0.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.text(label, x + 5, currentY);
  };

  const colW = contentW / 2 - 5;

  // Request type
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Heart Request (indicate ONE):', marginL, y);
  y += 6;
  checkbox('Pathology Provided by LeMaitre', form.request_type === 'pathology', marginL + 2, y);
  y += 5;
  checkbox('NO Pathology, Heart Return Only', form.request_type === 'heart_return_only', marginL + 2, y);
  y += 10;

  // Decedent info
  const fullName = [donor.first_name, donor.last_name].filter(Boolean).join(' ');
  field("Decedent's full name:", fullName, marginL, y, contentW);
  y += 14;

  field('Sex at birth:', donor.gender || '', marginL, y, colW * 0.4);
  field('Age:', donor.donor_age != null ? String(donor.donor_age) : '', marginL + colW * 0.5, y, colW * 0.3);
  y += 14;

  // Height with method
  const heightStr = donor.height_inches != null ? `${donor.height_inches} in` : '';
  field('Height:', heightStr, marginL, y, colW * 0.4);
  const methods = ['Estimated', 'Measured', 'Reported'];
  let mX = marginL + colW * 0.5;
  methods.forEach(m => {
    checkbox(m, form.height_method === m.toLowerCase(), mX, y + 4);
    mX += 25;
  });
  y += 14;

  // Weight with method
  const weightStr = donor.weight_kgs != null ? `${donor.weight_kgs} kg` : '';
  field('Weight:', weightStr, marginL, y, colW * 0.4);
  mX = marginL + colW * 0.5;
  methods.forEach(m => {
    checkbox(m, form.weight_method === m.toLowerCase(), mX, y + 4);
    mX += 25;
  });
  y += 14;

  // Cause of death
  field('Preliminary Cause of Death:', donor.cause_of_death || '', marginL, y, contentW);
  y += 14;

  // Circumstances
  field('Circumstances of Death:', form.circumstances_of_death || '', marginL, y, contentW);
  y += 14;

  // ME/Coroner
  field('Medical Examiner/Coroner Name:', form.me_coroner_name || '', marginL, y, contentW);
  y += 14;
  field('Institution:', form.me_institution || '', marginL, y, colW);
  field('Telephone:', form.me_telephone || '', marginL + colW + 10, y, colW);
  y += 14;
  field('Address:', form.me_address || '', marginL, y, contentW);
  y += 14;
  field('City, State, ZIP:', form.me_city_state_zip || '', marginL, y, contentW);
  y += 14;

  // Recovery agency
  field('Recovery Agency:', donor.partner_name || '', marginL, y, colW);
  field('Recovery Donor ID:', donor.external_donor_id || '', marginL + colW + 10, y, colW);
  y += 14;

  // Consent for research
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Donor Consented for Research:', marginL, y);
  checkbox('YES', form.consented_for_research, marginL + 55, y);
  checkbox('NO', !form.consented_for_research, marginL + 75, y);
  y += 8;

  // Return heart
  doc.text('RETURN HEART:', marginL, y);
  checkbox('YES', form.return_heart, marginL + 55, y);
  checkbox('NO', !form.return_heart, marginL + 75, y);

  // LeMaitre address
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('LeMaitre', marginL + 110, y - 4);
  doc.text('912 NW Hwy', marginL + 110, y);
  doc.text('Fox River Grove, IL 60024', marginL + 110, y + 4);
  doc.text('PH: 847-462-2191', marginL + 110, y + 8);
  doc.setTextColor(0);
  y += 12;

  // Slides
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTOLOGIC SLIDES REQUESTED:', marginL, y);
  checkbox('YES', form.histologic_slides_requested, marginL + 55, y);
  checkbox('NO', !form.histologic_slides_requested, marginL + 75, y);
  y += 10;

  // Footer fields
  field('FORM COMPLETED BY:', form.form_completed_by || '', marginL, y, colW);
  field('Date:', form.form_completed_date || '', marginL + colW + 10, y, colW);
  y += 14;

  field('LeMaitre Donor # (DIN):', donor.din || '', marginL, y, contentW);
  y += 10;

  // Form footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140);
  doc.text('Form#7117F_vs3    Effective 04/16/2025    Page 1 of 1', marginL, doc.internal.pageSize.getHeight() - 10);

  const filename = `7117F_${donor.din || 'donor'}.pdf`;
  doc.save(filename);
}
