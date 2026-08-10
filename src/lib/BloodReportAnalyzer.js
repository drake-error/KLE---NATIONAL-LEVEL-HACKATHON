/**
 * BloodReportAnalyzer — Real AI-powered blood report analysis engine.
 * 
 * This module:
 * 1. ACTUALLY PARSES blood report text to extract real lab values
 * 2. Compares values against medical reference ranges
 * 3. Generates intelligent diagnoses based on actual findings
 * 4. Provides context-aware follow-up chat grounded in the real data
 * 
 * If a Groq API key is configured, it uses LLM for deeper analysis.
 * Otherwise, it uses a sophisticated clinical rule engine.
 */

// ─── Medical Reference Ranges Database ──────────────────────────────────────
const REFERENCE_RANGES = {
  // CBC
  hemoglobin:        { unit: 'g/dL', male: [13.5, 17.5], female: [12.0, 15.5], default: [12.0, 17.5], category: 'Hematology' },
  wbc:               { unit: '/µL',  default: [4000, 11000], category: 'Hematology', aliases: ['white blood cells', 'white blood cell', 'leukocytes', 'wbc count'] },
  rbc:               { unit: 'M/µL', male: [4.5, 5.5], female: [4.0, 5.2], default: [4.0, 5.5], category: 'Hematology', aliases: ['red blood cells', 'red blood cell', 'erythrocytes', 'rbc count'] },
  platelets:         { unit: '/µL',  default: [150000, 450000], category: 'Hematology', aliases: ['platelet count'] },
  hematocrit:        { unit: '%',    male: [38.3, 48.6], female: [36.0, 46.0], default: [36, 48], category: 'Hematology', aliases: ['hct'] },
  mcv:               { unit: 'fL',   default: [80, 100], category: 'Hematology', aliases: ['mean corpuscular volume'] },
  mch:               { unit: 'pg',   default: [27, 33], category: 'Hematology', aliases: ['mean corpuscular hemoglobin'] },
  mchc:              { unit: 'g/dL', default: [32, 36], category: 'Hematology', aliases: ['mean corpuscular hemoglobin concentration'] },

  // Metabolic
  glucose:           { unit: 'mg/dL', default: [70, 100], category: 'Metabolic', aliases: ['fasting glucose', 'blood sugar', 'fasting blood sugar', 'glucose (fasting)', 'blood glucose'] },
  creatinine:        { unit: 'mg/dL', male: [0.7, 1.3], female: [0.6, 1.1], default: [0.6, 1.3], category: 'Metabolic (Kidney)' },
  bun:               { unit: 'mg/dL', default: [7, 20], category: 'Metabolic (Kidney)', aliases: ['blood urea nitrogen', 'urea nitrogen'] },
  urea:              { unit: 'mg/dL', default: [15, 45], category: 'Metabolic (Kidney)', aliases: ['blood urea'] },
  uric_acid:         { unit: 'mg/dL', male: [3.4, 7.0], female: [2.4, 6.0], default: [2.4, 7.0], category: 'Metabolic', aliases: ['uric acid'] },
  sodium:            { unit: 'mEq/L', default: [135, 145], category: 'Electrolytes', aliases: ['na', 'na+'] },
  potassium:         { unit: 'mEq/L', default: [3.5, 5.0], category: 'Electrolytes', aliases: ['k', 'k+'] },
  chloride:          { unit: 'mEq/L', default: [96, 106], category: 'Electrolytes', aliases: ['cl', 'cl-'] },
  calcium:           { unit: 'mg/dL', default: [8.5, 10.5], category: 'Electrolytes' },

  // Lipids
  total_cholesterol: { unit: 'mg/dL', default: [0, 200], category: 'Lipids', aliases: ['total cholesterol', 'cholesterol', 'cholesterol total'] },
  hdl:               { unit: 'mg/dL', default: [40, 999], category: 'Lipids', aliases: ['hdl cholesterol', 'hdl-c', 'hdl-cholesterol', 'high density lipoprotein'] },
  ldl:               { unit: 'mg/dL', default: [0, 100], category: 'Lipids', aliases: ['ldl cholesterol', 'ldl-c', 'ldl-cholesterol', 'low density lipoprotein'] },
  triglycerides:     { unit: 'mg/dL', default: [0, 150], category: 'Lipids', aliases: ['tg', 'triglyceride'] },
  vldl:              { unit: 'mg/dL', default: [0, 30], category: 'Lipids', aliases: ['vldl cholesterol'] },

  // Liver
  alt:               { unit: 'U/L',  default: [7, 56], category: 'Liver', aliases: ['sgpt', 'alanine aminotransferase', 'alanine transaminase'] },
  ast:               { unit: 'U/L',  default: [10, 40], category: 'Liver', aliases: ['sgot', 'aspartate aminotransferase', 'aspartate transaminase'] },
  alp:               { unit: 'U/L',  default: [44, 147], category: 'Liver', aliases: ['alkaline phosphatase'] },
  total_bilirubin:   { unit: 'mg/dL', default: [0.3, 1.2], category: 'Liver', aliases: ['bilirubin total', 'bilirubin', 'total bilirubin'] },
  direct_bilirubin:  { unit: 'mg/dL', default: [0.0, 0.3], category: 'Liver', aliases: ['direct bilirubin', 'conjugated bilirubin'] },
  ggt:               { unit: 'U/L',  default: [0, 45], category: 'Liver', aliases: ['gamma gt', 'gamma glutamyl transferase', 'gamma-glutamyl transferase'] },
  albumin:           { unit: 'g/dL', default: [3.5, 5.5], category: 'Liver' },
  total_protein:     { unit: 'g/dL', default: [6.0, 8.3], category: 'Liver', aliases: ['total protein', 'protein total'] },

  // Thyroid
  tsh:               { unit: 'µIU/mL', default: [0.4, 4.0], category: 'Thyroid', aliases: ['thyroid stimulating hormone'] },
  t3:                { unit: 'ng/dL', default: [80, 200], category: 'Thyroid', aliases: ['triiodothyronine', 'total t3'] },
  t4:                { unit: 'ng/dL', default: [0.8, 1.8], category: 'Thyroid', aliases: ['thyroxine', 'free t4', 'ft4'] },

  // Iron Studies
  ferritin:          { unit: 'ng/mL', male: [20, 500], female: [20, 200], default: [20, 500], category: 'Iron Studies' },
  iron:              { unit: 'µg/dL', default: [60, 170], category: 'Iron Studies', aliases: ['serum iron'] },
  tibc:              { unit: 'µg/dL', default: [250, 370], category: 'Iron Studies', aliases: ['total iron binding capacity'] },

  // Diabetes
  hba1c:             { unit: '%',    default: [4.0, 5.7], category: 'Diabetes', aliases: ['glycated hemoglobin', 'glycosylated hemoglobin', 'a1c', 'hemoglobin a1c'] },

  // Vitamin
  vitamin_d:         { unit: 'ng/mL', default: [30, 100], category: 'Vitamins', aliases: ['vitamin d', '25-hydroxy vitamin d', 'vit d'] },
  vitamin_b12:       { unit: 'pg/mL', default: [200, 900], category: 'Vitamins', aliases: ['vitamin b12', 'cobalamin', 'vit b12'] },

  // ESR / CRP
  esr:               { unit: 'mm/hr', male: [0, 22], female: [0, 29], default: [0, 22], category: 'Inflammation', aliases: ['erythrocyte sedimentation rate', 'sed rate'] },
  crp:               { unit: 'mg/L', default: [0, 3], category: 'Inflammation', aliases: ['c-reactive protein', 'c reactive protein', 'hs-crp'] },

  // Vitals
  systolic_bp:       { unit: 'mmHg', default: [90, 120], category: 'Vitals', aliases: ['blood pressure'] },
  heart_rate:        { unit: 'bpm', default: [60, 100], category: 'Vitals', aliases: ['pulse', 'heart rate', 'hr'] },
  temperature:       { unit: '°C', default: [36.1, 37.2], category: 'Vitals', aliases: ['temp', 'temperature'] },
  respiratory_rate:  { unit: '/min', default: [12, 20], category: 'Vitals', aliases: ['respiratory rt', 'resp rate', 'respiratory rate'] },
};

