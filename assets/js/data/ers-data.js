// Export Readiness Score (ERS) assessment definition.
// Mirrors the scoring rules enforced server-side in ErsServiceImpl (feed backend) —
// question ids and point weights must stay in sync with MAX_POINTS there.

export const sections = [
  {
    id: 'legal',
    name: 'Legal & Compliance',
    subtitle: 'Regulatory baseline',
    max: 20,
    color: '#378ADD',
    iconBg: '#E6F1FB',
    iconColor: '#185FA5',
    icon: 'landmark',
    questions: [
      {
        id: 'iec', weight: 8, label: 'IEC Registration Status',
        hint: 'Import Export Code from DGFT — mandatory for all export transactions',
        options: [
          { value: 8, text: 'Active IEC with digital signature & updated bank details' },
          { value: 5, text: 'IEC obtained but not updated in last 2 years' },
          { value: 2, text: 'IEC application in process (fee paid, awaiting issue)' },
          { value: 0, text: 'No IEC, not started' },
        ],
      },
      {
        id: 'gst', weight: 6, label: 'GST & LUT Filing Compliance',
        hint: 'LUT (Letter of Undertaking) enables zero-rated exports without upfront IGST payment',
        options: [
          { value: 6, text: 'Active GST, LUT filed for current FY, regular returns filed' },
          { value: 4, text: 'GST active, LUT not yet filed this year' },
          { value: 2, text: 'GST registered, pending return backlogs' },
          { value: 0, text: 'Not GST registered / composition scheme' },
        ],
      },
      {
        id: 'entity', weight: 6, label: 'Entity & Bank Account Structure',
        hint: 'Export proceeds must flow through an authorised dealer (AD) category bank account',
        options: [
          { value: 6, text: 'Registered entity (FPC/company/society) with separate current account linked to IEC' },
          { value: 4, text: 'Registered entity, but using savings/shared account' },
          { value: 2, text: "Informal group, bank account in individual's name" },
          { value: 0, text: 'No formal registration' },
        ],
      },
    ],
  },
  {
    id: 'certification',
    name: 'Product Certification',
    subtitle: 'Market access credentials',
    max: 20,
    color: '#1D9E75',
    iconBg: '#E1F5EE',
    iconColor: '#0F6E56',
    icon: 'award',
    questions: [
      {
        id: 'fssai', weight: 6, label: 'FSSAI & APEDA Registration',
        hint: 'FSSAI export licence + APEDA registration required for food/agri exports',
        options: [
          { value: 6, text: 'Both FSSAI export licence + APEDA/MPEDA registration active' },
          { value: 4, text: 'FSSAI only (no APEDA)' },
          { value: 2, text: 'FSSAI basic/state licence, not export-grade' },
          { value: 0, text: 'No FSSAI licence' },
        ],
      },
      {
        id: 'orgcert', weight: 8, label: 'Organic / Specialty Market Certifications',
        hint: 'NPOP (India Organic), NOP (USDA), EU Organic, Fairtrade, Rainforest Alliance, GI tag, etc.',
        options: [
          { value: 8, text: '2+ valid certifications aligned to target market' },
          { value: 5, text: '1 valid certification, transition period for second' },
          { value: 2, text: 'In conversion period (organic transition, 1–2 yr remaining)' },
          { value: 0, text: 'No certifications / conventional only' },
        ],
      },
      {
        id: 'testing', weight: 6, label: 'Lab Testing & MRL Compliance',
        hint: 'Maximum Residue Levels differ by destination — EU/Japan standards are stricter than Codex',
        options: [
          { value: 6, text: 'Regular testing (every lot) at NABL/APEDA empanelled lab; MRL compliant for target market' },
          { value: 3, text: 'Occasional testing, not every shipment' },
          { value: 1, text: 'Never tested / only domestic-standard testing' },
          { value: 0, text: 'No testing done' },
        ],
      },
    ],
  },
  {
    id: 'packaging',
    name: 'Packaging & Labelling',
    subtitle: 'Shelf & customs compliance',
    max: 15,
    color: '#7F77DD',
    iconBg: '#EEEDFE',
    iconColor: '#534AB7',
    icon: 'package',
    questions: [
      {
        id: 'pkglabel', weight: 6, label: 'Destination-Compliant Labelling',
        hint: 'Country of origin, nutrition facts, allergen declaration, local language requirements (Arabic, French, etc.)',
        options: [
          { value: 6, text: 'Labels reviewed by an import agent / legal counsel in destination country; all mandatory fields present' },
          { value: 4, text: 'Labels self-checked against guidelines, not independently verified' },
          { value: 2, text: 'Standard Indian retail label — not adapted for export' },
          { value: 0, text: 'No export-specific labelling' },
        ],
      },
      {
        id: 'pkgmaterial', weight: 5, label: 'Packaging Material & Shelf Life',
        hint: 'Food-grade materials, ISPM-15 for wood packaging, moisture-proof for long sea transit',
        options: [
          { value: 5, text: 'Export-grade material (food-grade, fumigated), shelf life >12 months or ≥3× transit time' },
          { value: 3, text: 'Food-grade but standard domestic packaging, shelf life 6–12 months' },
          { value: 1, text: 'Basic retail packaging, shelf life <6 months' },
          { value: 0, text: 'Bulk / unpackaged / jute sacks only' },
        ],
      },
      {
        id: 'barcode', weight: 4, label: 'Barcode & Traceability',
        hint: 'GS1 barcode required by most organized retail globally; lot-level traceability for recall management',
        options: [
          { value: 4, text: 'GS1 India barcode registered & lot traceability system in place' },
          { value: 2, text: 'Barcode exists but internal/non-GS1' },
          { value: 0, text: 'No barcode / no traceability' },
        ],
      },
    ],
  },
  {
    id: 'production',
    name: 'Production & Supply Reliability',
    subtitle: 'Volume & consistency',
    max: 15,
    color: '#639922',
    iconBg: '#EAF3DE',
    iconColor: '#3B6D11',
    icon: 'sprout',
    questions: [
      {
        id: 'volume', weight: 6, label: 'Minimum Export Lot Capability',
        hint: 'One FCL (Full Container Load) ≈ 20 MT for agri commodities. Buyers rarely accept <5 MT per shipment',
        options: [
          { value: 6, text: 'Can reliably supply >20 MT per consignment (1 FCL+)' },
          { value: 4, text: '5–20 MT per consignment (LCL shipments)' },
          { value: 2, text: '1–5 MT (only air/courier exports viable)' },
          { value: 0, text: '<1 MT / production not consolidated' },
        ],
      },
      {
        id: 'consistency', weight: 5, label: 'Supply Consistency & Farmer Aggregation',
        hint: 'Number of farmer members supplying to the FPO/SHG; long-term procurement contracts with farmers',
        options: [
          { value: 5, text: '300+ farmer members, written procurement agreements, 3+ seasons of consistent supply track record' },
          { value: 3, text: '100–300 farmers, informal procurement, 1–2 seasons' },
          { value: 1, text: '<100 farmers, spot buying, no track record' },
          { value: 0, text: 'Single-farm / no aggregation' },
        ],
      },
      {
        id: 'storage', weight: 4, label: 'Post-Harvest & Storage Infrastructure',
        hint: 'Cold chain, grading/sorting machines, primary processing (cleaning, drying, milling)',
        options: [
          { value: 4, text: 'Owned/leased cold storage + grading line + primary processing' },
          { value: 2, text: 'Access to common cold storage, manual grading' },
          { value: 1, text: 'Dry warehouse only' },
          { value: 0, text: 'No storage/processing infrastructure' },
        ],
      },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Capacity',
    subtitle: 'Working capital & risk buffer',
    max: 15,
    color: '#BA7517',
    iconBg: '#FAEEDA',
    iconColor: '#854F0B',
    icon: 'rupee',
    questions: [
      {
        id: 'wcap', weight: 6, label: 'Working Capital for Export Cycle',
        hint: 'Export payment cycle (LC/TT) = 30–90 days. Need capital to procure, pack, ship, and wait for payment',
        options: [
          { value: 6, text: 'Export credit facility (pre-shipment PCFC/EPC) from bank + own funds covering ≥3 months of projected export turnover' },
          { value: 4, text: 'Own funds sufficient for 1–2 months; no bank export credit yet' },
          { value: 2, text: 'Working capital only for first small shipment (<₹10L); no credit line' },
          { value: 0, text: 'No earmarked working capital for exports' },
        ],
      },
      {
        id: 'ecgc', weight: 5, label: 'Export Credit & Risk Insurance',
        hint: 'ECGC cover protects against buyer default & political risk; mandatory for bank export financing',
        options: [
          { value: 5, text: 'ECGC policy active + cargo insurance for each shipment' },
          { value: 3, text: 'Cargo insurance only, no ECGC' },
          { value: 1, text: 'Aware of ECGC, not enrolled' },
          { value: 0, text: 'No insurance of any kind' },
        ],
      },
      {
        id: 'accounts', weight: 4, label: 'Audited Accounts & Credit History',
        hint: 'Buyers & banks require 2–3 years of audited financials; CIBIL/credit score matters for export finance',
        options: [
          { value: 4, text: '3 years of CA-audited accounts + positive credit score (700+)' },
          { value: 2, text: '1–2 years audited, credit score not checked' },
          { value: 1, text: 'Internal accounts only, no audit' },
          { value: 0, text: 'No financial records / accounts' },
        ],
      },
    ],
  },
  {
    id: 'market',
    name: 'Market Linkage & Buyer Access',
    subtitle: 'Demand-side readiness',
    max: 10,
    color: '#D85A30',
    iconBg: '#FAECE7',
    iconColor: '#993C1D',
    icon: 'globe',
    questions: [
      {
        id: 'buyer', weight: 6, label: 'Buyer Relationship & LOI / Trial Orders',
        hint: 'Letter of Intent / confirmed trial order from overseas buyer is the strongest signal of readiness',
        options: [
          { value: 6, text: 'Confirmed purchase order or LOI from a verified overseas buyer' },
          { value: 4, text: 'Active buyer negotiations, samples sent and approved' },
          { value: 2, text: 'Attended 1+ trade fair / buyer-seller meet; leads in pipeline' },
          { value: 0, text: 'No buyer contact; looking to start' },
        ],
      },
      {
        id: 'pricing', weight: 4, label: 'Export Pricing Knowledge',
        hint: 'Can you calculate FOB/CIF price including packaging, freight, agent commission, and your margin?',
        options: [
          { value: 4, text: 'Full cost sheet calculated (FOB/CIF), benchmarked against competitor export prices' },
          { value: 2, text: 'Rough estimate, not documented' },
          { value: 0, text: 'No idea of export pricing' },
        ],
      },
    ],
  },
  {
    id: 'docs',
    name: 'Documentation & Human Capital',
    subtitle: 'Operational execution',
    max: 5,
    color: '#888780',
    iconBg: '#F1EFE8',
    iconColor: '#5F5E5A',
    icon: 'file',
    questions: [
      {
        id: 'docs', weight: 3, label: 'Export Document Preparedness',
        hint: 'Commercial invoice, packing list, certificate of origin, phytosanitary cert, SB (shipping bill) — can you prepare these?',
        options: [
          { value: 3, text: 'In-house team or dedicated CHA/freight forwarder experienced in all standard export docs' },
          { value: 2, text: 'Know the documents; rely on CHA but understand each' },
          { value: 1, text: 'Aware of documents; no CHA relationship yet' },
          { value: 0, text: 'No knowledge of export documentation' },
        ],
      },
      {
        id: 'training', weight: 2, label: 'Team Export Training',
        hint: 'IIFT/FIEO/APEDA training programmes; at least 1 team member with formal export trade knowledge',
        options: [
          { value: 2, text: '1+ team member completed a formal export management training (IIFT, FIEO, APEDA, etc.)' },
          { value: 1, text: 'Online/informal self-study; no certified training' },
          { value: 0, text: 'No training in the team' },
        ],
      },
    ],
  },
];

export const gapData = {
  iec: { label: 'IEC Registration', critical: true, action: 'Apply at DGFT portal (dgft.gov.in). Cost: ₹500. Time: 1–2 working days.' },
  gst: { label: 'GST / LUT Filing', critical: true, action: 'File LUT on GST portal before first export shipment. File pending returns to clear backlogs.' },
  entity: { label: 'Entity & Bank Account', critical: true, action: 'Register as FPC/society; open current account with AD-category bank linked to IEC.' },
  fssai: { label: 'FSSAI Export Licence', critical: true, action: 'Upgrade to FSSAI Central licence for export. Register with APEDA at apeda.gov.in.' },
  orgcert: { label: 'Organic / Specialty Certification', critical: false, action: 'Contact accredited certification body (NCOF, IMO, Control Union). Budget ₹60K–₹1.5L/year.' },
  testing: { label: 'Lab Testing & MRL Compliance', critical: true, action: 'Empanel with NABL-accredited lab. Test every lot before shipment. Review MRL database for target country.' },
  pkglabel: { label: 'Export-Compliant Labelling', critical: true, action: 'Engage destination-country import agent or legal firm to review labels. Fix mandatory fields.' },
  pkgmaterial: { label: 'Export Packaging Material', critical: false, action: 'Switch to food-grade, moisture-proof packaging. Get ISPM-15 fumigation certificate for wood.' },
  barcode: { label: 'GS1 Barcode & Traceability', critical: false, action: 'Register at gs1india.org (₹6,000–₹12,000/year). Implement lot-wise tracking ledger.' },
  volume: { label: 'Export Volume Capability', critical: false, action: 'Aggregate with neighbouring FPOs or consolidate with APEDA/state agri board to achieve FCL quantity.' },
  consistency: { label: 'Farmer Aggregation & Supply', critical: false, action: 'Formalise procurement contracts with farmer members. Target 300+ enrolled suppliers.' },
  storage: { label: 'Post-Harvest Infrastructure', critical: false, action: 'Apply for MIDH/APEDA cold chain subsidy (35–50% capital subsidy). Link with WDFC cold chain parks.' },
  wcap: { label: 'Working Capital for Export', critical: true, action: 'Apply for PCFC (Pre-Shipment Credit in Foreign Currency) at your bank. Explore NABARD FPO finance window.' },
  ecgc: { label: 'ECGC Export Credit Insurance', critical: false, action: 'Enrol at ecgc.in. Small Exporter Policy starts at ~₹3,000/year for up to ₹50L cover.' },
  accounts: { label: 'Audited Accounts', critical: false, action: 'Engage CA immediately for pending audits. Pull CIBIL report and resolve any defaults.' },
  buyer: { label: 'Buyer Linkage', critical: true, action: 'Register on IndiaMART/TradeIndia, participate in APEDA buyer-seller meets, attend India Trade Promotion Organisation (ITPO) fairs.' },
  pricing: { label: 'Export Pricing / Cost Sheet', critical: false, action: 'Build FOB/CIF cost sheet: farm gate + processing + packaging + inland freight + port charges + agent commission + margin.' },
  docs: { label: 'Export Documentation', critical: false, action: 'Empanel a Licensed Customs House Agent (CHA). Get familiar with ICEGATE for shipping bill filing.' },
  training: { label: 'Team Export Training', critical: false, action: "Enrol team in FIEO's Basic Export Management Certificate or APEDA's export orientation programme (free/subsidised)." },
};

// Flat lookup of every question, and its parent section, keyed by question id.
export const questionIndex = sections.reduce((acc, section) => {
  section.questions.forEach(q => { acc[q.id] = { ...q, section }; });
  return acc;
}, {});

export const maxMap = Object.fromEntries(Object.values(questionIndex).map(q => [q.id, q.weight]));

export const TOTAL_MAX = sections.reduce((sum, s) => sum + s.max, 0);
export const PASS_THRESHOLD = 70;

export function scoreSections(answers) {
  return sections.map(s => {
    const raw = s.questions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
    return { ...s, raw, pct: Math.round((raw / s.max) * 100) };
  });
}

export function computeGaps(answers) {
  const gaps = [];
  sections.forEach(s => {
    s.questions.forEach(q => {
      const score = answers[q.id] || 0;
      if (score < q.weight) {
        const pctQ = score / q.weight;
        const severity = pctQ === 0 && gapData[q.id].critical ? 'critical' : pctQ < 0.5 ? 'moderate' : 'minor';
        gaps.push({ id: q.id, severity, pctQ, label: gapData[q.id].label, action: gapData[q.id].action });
      }
    });
  });
  return gaps.sort((a, b) => a.pctQ - b.pctQ);
}

export function getTier(pct) {
  if (pct >= 80) return { tier: 'Export Ready', desc: 'You meet most criteria. Focus on minor gaps before first shipment.', color: '#1D9E75' };
  if (pct >= 60) return { tier: 'Nearly Ready', desc: 'Strong foundation. Address the moderate gaps — most can be resolved in 3–6 months.', color: '#639922' };
  if (pct >= 40) return { tier: 'Developing', desc: 'Key building blocks present. Resolve critical gaps before approaching buyers.', color: '#BA7517' };
  if (pct >= 20) return { tier: 'Early Stage', desc: 'Foundational work needed. Use this gap list as a 12-month preparation roadmap.', color: '#D85A30' };
  return { tier: 'Not Yet Ready', desc: 'Start with registration and legal compliance first. Export is 12–18 months away.', color: '#E24B4A' };
}
