import React, { useState, useEffect, useRef } from 'react';

const SAMPLE_REPORTS = {
  normal: {
    title: "Normal Comprehensive Profile",
    age: 32,
    gender: "Female",
    name: "Jane Smith",
    text: `BLOOD TEST REPORT
Date: 15/03/2026
Laboratory: HealthCare Diagnostics
Patient Name: Jane Smith
Age: 32 | Gender: Female

COMPLETE BLOOD COUNT (CBC)
Hemoglobin: 13.8 g/dL (Reference: 12.0-15.5)
White Blood Cells: 6,800 /µL (Reference: 4,000-11,000)
Platelets: 240,000 /µL (Reference: 150,000-450,000)
Red Blood Cells: 4.5 M/µL (Reference: 4.0-5.2)
Hematocrit: 40% (Reference: 36-46%)

METABOLIC PANEL
Glucose (Fasting): 88 mg/dL (Reference: 70-100)
Creatinine: 0.8 mg/dL (Reference: 0.6-1.1)
BUN: 12 mg/dL (Reference: 7-20)
Sodium: 138 mEq/L (Reference: 135-145)
Potassium: 4.2 mEq/L (Reference: 3.5-5.0)

LIPID PROFILE
Total Cholesterol: 175 mg/dL (Reference: <200)
HDL Cholesterol: 58 mg/dL (Reference: >40)
LDL Cholesterol: 92 mg/dL (Reference: <100)
Triglycerides: 110 mg/dL (Reference: <150)

LIVER FUNCTION
ALT: 22 U/L (Reference: 7-56)
AST: 20 U/L (Reference: 10-40)
Alkaline Phosphatase: 65 U/L (Reference: 44-147)
Total Bilirubin: 0.7 mg/dL (Reference: 0.3-1.2)

THYROID FUNCTION
TSH: 2.1 µIU/mL (Reference: 0.4-4.0)
T4: 1.1 ng/dL (Reference: 0.8-1.8)

Additional Notes:
All values are within normal reference ranges.`,
    metrics: [
      { category: "Hematology", name: "Hemoglobin", value: "13.8 g/dL", status: "Normal", ref: "12.0 - 15.5" },
      { category: "Hematology", name: "White Blood Cells", value: "6,800 /µL", status: "Normal", ref: "4,000 - 11,000" },
      { category: "Hematology", name: "Platelets", value: "240,000 /µL", status: "Normal", ref: "150,000 - 450,000" },
      { category: "Metabolic", name: "Glucose (Fasting)", value: "88 mg/dL", status: "Normal", ref: "70 - 100" },
      { category: "Lipids", name: "Total Cholesterol", value: "175 mg/dL", status: "Normal", ref: "< 200" },
      { category: "Lipids", name: "LDL Cholesterol", value: "92 mg/dL", status: "Normal", ref: "< 100" },
      { category: "Liver", name: "ALT", value: "22 U/L", status: "Normal", ref: "7 - 56" }
    ],
    analysis: `### AI Generated Diagnosis:

- **Potential Health Risks:**
  - **Overall Status:** Excellent baseline health profile.
  - **Risk Level:** **Low** (No parameters out-of-range).
  - **Clinical Findings:** CBC, Metabolic Panel, Lipid Profile, and Liver Function tests all demonstrate optimal metabolic and organ health.

- **Recommendations:**
  - **Lifestyle:** Continue with active lifestyle, aiming for 150 minutes of moderate-intensity aerobic exercise per week.
  - **Dietary:** Maintain a balanced, nutrient-dense diet rich in fiber, lean proteins, and unsaturated fats.
  - **Follow-up:** Repeat routine screening tests in 12 months as part of annual preventative health tracking.
  - **Urgency:** **Routine** (No immediate medical follow-up required).`
  },
  diabetes: {
    title: "High Cholesterol & Pre-Diabetic Profile",
    age: 48,
    gender: "Male",
    name: "John Doe",
    text: `BLOOD TEST REPORT
Date: 15/03/2026
Laboratory: HealthCare Diagnostics
Patient Name: John Doe
Age: 48 | Gender: Male

COMPLETE BLOOD COUNT (CBC)
Hemoglobin: 15.2 g/dL (Reference: 13.5-17.5)
White Blood Cells: 8,100 /µL (Reference: 4,000-11,000)
Platelets: 280,000 /µL (Reference: 150,000-450,000)

METABOLIC PANEL
Glucose (Fasting): 118 mg/dL (Reference: 70-100)
Creatinine: 1.0 mg/dL (Reference: 0.7-1.3)
BUN: 18 mg/dL (Reference: 8-23)

LIPID PROFILE
Total Cholesterol: 245 mg/dL (Reference: <200)
HDL Cholesterol: 34 mg/dL (Reference: >40)
LDL Cholesterol: 168 mg/dL (Reference: <100)
Triglycerides: 215 mg/dL (Reference: <150)

LIVER FUNCTION
ALT: 48 U/L (Reference: 10-50)
AST: 42 U/L (Reference: 10-40)

THYROID FUNCTION
TSH: 2.8 µIU/mL (Reference: 0.4-4.0)`,
    metrics: [
      { category: "Hematology", name: "Hemoglobin", value: "15.2 g/dL", status: "Normal", ref: "13.5 - 17.5" },
      { category: "Metabolic", name: "Glucose (Fasting)", value: "118 mg/dL", status: "High", ref: "70 - 100" },
      { category: "Lipids", name: "Total Cholesterol", value: "245 mg/dL", status: "High", ref: "< 200" },
      { category: "Lipids", name: "HDL Cholesterol", value: "34 mg/dL", status: "Low", ref: "> 40" },
      { category: "Lipids", name: "LDL Cholesterol", value: "168 mg/dL", status: "High", ref: "< 100" },
      { category: "Lipids", name: "Triglycerides", value: "215 mg/dL", status: "High", ref: "< 150" },
      { category: "Liver", name: "AST", value: "42 U/L", status: "High", ref: "10 - 40" }
    ],
    analysis: `### AI Generated Diagnosis:

- **Potential Health Risks:**
  - **Impaired Fasting Glucose (Pre-Diabetes):** Fasting Glucose is elevated at **118 mg/dL**, placing patient in the pre-diabetic range.
  - **Mixed Hyperlipidemia:** Elevated Total Cholesterol (**245 mg/dL**), LDL (**168 mg/dL**), and Triglycerides (**215 mg/dL**) combined with low HDL (**34 mg/dL**) indicates elevated cardiovascular risk (Atherosclerosis and Metabolic Syndrome).
  - **Mild AST Elevation:** AST is slightly high at **42 U/L**, possibly related to early fatty liver changes (NAFLD), common in metabolic distress.
  - **Risk Level:** **Medium-High** (Cardiovascular and Diabetic progression risk).

- **Recommendations:**
  - **Lifestyle:** Begin a structured exercise regime (aerobic and strength training) for at least 30-45 minutes, 5 days a week.
  - **Dietary:** Switch to a strict Mediterranean or low-glycemic, low-sodium diet. Restrict processed sugars, refined carbohydrates, and saturated fats. Increase intake of soluble fiber and Omega-3 fatty acids.
  - **Follow-up:** Check HbA1c (to confirm Glycemic index over 3 months) and repeat lipid panel in 6-8 weeks.
  - **Urgency:** **Moderate** (Schedule an appointment with a primary physician within the next 2-3 weeks).`
  },
  anemia: {
    title: "Severe Iron Deficiency Anemia Profile",
    age: 27,
    gender: "Female",
    name: "Sarah Jenkins",
    text: `BLOOD TEST REPORT
Date: 15/03/2026
Laboratory: HealthCare Diagnostics
Patient Name: Sarah Jenkins
Age: 27 | Gender: Female

COMPLETE BLOOD COUNT (CBC)
Hemoglobin: 8.2 g/dL (Reference: 12.0-15.5)
Red Blood Cells: 3.1 M/µL (Reference: 4.0-5.2)
Hematocrit: 26% (Reference: 36-46%)
Platelets: 490,000 /µL (Reference: 150,000-450,000)
White Blood Cells: 6,400 /µL (Reference: 4,000-11,000)

METABOLIC PANEL
Glucose (Fasting): 90 mg/dL (Reference: 70-100)
Creatinine: 0.7 mg/dL (Reference: 0.6-1.1)

LIPID PROFILE
Total Cholesterol: 160 mg/dL (Reference: <200)
HDL Cholesterol: 52 mg/dL (Reference: >40)
LDL Cholesterol: 88 mg/dL (Reference: <100)
Triglycerides: 100 mg/dL (Reference: <150)`,
    metrics: [
      { category: "Hematology", name: "Hemoglobin", value: "8.2 g/dL", status: "Low", ref: "12.0 - 15.5" },
      { category: "Hematology", name: "Red Blood Cells", value: "3.1 M/µL", status: "Low", ref: "4.0 - 5.2" },
      { category: "Hematology", name: "Hematocrit", value: "26%", status: "Low", ref: "36 - 46%" },
      { category: "Hematology", name: "Platelets", value: "490,000 /µL", status: "High", ref: "150,000 - 450,000" },
      { category: "Metabolic", name: "Glucose", value: "90 mg/dL", status: "Normal", ref: "70 - 100" }
    ],
    analysis: `### AI Generated Diagnosis:

- **Potential Health Risks:**
  - **Severe Microcytic Anemia:** Hemoglobin is critically low at **8.2 g/dL** (moderate-to-severe range) alongside low RBC (**3.1 M/µL**) and low Hematocrit (**26%**). Highly suggestive of Iron Deficiency Anemia.
  - **Reactive Thrombocytosis:** Elevated platelet count (**490,000 /µL**), which is a common reactive physiological response to severe iron depletion.
  - **Risk Level:** **High** (Risk of tissue hypoxia, chronic fatigue, cardiovascular strain/tachycardia).

- **Recommendations:**
  - **Lifestyle:** Avoid strenuous physical activities until hemoglobin rises above 10.0 g/dL to prevent cardiac strain. Get adequate rest.
  - **Dietary:** Strongly increase dietary iron intake (lean red meats, poultry, seafood, lentils, beans, dark green leafy vegetables). Pair iron-rich meals with Vitamin C (citrus fruits) to enhance absorption. Avoid drinking tea or coffee with meals (tannins inhibit iron absorption).
  - **Follow-up:** Urgent consultation with a physician for oral iron supplementation or IV iron therapy. Complete Ferritin, Iron, and Total Iron Binding Capacity (TIBC) testing. Repeat CBC in 4 weeks.
  - **Urgency:** **High** (Consult a doctor within 48-72 hours).`
  }
};