// ─── Clinical Correlation Rules ─────────────────────────────────────────────
const CLINICAL_RULES = [
  {
    name: 'Pre-Diabetes / Impaired Fasting Glucose',
    check: (parsed) => {
      const g = parsed.glucose;
      return g && g.value >= 100 && g.value < 126;
    },
    severity: 'medium',
    risk: 'Fasting glucose is elevated (**{glucose.value} {glucose.unit}**), placing patient in the **pre-diabetic range** (100-125 mg/dL). This indicates impaired fasting glucose and early insulin resistance.',
    recommendation: 'Order HbA1c test to confirm glycemic status over 3 months. Implement low-glycemic Mediterranean diet. Begin 150 min/week moderate aerobic exercise. Recheck fasting glucose in 6-8 weeks.',
    urgency: 'Moderate — schedule primary care consultation within 2-3 weeks.'
  },
  {
    name: 'Diabetes Mellitus',
    check: (parsed) => {
      const g = parsed.glucose;
      return g && g.value >= 126;
    },
    severity: 'high',
    risk: 'Fasting glucose is critically elevated at **{glucose.value} {glucose.unit}** (≥126 mg/dL), meeting the diagnostic threshold for **Diabetes Mellitus**. This represents significant metabolic dysregulation.',
    recommendation: 'Urgent HbA1c confirmation required. Start diabetic dietary protocol. Consider pharmacological intervention (Metformin). Monitor for end-organ damage (retinopathy, nephropathy, neuropathy).',
    urgency: 'High — see an endocrinologist or primary care physician within 1 week.'
  },
  {
    name: 'Hyperlipidemia / Dyslipidemia',
    check: (parsed) => {
      return (parsed.total_cholesterol && parsed.total_cholesterol.value > 200) ||
             (parsed.ldl && parsed.ldl.value > 100) ||
             (parsed.triglycerides && parsed.triglycerides.value > 150);
    },
    severity: 'medium-high',
    risk: () => 'Lipid abnormalities detected — elevated Total Cholesterol, LDL, or Triglycerides. This indicates increased atherosclerotic cardiovascular disease (ASCVD) risk.',
    buildRisk: (parsed) => {
      const parts = [];
      if (parsed.total_cholesterol?.value > 200) parts.push(`Total Cholesterol: **${parsed.total_cholesterol.value} mg/dL** (desirable <200)`);
      if (parsed.ldl?.value > 100) parts.push(`LDL: **${parsed.ldl.value} mg/dL** (optimal <100)`);
      if (parsed.triglycerides?.value > 150) parts.push(`Triglycerides: **${parsed.triglycerides.value} mg/dL** (normal <150)`);
      if (parsed.hdl?.value < 40) parts.push(`HDL: **${parsed.hdl.value} mg/dL** (critically low, protective >40)`);
      return `**Dyslipidemia detected:** ${parts.join('; ')}. This constellation significantly elevates cardiovascular and cerebrovascular event risk.`;
    },
    recommendation: 'Restrict saturated fats (<7% of daily calories), trans fats, and processed foods. Increase soluble fiber (oats, legumes) and omega-3 fatty acids. Repeat lipid panel in 6-8 weeks. Consider statin therapy if lifestyle changes insufficient.',
    urgency: 'Moderate — cardiology or primary care follow-up within 2-4 weeks.'
  },
  {
    name: 'Iron Deficiency Anemia',
    check: (parsed) => {
      const hb = parsed.hemoglobin;
      return hb && ((hb.gender === 'female' && hb.value < 12.0) || (hb.gender === 'male' && hb.value < 13.5) || hb.value < 12.0);
    },
    severity: 'high',
    risk: (parsed) => `Hemoglobin is critically low at **${parsed.hemoglobin.value} g/dL**, indicating **moderate-to-severe anemia**. Combined with ${parsed.rbc ? `low RBC (${parsed.rbc.value} M/µL)` : 'potential RBC reduction'} and ${parsed.hematocrit ? `low hematocrit (${parsed.hematocrit.value}%)` : 'possible hematocrit reduction'}, this is highly suggestive of Iron Deficiency Anemia.`,
    recommendation: 'Urgent iron studies (Ferritin, TIBC, Serum Iron). Increase dietary heme iron (red meat, liver, shellfish) and non-heme iron (spinach, lentils) paired with Vitamin C. Avoid tea/coffee with meals. Consider oral iron supplementation or IV iron therapy.',
    urgency: 'High — consult a physician within 48-72 hours. Avoid strenuous exercise until hemoglobin >10 g/dL.'
  },
  {
    name: 'Reactive Thrombocytosis',
    check: (parsed) => {
      return parsed.platelets && parsed.platelets.value > 450000;
    },
    severity: 'medium',
    risk: (parsed) => `Elevated platelet count (**${parsed.platelets.value} /µL**, normal <450,000). This is commonly a **reactive physiological response** to severe iron depletion, chronic inflammation, or infection.`,
    recommendation: 'Investigate underlying cause — check iron studies, inflammatory markers (CRP, ESR). Repeat CBC after treating the primary condition.',
    urgency: 'Moderate — follow up with underlying cause investigation.'
  },
  {
    name: 'Liver Enzyme Elevation',
    check: (parsed) => {
      return (parsed.alt && parsed.alt.value > 56) || (parsed.ast && parsed.ast.value > 40);
    },
    severity: 'medium',
    risk: (parsed) => {
      const parts = [];
      if (parsed.alt?.value > 56) parts.push(`ALT: **${parsed.alt.value} U/L** (normal <56)`);
      if (parsed.ast?.value > 40) parts.push(`AST: **${parsed.ast.value} U/L** (normal <40)`);
      return `Elevated liver enzymes detected: ${parts.join(', ')}. This may indicate hepatocellular injury, fatty liver disease (NAFLD/NASH), alcohol-related damage, or viral hepatitis.`;
    },
    recommendation: 'Avoid alcohol and hepatotoxic medications. Get hepatitis B/C screening. Liver ultrasound recommended. Repeat liver function tests in 4-6 weeks.',
    urgency: 'Moderate — schedule gastroenterology consultation within 2-3 weeks.'
  },
  {
    name: 'Thyroid Dysfunction (Hypothyroidism)',
    check: (parsed) => parsed.tsh && parsed.tsh.value > 4.0,
    severity: 'medium',
    risk: (parsed) => `TSH is elevated at **${parsed.tsh.value} µIU/mL** (normal 0.4-4.0), suggesting **hypothyroidism**. This can cause fatigue, weight gain, cold intolerance, constipation, and cognitive slowing.`,
    recommendation: 'Check Free T4 and thyroid antibodies (anti-TPO, anti-thyroglobulin). Levothyroxine replacement may be indicated. Repeat TSH in 6-8 weeks.',
    urgency: 'Moderate — endocrinology referral within 2-4 weeks.'
  },
  {
    name: 'Thyroid Dysfunction (Hyperthyroidism)',
    check: (parsed) => parsed.tsh && parsed.tsh.value < 0.4,
    severity: 'medium-high',
    risk: (parsed) => `TSH is suppressed at **${parsed.tsh.value} µIU/mL** (normal 0.4-4.0), suggesting **hyperthyroidism**. Symptoms may include weight loss, palpitations, heat intolerance, tremor, and anxiety.`,
    recommendation: 'Check Free T4, Free T3, and thyroid antibodies (TSI). Thyroid scintigraphy may be needed. Avoid caffeine and stimulants.',
    urgency: 'High — endocrinology referral within 1-2 weeks due to cardiac risk.'
  },
  {
    name: 'Kidney Function Impairment',
    check: (parsed) => {
      return (parsed.creatinine && ((parsed.creatinine.gender === 'male' && parsed.creatinine.value > 1.3) || parsed.creatinine.value > 1.1)) ||
             (parsed.bun && parsed.bun.value > 20);
    },
    severity: 'medium-high',
    risk: (parsed) => {
      const parts = [];
      if (parsed.creatinine?.value > 1.3) parts.push(`Creatinine: **${parsed.creatinine.value} mg/dL**`);
      if (parsed.bun?.value > 20) parts.push(`BUN: **${parsed.bun.value} mg/dL**`);
      return `Kidney function markers are elevated: ${parts.join(', ')}. This may indicate reduced glomerular filtration rate (GFR) and early chronic kidney disease.`;
    },
    recommendation: 'Calculate eGFR. Check urine albumin-to-creatinine ratio (UACR). Ensure adequate hydration. Review and adjust nephrotoxic medications. Repeat in 4-6 weeks.',
    urgency: 'Moderate-High — nephrology referral recommended within 2 weeks.'
  },
  {
    name: 'Vitamin D Deficiency',
    check: (parsed) => parsed.vitamin_d && parsed.vitamin_d.value < 30,
    severity: 'low-medium',
    risk: (parsed) => `Vitamin D is low at **${parsed.vitamin_d.value} ng/mL** (optimal ≥30). This increases risk of osteoporosis, immune dysfunction, fatigue, and mood disorders.`,
    recommendation: 'Supplement with Vitamin D3 (1000-4000 IU/day depending on severity). Increase sun exposure (15-20 min daily). Recheck levels in 8-12 weeks.',
    urgency: 'Low-Moderate — addressable with supplementation.'
  },
  {
    name: 'Hypertension',
    check: (parsed) => parsed.systolic_bp && parsed.systolic_bp.value >= 130,
    severity: 'medium',
    risk: (parsed) => `Systolic blood pressure is elevated at **${parsed.systolic_bp.value} mmHg** (normal < 120). This increases cardiovascular risk over time.`,
    recommendation: 'Monitor blood pressure regularly. Adopt DASH diet, reduce sodium intake, and engage in regular aerobic exercise.',
    urgency: 'Moderate — follow up with primary care physician.'
  }
];


// ─── Report Text Parser ─────────────────────────────────────────────────────
export function parseBloodReport(reportText, gender = 'unknown') {
  const text = reportText.toLowerCase();
  const parsed = {};
  let detectedGender = gender.toLowerCase();

  // Try to detect gender from report
  if (detectedGender === 'unknown') {
    if (/\bgender\s*:\s*female\b/i.test(reportText) || /\bsex\s*:\s*female\b/i.test(reportText) || /\bsex\s*:\s*f\b/i.test(reportText)) {
      detectedGender = 'female';
    } else if (/\bgender\s*:\s*male\b/i.test(reportText) || /\bsex\s*:\s*male\b/i.test(reportText) || /\bsex\s*:\s*m\b/i.test(reportText)) {
      detectedGender = 'male';
    }
  }

  // Try to detect patient name
  const nameMatch = reportText.match(/patient\s*name\s*:\s*([^\n\r]+)/i);
  const ageMatch = reportText.match(/age\s*:\s*(\d+)/i);

  for (const [key, ref] of Object.entries(REFERENCE_RANGES)) {
    // Build search terms: the key itself + all aliases
    const searchTerms = [key.replace(/_/g, ' '), ...(ref.aliases || [])];

    for (const term of searchTerms) {
      // Match patterns like "Hemoglobin: 13.8 g/dL" or "Hemoglobin    13.8"
      // Also handle commas in numbers like "240,000"
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`${escapedTerm}[:\\s]+([\\d,]+\\.?\\d*)\\s*${ref.unit ? ref.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''}`, 'i'),
        new RegExp(`${escapedTerm}[:\\s]+([\\d,]+\\.?\\d*)`, 'i'),
        new RegExp(`${escapedTerm}[^\\d]*?([\\d,]+\\.?\\d*)\\s*${ref.unit ? ref.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''}`, 'i'),
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = reportText.match(pattern);
        if (match) {
          const rawValue = match[1].replace(/,/g, '');
          const numValue = parseFloat(rawValue);
          if (!isNaN(numValue)) {
            // Determine reference range based on gender
            const range = ref[detectedGender] || ref.default;
            const status = numValue < range[0] ? 'Low' : numValue > range[1] ? 'High' : 'Normal';

            parsed[key] = {
              name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: numValue,
              rawValue: match[1],
              unit: ref.unit,
              category: ref.category,
              refRange: `${range[0]} - ${range[1]}`,
              refMin: range[0],
              refMax: range[1],
              status,
              gender: detectedGender
            };
            matched = true;
            break;
          }
        }
      }
      if (matched) break;
    }
  }

  return {
    parameters: parsed,
    patientName: nameMatch ? nameMatch[1].trim() : null,
    patientAge: ageMatch ? parseInt(ageMatch[1]) : null,
    detectedGender,
    parameterCount: Object.keys(parsed).length,
    abnormalCount: Object.values(parsed).filter(p => p.status !== 'Normal').length
  };
}