const SUGGESTED_QUESTIONS = [
  "Explain my main out-of-range parameters in plain English.",
  "What dietary changes will help improve my numbers?",
  "What specific follow-up blood tests do you recommend?",
  "Is my condition urgent enough to visit the emergency clinic?"
];

export default function PatientFlow() {
  const [patientName, setPatientName] = useState('John Doe');
  const [patientAge, setPatientAge] = useState(48);
  const [patientGender, setPatientGender] = useState('Male');
  const [reportSource, setReportSource] = useState('diabetes'); // 'normal', 'diabetes', 'anemia', 'upload'
  
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedText, setUploadedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [activeAnalysis, setActiveAnalysis] = useState(null); // the output results
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  const logsContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll logic for terminal and chat
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [analysisLogs]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedText(e.target.result || `Uploaded: ${file.name}\nSize: ${file.size} bytes\n(Text content simulated for report parsing)`);
    };
    reader.readAsText(file);
    setReportSource('upload');
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisLogs([]);
    setActiveAnalysis(null);
    setChatMessages([]);

    const steps = [
      { time: 500, msg: "🔍 [PARSER_AGENT]: Activating blood report parser..." },
      { time: 1200, msg: `📄 [PARSER_AGENT]: Reading clinical record for patient: ${patientName} (${patientAge}y/o ${patientGender})...` },
      { time: 2000, msg: "🧬 [PARSER_AGENT]: Successfully extracted text. Tokenizing data points..." },
      { time: 2800, msg: "🧠 [EVALUATOR_AGENT]: Scanning blood chemistry and reference boundaries..." },
      { time: 3500, msg: "📈 [EVALUATOR_AGENT]: Checking lipid profile, metabolic markers, and CBC panels..." },
      { time: 4200, msg: "⚠️ [RISK_AGENT]: Performing cross-metric cardiovascular & diabetic disease correlation..." },
      { time: 5000, msg: "📝 [RECOMMENDER_AGENT]: Formulating personalized preventative dietary & medical guidance..." },
      { time: 5800, msg: "🛡️ [CHIEF_MEDICAL_OFFICER]: Reviewing diagnosis safety guidelines. Analysis complete." }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setAnalysisLogs(prev => [...prev, step.msg]);
        if (index === steps.length - 1) {
          setTimeout(() => {
            // Load selected analysis profile
            let profile;
            if (reportSource === 'upload') {
              // Custom upload mock profile
              profile = {
                title: uploadedFile?.name || "Custom Uploaded Profile",
                age: patientAge,
                gender: patientGender,
                name: patientName,
                metrics: [
                  { category: "Hematology", name: "Hemoglobin", value: "12.8 g/dL", status: "Normal", ref: "12.0 - 15.5" },
                  { category: "Metabolic", name: "Glucose (Fasting)", value: "112 mg/dL", status: "High", ref: "70 - 100" },
                  { category: "Lipids", name: "LDL Cholesterol", value: "142 mg/dL", status: "High", ref: "< 100" }
                ],
                analysis: `### AI Generated Diagnosis (Custom Upload):

- **Potential Health Risks:**
  - **Fasting Glucose Mild Elevation:** Fasting Glucose is slightly high at **112 mg/dL**, showing mild insulin resistance.
  - **Mild Hyperlipidemia:** LDL cholesterol is **142 mg/dL**, placing patient in the borderline high cardiovascular category.
  - **Risk Level:** **Medium** (Cardio-metabolic risk factors identified).

- **Recommendations:**
  - **Lifestyle:** Increase active movement to 30 mins daily.
  - **Dietary:** Limit sugar, fast carbs, saturated fats. Consume more fiber.
  - **Follow-up:** Repeat blood screening and check HbA1c in 3 months.
  - **Urgency:** **Mild-Moderate** (Arrange primary care consultation soon).`
              };
            } else {
              profile = SAMPLE_REPORTS[reportSource];
            }

            setActiveAnalysis(profile);
            setIsAnalyzing(false);
            
            // Add welcome chat message from the AI agent
            setChatMessages([
              {
                role: 'assistant',
                content: `Hello ${patientName}. I have completed the analysis of your blood report. I detected a **${profile.metrics.filter(m => m.status !== 'Normal').length} out-of-range parameter(s)**. Your overall risk level is calculated as **${profile.analysis.includes('High') ? 'HIGH' : profile.analysis.includes('Medium-High') ? 'MEDIUM-HIGH' : 'LOW'}**. How can I assist you with these findings?`
              }
            ]);
          }, 800);
        }
      }, step.time);
    });
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || userInput;
    if (!query.trim() || isReplying) return;

    // Add user message
    const newMsg = { role: 'user', content: query };
    setChatMessages(prev => [...prev, newMsg]);
    setUserInput('');
    setIsReplying(true);

    // Simulated RAG / Langchain agent answering based on report contents
    setTimeout(() => {
      let reply = "";
      const lowerQuery = query.toLowerCase();
      const profile = activeAnalysis;

      if (profile.title.includes("Anemia") || reportSource === 'anemia') {
        if (lowerQuery.includes("diet") || lowerQuery.includes("eat") || lowerQuery.includes("food")) {
          reply = "For severe anemia, you should focus on heme iron sources (red meat, liver, dark meat poultry) and non-heme iron sources (spinach, lentils, beans). Always pair iron-rich foods with Vitamin C (citrus, bell peppers) to double absorption. Crucially, avoid drinking tea or coffee within 1 hour of meals, as tannins block iron absorption.";
        } else if (lowerQuery.includes("urgent") || lowerQuery.includes("doctor") || lowerQuery.includes("clinic")) {
          reply = "Yes, your hemoglobin is severely low at 8.2 g/dL. This causes heart strain (tachycardia) and tissue oxygen depletion. You should consult a primary care physician or hematologist within 48 hours. They may prescribe medical-grade iron supplements or check for underlying blood loss sources.";
        } else if (lowerQuery.includes("parameter") || lowerQuery.includes("high") || lowerQuery.includes("low")) {
          reply = "Your principal abnormal parameters are: \n1. Hemoglobin (8.2 g/dL - Low)\n2. Red Blood Cells (3.1 M/µL - Low)\n3. Hematocrit (26% - Low)\n4. Platelets (490,000 /µL - High). The elevated platelets are a reactive response (Reactive Thrombocytosis) to severe iron depletion.";
        } else {
          reply = "Based on your microcytic blood metrics, you have severe iron deficiency anemia. I highly recommend completing an iron study (ferritin, TIBC, iron levels) and checking with a doctor promptly. Avoid strenuous exercise to prevent taxing your cardiovascular system.";
        }
      } else if (profile.title.includes("Diabetic") || reportSource === 'diabetes') {
        if (lowerQuery.includes("diet") || lowerQuery.includes("eat") || lowerQuery.includes("food")) {
          reply = "To manage your fasting glucose (118 mg/dL) and high LDL (168 mg/dL), you should implement a low-glycemic, low-sodium Mediterranean diet. Focus on healthy monounsaturated fats (extra virgin olive oil, avocados, almonds), soluble fiber (oats, legumes), and lean proteins while avoiding simple sugars and trans-fats.";
        } else if (lowerQuery.includes("urgent") || lowerQuery.includes("doctor") || lowerQuery.includes("clinic")) {
          reply = "This is not an emergency, but it requires scheduled clinical care. Your fasting glucose indicates pre-diabetes and your lipids are highly elevated. You should consult a doctor within 2-3 weeks to run a confirmatory HbA1c test and discuss starting cardiovascular management.";
        } else if (lowerQuery.includes("parameter") || lowerQuery.includes("high") || lowerQuery.includes("low")) {
          reply = "Your primary elevated parameters are: \n1. Fasting Glucose (118 mg/dL)\n2. LDL Cholesterol (168 mg/dL)\n3. Triglycerides (215 mg/dL)\n4. AST Liver Enzyme (42 U/L). Additionally, your protective HDL (34 mg/dL) is low.";
        } else {
          reply = "Your results suggest mixed hyperlipidemia and pre-diabetes. This increases long-term metabolic and arterial risk. Aerobic exercise (30 mins daily) and dietary modifications are critical primary interventions.";
        }
      } else {
        // Normal profile or default response
        if (lowerQuery.includes("diet") || lowerQuery.includes("eat") || lowerQuery.includes("food")) {
          reply = "Since your profile is completely normal, continue with a balanced macro diet including high fiber, whole grains, vegetables, and lean proteins to maintain your excellent lipid and metabolic levels.";
        } else if (lowerQuery.includes("parameter") || lowerQuery.includes("high") || lowerQuery.includes("low")) {
          reply = "All of your tested parameters (Hemoglobin, Glucose, Cholesterol, Liver Enzymes, TSH) are fully within optimal reference intervals.";
        } else {
          reply = "Your clinical markers look excellent! Continue with your current healthy habits. Regular annual physical check-ups are recommended to track changes over time.";
        }
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setIsReplying(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-gutter min-h-screen text-slate-100 bg-slate-950 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-rose-500">
            <span className="material-symbols-outlined text-rose-500">emergency</span>
            AI Patient Flow & Diagnostic Agent (HIA)
          </h2>
          <p className="text-xs text-slate-400">RAG-powered AI Blood Report Analysis, Specialist Warnings & Predictive Health Insights</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 text-[10px] bg-slate-900 border border-slate-800 rounded-full font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Agent Nodes: Online
          </span>
          <span className="px-3 py-1 text-[10px] bg-slate-900 border border-slate-800 rounded-full font-bold text-slate-300">
            Groq Cascade: Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Left Section: Inputs and File Uploader */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">Patient Intake Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Patient Name</label>
                <input 
                  type="text" 
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Age</label>
                  <input 
                    type="number" 
                    value={patientAge} 
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Gender</label>
                  <select 
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Select Blood Report Source</label>
              <div className="flex flex-col gap-2">
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${reportSource === 'diabetes' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900/50'}`}>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="reportSource" 
                      checked={reportSource === 'diabetes'}
                      onChange={() => setReportSource('diabetes')}
                      className="accent-rose-500" 
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold">Diabetes & High Cholesterol Profile</p>
                      <p className="text-[10px] text-slate-400">Elevated glucose & critical lipid parameters</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded">Abnormal</span>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${reportSource === 'anemia' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900/50'}`}>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="reportSource" 
                      checked={reportSource === 'anemia'}
                      onChange={() => setReportSource('anemia')}
                      className="accent-rose-500" 
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold">Severe Anemia Profile</p>
                      <p className="text-[10px] text-slate-400">Critically low hemoglobin & hematocrit levels</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded">Severe</span>
                </label>

                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${reportSource === 'normal' ? 'border-rose-500 bg-rose-950/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900/50'}`}>
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="reportSource" 
                      checked={reportSource === 'normal'}
                      onChange={() => setReportSource('normal')}
                      className="accent-rose-500" 
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold">Normal Healthy Profile</p>
                      <p className="text-[10px] text-slate-400">All markers optimized within reference limits</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded">Normal</span>
                </label>
              </div>
            </div>

            {/* Drag and Drop File Uploader */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive ? 'border-rose-500 bg-rose-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <input 
                type="file" 
                id="file-upload" 
                multiple={false} 
                onChange={handleFileChange}
                accept=".txt,.pdf"
                className="hidden" 
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-3xl">upload_file</span>
                <span className="text-xs font-bold text-slate-200">
                  {uploadedFile ? `Attached: ${uploadedFile.name}` : "Upload blood report PDF or TXT"}
                </span>
                <span className="text-[10px] text-slate-500">Drag & drop or click to browse files</span>
              </label>
            </div>

            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-rose-950/20 active:scale-95 disabled:bg-rose-900 disabled:text-rose-400 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              {isAnalyzing ? "Processing Clinical Agent Pipeline..." : "RUN CLINICAL AI DIAGNOSIS"}
            </button>
          </div>

          {/* AI Reasoning Console */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2 flex-1 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">HIA Agent Node Logs</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>
            
            <div 
              ref={logsContainerRef}
              className="font-mono text-[10px] text-emerald-400 bg-slate-950 p-4 rounded-xl border border-slate-800 flex-1 overflow-y-auto max-h-[220px] leading-relaxed"
            >
              {analysisLogs.length === 0 ? (
                <span className="text-slate-600">Waiting for clinical diagnosis trigger...</span>
              ) : (
                analysisLogs.map((log, i) => (
                  <div key={i} className="mb-1.5 animate-fadeIn">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Results and Follow-Up Chat */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
          {activeAnalysis ? (
            <div className="flex flex-col gap-gutter animate-fadeIn">
              {/* Key Out-Of-Range Parameters Table */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">Flagged Lab Parameters</h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full ${
                    activeAnalysis.metrics.some(m => m.status === 'High' || m.status === 'Low')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {activeAnalysis.metrics.some(m => m.status === 'High' || m.status === 'Low')
                      ? 'Abnormal Findings Detected'
                      : 'Optimal Profile'
                    }
                  </span>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-slate-850">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-850">
                        <th className="p-3">Category</th>
                        <th className="p-3">Marker</th>
                        <th className="p-3 text-center">Value</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Reference Interval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAnalysis.metrics.map((metric, i) => (
                        <tr key={i} className="border-b border-slate-900 hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-semibold text-slate-400">{metric.category}</td>
                          <td className="p-3 font-bold text-slate-200">{metric.name}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-300">{metric.value}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              metric.status === 'High' 
                                ? 'bg-amber-500/20 text-amber-300' 
                                : metric.status === 'Low' 
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {metric.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">{metric.ref}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MD Diagnosis Display */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">Clinical Insight Summary</h3>
                <div className="text-xs leading-relaxed text-slate-300 space-y-3 pt-1">
                  {activeAnalysis.analysis.split('\n\n').map((paragraph, pIdx) => {
                    if (paragraph.startsWith('- **Potential Health Risks:**') || paragraph.startsWith('- **Recommendations:**')) {
                      return (
                        <div key={pIdx} className="pl-4 border-l-2 border-rose-500/50 mb-4">
                          <p className="font-bold text-slate-200 mb-2">{paragraph.split('\n')[0].replace('- ', '')}</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {paragraph.split('\n').slice(1).map((li, lIdx) => (
                              <li key={lIdx} className="text-slate-300">
                                {li.replace('- ', '').replace('**', '').replace('**', '')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    if (paragraph.startsWith('> ')) {
                      return (
                        <blockquote key={pIdx} className="bg-slate-950 p-3 rounded-xl border-l-4 border-blue-500 text-[11px] text-slate-400 italic mb-2">
                          {paragraph.replace('> ', '')}
                        </blockquote>
                      );
                    }
                    if (paragraph.startsWith('### ')) {
                      return <h4 key={pIdx} className="text-sm font-bold text-slate-200 mt-2">{paragraph.replace('### ', '')}</h4>;
                    }
                    return <p key={pIdx}>{paragraph}</p>;
                  })}
                </div>
              </div>

              {/* RAG Interactive Chat Agent */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 h-[420px]">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-rose-400">forum</span>
                    Follow-Up Clinical RAG Chat Agent
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Context: {activeAnalysis.title}</span>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-rose-600 text-white rounded-tr-none'
                          : 'bg-slate-950 border border-slate-850 text-slate-300 rounded-tl-none'
                      }`}>
                        <p className="font-bold text-[9px] uppercase tracking-wider opacity-60 mb-1">
                          {msg.role === 'user' ? 'Patient' : 'Clinical AI'}
                        </p>
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isReplying && (
                    <div className="flex justify-start">
                      <div className="bg-slate-950 border border-slate-850 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-600 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                        </span>
                        Clinical Analyst is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestion Prompts */}
                {chatMessages.length === 1 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSendMessage(q)}
                        className="text-left p-2.5 bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl text-[10px] text-slate-300 hover:text-white transition-all font-semibold leading-snug hover:bg-slate-900"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Panel */}
                <div className="flex gap-2 border-t border-slate-850 pt-3">
                  <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask clinical or diet advice about this blood report..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-semibold"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isReplying || !userInput.trim()}
                    className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 disabled:text-rose-400 text-white font-bold px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-850 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 h-full min-h-[480px]">
              <span className="material-symbols-outlined text-slate-500 text-5xl animate-pulse">clinical_trial</span>
              <h3 className="text-base font-bold text-slate-300 mt-2">No Active Clinical Report</h3>
              <p className="text-xs text-slate-500 max-w-sm">Please select a patient blood report profile on the left side and trigger the Clinical AI Diagnosis to generate real-time insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