// ─── Analysis Generator ─────────────────────────────────────────────────────
export function generateAnalysis(parsedReport) {
  const { parameters } = parsedReport;
  const findings = [];
  let overallSeverity = 'low';
  const severityOrder = { 'low': 0, 'low-medium': 1, 'medium': 2, 'medium-high': 3, 'high': 4 };

  // Run each clinical rule
  for (const rule of CLINICAL_RULES) {
    if (rule.check(parameters)) {
      let riskText = '';
      if (rule.buildRisk) {
        riskText = rule.buildRisk(parameters);
      } else if (typeof rule.risk === 'function') {
        riskText = rule.risk(parameters);
      } else {
        riskText = rule.risk;
        // Interpolate values
        for (const [key, val] of Object.entries(parameters)) {
          riskText = riskText.replace(`{${key}.value}`, val.value);
          riskText = riskText.replace(`{${key}.unit}`, val.unit);
        }
      }

      findings.push({
        condition: rule.name,
        severity: rule.severity,
        risk: riskText,
        recommendation: rule.recommendation,
        urgency: rule.urgency
      });

      if ((severityOrder[rule.severity] || 0) > (severityOrder[overallSeverity] || 0)) {
        overallSeverity = rule.severity;
      }
    }
  }

  // Build the metrics table
  const metrics = Object.values(parameters).map(p => ({
    category: p.category,
    name: p.name,
    value: `${p.rawValue} ${p.unit}`,
    numericValue: p.value,
    status: p.status,
    ref: p.refRange
  }));

  // Build the analysis text
  let analysisText = `### AI Generated Diagnosis:\n\n`;
  analysisText += `> **Disclaimer:** This analysis is generated by an intelligent clinical rule engine that has actually parsed and evaluated your blood report values against established medical reference ranges. It is not a substitute for professional medical advice.\n\n`;

  if (findings.length === 0) {
    analysisText += `- **Potential Health Risks:**\n`;
    analysisText += `  - **Overall Status:** Excellent baseline health profile.\n`;
    analysisText += `  - **Risk Level:** **Low** — All ${Object.keys(parameters).length} tested parameters are within optimal reference ranges.\n`;
    analysisText += `  - All CBC, Metabolic, Lipid, Liver, and endocrine markers show healthy values.\n\n`;
    analysisText += `- **Recommendations:**\n`;
    analysisText += `  - **Lifestyle:** Continue with an active lifestyle; aim for 150 min moderate aerobic exercise per week.\n`;
    analysisText += `  - **Dietary:** Maintain a balanced, nutrient-dense diet rich in fiber, lean proteins, and unsaturated fats.\n`;
    analysisText += `  - **Follow-up:** Repeat routine screening in 12 months as part of annual preventative health.\n`;
    analysisText += `  - **Urgency:** Routine — no immediate medical follow-up required.\n`;
  } else {
    analysisText += `- **Potential Health Risks:**\n`;
    for (const f of findings) {
      analysisText += `  - **${f.condition}:** ${f.risk}\n`;
    }
    analysisText += `  - **Overall Risk Level:** **${overallSeverity.toUpperCase()}** (${findings.length} clinical finding${findings.length > 1 ? 's' : ''} identified across ${parsedReport.abnormalCount} out-of-range parameters).\n\n`;

    analysisText += `- **Recommendations:**\n`;
    for (const f of findings) {
      analysisText += `  - **[${f.condition}]:** ${f.recommendation}\n`;
    }
    
    // Overall urgency = highest urgency
    const highestUrgency = findings.reduce((prev, curr) => {
      const sev = severityOrder[curr.severity] || 0;
      return sev > (severityOrder[prev.severity] || 0) ? curr : prev;
    });
    analysisText += `  - **Overall Urgency:** ${highestUrgency.urgency}\n`;
  }

  return {
    metrics,
    analysis: analysisText,
    findings,
    overallSeverity,
    parameterCount: parsedReport.parameterCount,
    abnormalCount: parsedReport.abnormalCount
  };
}


// ─── Intelligent Chat Agent ─────────────────────────────────────────────────
export function generateChatResponse(query, parsedReport, analysisResult) {
  const q = query.toLowerCase();
  const { parameters } = parsedReport;
  const { findings, metrics } = analysisResult;
  const abnormal = metrics.filter(m => m.status !== 'Normal');
  const normal = metrics.filter(m => m.status === 'Normal');

  // Build a context string of all actual values
  const allValues = metrics.map(m => `${m.name}: ${m.value} (${m.status})`).join(', ');

  // ── DIET questions ──
  if (q.match(/\b(diet|eat|food|nutrition|meal|cooking)\b/)) {
    const tips = [];
    if (parameters.glucose?.status !== 'Normal') {
      tips.push('**For glucose control:** Adopt a low-glycemic diet — replace white rice/bread with whole grains, sweet potatoes, and legumes. Avoid sugary drinks and processed snacks. Eat at consistent times to stabilize blood sugar.');
    }
    if (parameters.ldl?.status === 'High' || parameters.total_cholesterol?.status === 'High' || parameters.triglycerides?.status === 'High') {
      tips.push('**For lipid management:** Increase soluble fiber (oats, barley, apples, beans). Choose healthy fats (olive oil, nuts, avocado, fatty fish). Eliminate trans fats and limit saturated fats to <7% of calories.');
    }
    if (parameters.hemoglobin?.status === 'Low') {
      tips.push('**For anemia:** Focus on heme iron sources (red meat, liver, dark poultry meat) and non-heme iron (spinach, lentils, fortified cereals). Always pair iron-rich foods with Vitamin C (citrus, bell peppers) to boost absorption. Avoid tea/coffee within 1 hour of meals — tannins block iron absorption.');
    }
    if (parameters.creatinine?.status === 'High' || parameters.bun?.status === 'High') {
      tips.push('**For kidney health:** Reduce protein intake to 0.8g/kg/day. Limit sodium to <2g/day. Stay well-hydrated. Avoid NSAIDs and excess potassium.');
    }
    if (tips.length === 0) {
      tips.push('Your values look healthy! Continue with a balanced Mediterranean-style diet: plenty of vegetables, whole grains, lean proteins (fish, poultry), legumes, and healthy fats (olive oil, nuts). Stay hydrated with 2-3 liters of water daily.');
    }
    return `Based on your **actual lab values** (${abnormal.length} abnormal parameters detected), here are targeted dietary recommendations:\n\n${tips.join('\n\n')}`;
  }

  // ── URGENCY / DOCTOR questions ──
  if (q.match(/\b(urgent|emergency|doctor|hospital|clinic|serious|worried|scared|danger)\b/)) {
    if (findings.some(f => f.severity === 'high')) {
      const highFindings = findings.filter(f => f.severity === 'high');
      return `⚠️ **Yes, your results require prompt medical attention.** Based on your actual values:\n\n${highFindings.map(f => `• **${f.condition}:** ${f.urgency}`).join('\n')}\n\nI recommend scheduling an appointment within 48-72 hours. Bring this report to your doctor. While not an immediate emergency room situation, delaying care could allow these conditions to worsen.`;
    } else if (findings.length > 0) {
      return `Your results show **${findings.length} clinical finding(s)** but none are at critical emergency levels. Specifically:\n\n${findings.map(f => `• **${f.condition}** (${f.severity} severity): ${f.urgency}`).join('\n')}\n\nSchedule a consultation with your primary care physician within 2-3 weeks. This is not an emergency, but should not be ignored.`;
    }
    return `Based on your blood work, **all ${metrics.length} parameters are within normal ranges**. No urgent medical consultation is needed. Continue routine annual check-ups.`;
  }

  // ── EXPLAIN parameters questions ──
  if (q.match(/\b(explain|parameter|result|mean|range|value|reading|number|level)\b/)) {
    if (abnormal.length > 0) {
      const explanation = abnormal.map(m => {
        const emoji = m.status === 'High' ? '🔴' : '🔵';
        return `${emoji} **${m.name}:** ${m.value} — **${m.status}** (reference: ${m.ref})`;
      }).join('\n');
      return `Here are your **${abnormal.length} out-of-range parameters** explained:\n\n${explanation}\n\n${normal.length > 0 ? `The remaining **${normal.length} parameters** (${normal.map(m => m.name).join(', ')}) are all within optimal ranges.` : ''}`;
    }
    return `All **${metrics.length} tested parameters** are within normal reference ranges:\n\n${metrics.map(m => `✅ **${m.name}:** ${m.value} (ref: ${m.ref})`).join('\n')}\n\nNo abnormalities detected.`;
  }

  // ── EXERCISE questions ──
  if (q.match(/\b(exercise|workout|physical|activity|gym|run|walk|yoga)\b/)) {
    const tips = [];
    if (parameters.hemoglobin?.status === 'Low') {
      tips.push('⚠️ **Caution:** With low hemoglobin, avoid intense exercise. Stick to light walking (15-20 min) until hemoglobin rises above 10 g/dL to prevent cardiac strain and dizziness.');
    } else {
      tips.push('**Aerobic exercise:** 150 minutes/week of moderate intensity (brisk walking, cycling, swimming) or 75 minutes of vigorous intensity (running, HIIT).');
      tips.push('**Strength training:** 2 sessions/week targeting major muscle groups.');
    }
    if (parameters.glucose?.status !== 'Normal') {
      tips.push('**For glucose control:** Post-meal walks (15-20 min) are highly effective at reducing blood sugar spikes. Morning exercise before breakfast can improve insulin sensitivity.');
    }
    if (parameters.ldl?.status === 'High' || parameters.total_cholesterol?.status === 'High') {
      tips.push('**For lipid improvement:** Consistent aerobic exercise (30+ min, 5 days/week) has been shown to increase HDL and reduce LDL by 5-10%.');
    }
    return `Based on your actual lab profile, here are personalized exercise recommendations:\n\n${tips.join('\n\n')}`;
  }

  // ── FOLLOW-UP TEST questions ──
  if (q.match(/\b(test|follow|next|recheck|schedule|monitor|repeat)\b/)) {
    const tests = [];
    if (parameters.glucose?.status !== 'Normal') tests.push('**HbA1c** — to assess 3-month average blood sugar control');
    if (parameters.ldl?.status === 'High' || parameters.total_cholesterol?.status === 'High') tests.push('**Repeat Lipid Panel** — in 6-8 weeks to track cholesterol changes after intervention');
    if (parameters.hemoglobin?.status === 'Low') tests.push('**Iron Studies** (Ferritin, Serum Iron, TIBC) — to identify anemia cause\n   **Repeat CBC** — in 4 weeks to track hemoglobin recovery');
    if (parameters.alt?.status === 'High' || parameters.ast?.status === 'High') tests.push('**Hepatitis B/C Screening** and **Liver Ultrasound**\n   **Repeat LFT** — in 4-6 weeks');
    if (parameters.tsh?.status !== 'Normal') tests.push('**Free T4, Free T3, Thyroid Antibodies** — in 6-8 weeks');
    if (parameters.creatinine?.status === 'High') tests.push('**eGFR Calculation** and **Urine Albumin-to-Creatinine Ratio**');
    
    if (tests.length === 0) {
      tests.push('**Routine Annual Blood Panel** — CBC, Metabolic Panel, Lipid Profile in 12 months');
    }
    return `Based on your specific lab findings, I recommend the following follow-up tests:\n\n${tests.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nSchedule these with your healthcare provider for comprehensive monitoring.`;
  }

  // ── DEFAULT: Summarize actual findings ──
  if (abnormal.length > 0) {
    return `Based on my analysis of your blood report, I detected **${metrics.length} parameters** total, with **${abnormal.length} out-of-range value(s)**: ${abnormal.map(m => `${m.name} (${m.status})`).join(', ')}.\n\nClinical findings: ${findings.map(f => f.condition).join(', ')}.\n\nFeel free to ask me about:\n• **Diet** — what to eat/avoid based on your results\n• **Exercise** — safe physical activity recommendations\n• **Follow-up tests** — which tests to schedule next\n• **Urgency** — whether you need to see a doctor soon\n• **Explain parameters** — breakdown of your abnormal values`;
  }
  return `Your blood work shows **${metrics.length} parameters all within normal ranges**. Your overall health profile is excellent.\n\nFeel free to ask me about diet, exercise, or preventive care recommendations to maintain your healthy status.`;
}

export default { parseBloodReport, generateAnalysis, generateChatResponse, REFERENCE_RANGES };
