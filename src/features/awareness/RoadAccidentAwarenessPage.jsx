import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import AIVoiceAssistant from './AIVoiceAssistant';

export default function RoadAccidentAwarenessPage() {
  const { t } = useI18n();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [audioPlayingStep, setAudioPlayingStep] = useState(null);

  const emergencySteps = [
    {
      step: 1,
      title: "Immediate Hazard Mitigation & Scene Safety",
      timeframe: "0 - 60 Seconds",
      icon: "warning",
      color: "amber",
      headline: "Never become a second casualty in an ongoing collision scenario.",
      actions: [
        "Immediately pull off the active transport lanes onto a stabilized shoulder or median break.",
        "Ignite all high-visibility vehicular hazard flashers and headlights to warn incoming highway traffic.",
        "Deploy retroreflective emergency warning triangles at least 50 meters (165 ft) upstream from the accident perimeter.",
        "Ensure ignition electrical circuits in damaged vehicles are shut off to mitigate liquid propellant ignition risks."
      ],
      warning: "Do not step into active highway transit paths without reflective garments or illuminated signalling devices."
    },
    {
      step: 2,
      title: "Rapid Patient Triage & Vitals Assessment",
      timeframe: "1 - 3 Minutes",
      icon: "ecg_heart",
      color: "rose",
      headline: "Assess structural integrity and primary physiological signs (ABCs: Airway, Breathing, Circulation).",
      actions: [
        "Verify conscious responsiveness by loud verbal commands without shaking the patient’s cervical spine.",
        "Check for continuous respiration (chest expansion) and palpable carotid or radial arterial pulses.",
        "Identify life-threatening arterial hemorrhaging and prioritize mechanical compression over minor lacerations.",
        "Stabilize the head and neck in a neutral linear orientation if traumatic vertebral compression is suspected."
      ],
      warning: "CRITICAL: Never extract or drag an injured passenger from a vehicle unless under immediate threat of vehicle conflagration or chemical immersion."
    },
    {
      step: 3,
      title: "Activate ResQ-Plus Smart SOS Telemetry",
      timeframe: "Immediately via AI",
      icon: "cell_tower",
      color: "blue",
      headline: "Leverage automated zero-touch vehicular crash telemetry for instantaneous paramedic routing.",
      actions: [
        "If hard deceleration (>6G) occurs, ResQ-Plus background software automatically fires emergency SOS packets.",
        "Manually trigger the big crimson SOS Dispatch button if secondary third-party accidents are observed.",
        "ResQ-Plus algorithms instantly broadcast accurate GPS coordinates, patient Blood Type, and Health Vault allergies directly to incoming emergency dispatchers.",
        "Maintain clear voice communication with automated AI triage agents to update patient consciousness timestamps."
      ],
      warning: "Ensure your mobile terminal's GPS and high-speed data transmission remain active during transit."
    },
    {
      step: 4,
      title: "Administer Critical First-Aid Intervention",
      timeframe: "Until Paramedics Arrive",
      icon: "medical_services",
      color: "emerald",
      headline: "Perform non-invasive stabilizing actions to sustain physiological survival in the Golden Hour.",
      actions: [
        "Arrest systemic arterial bleeding by applying heavy, firm manual pressure with clean surgical tourniquets or dressings.",
        "If airway obstruction occurs in an unconscious breathing patient, employ the carefully executed Jaw-Thrust maneuver.",
        "Prevent progressive traumatic hypothermic shock by wrapping patients in isothermal emergency thermal rescue blankets.",
        "Calm conscious survivors to decelerate cardiovascular stress tachycardia and prevent panic-induced movement."
      ],
      warning: "Never give aqueous liquids, pharmaceuticals, or analgesics to individuals experiencing abdominal trauma or impaired consciousness."
    },
    {
      step: 5,
      title: "Coordinate Paramedic & Fleet Handoff",
      timeframe: "Upon Ambulance Arrival",
      icon: "local_hospital",
      color: "purple",
      headline: "Provide structured clinical information to arriving medical teams for accelerated trauma room intake.",
      actions: [
        "Brief approaching emergency responders using standard ATMIST structure (Age, Time of injury, Mechanism, Injuries found, Signs/Vitals, Treatments given).",
        "Transfer digital access to the patient's ResQ-Plus Health Vault QR code for hospital pre-admission records.",
        "Direct paramedic stretchers and heavy rescue instrumentation around structural road debris and fluid spills.",
        "Document badge numbers and hospital destination designations of departing fleet ambulances for emergency family notification."
      ],
      warning: "Clear the loading perimeter immediately once paramedic flight doctors or ambulance technicians take command."
    }
  ];

  const safetyTips = [
    {
      id: "ai_lidar",
      title: "Predictive AI Collision Avoidance",
      category: "Software Telemetry",
      icon: "radar",
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      description: "Keep ResQ-Plus active in driving background mode. Our AI engines synthesize cellular grid motion and optical cameras to predict emergency deceleration events 3.2 seconds before ocular perception, emitting audible acoustic braking warnings."
    },
    {
      id: "zero_touch",
      title: "Zero-Touch Automated Dispatch",
      category: "Emergency Architecture",
      icon: "online_prediction",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/20",
      description: "Configure your ResQ-Plus Health Vault auto-dispatch triggers. Upon sensing structural kinetic G-force impacts, the software instantly transmits de-identified blood type and surgical history straight to regional trauma hospital ER command boards."
    },
    {
      id: "hydroplane",
      title: "Hydroplane & Adverse Weather Adaptiveness",
      category: "Vehicle Telematics",
      icon: "thunderstorm",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10 border-cyan-500/20",
      description: "When ResQ-Plus real-time meteorological sensors detect roadway surface moisture saturation or freezing ambient dew points, automatically reduce cruising velocity by 30% to maintain optical friction limits and prevent fatal skids."
    },
    {
      id: "fatigue",
      title: "Ocular Fatigue & Drowsiness Protocol",
      category: "Bio-Sensor Monitoring",
      icon: "visibility",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
      description: "During extended transit exceeding 180 consecutive minutes, ResQ-Plus activates optical blink-frequency evaluation. Upon detecting micro-sleep symptoms or ocular drooping, high-decibel haptic alarms prompt immediate rest stops."
    },
    {
      id: "golden_hour",
      title: "Golden Hour Green-Wave Navigation",
      category: "Urban Traffic Routing",
      icon: "traffic",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      description: "In emergency evacuation scenarios, strictly adhere to ResQ-Plus dynamic AI navigation. Our platform syncs with municipal emergency traffic control grids to prioritize signal green-waves for ambulances, saving precious life-critical minutes."
    },
    {
      id: "vault_ready",
      title: "Pre-Verified Health Vault Readiness",
      category: "Clinical Readiness",
      icon: "medical_information",
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20",
      description: "Ensure all passengers have linked their emergency contacts in the ResQ-Plus Circle of Trust. First responders scanning vehicular NFC tags obtain immediate allergy warnings (e.g., Penicillin hypersensitivity) before administering IV therapeutics."
    }
  ];

  const drillScenarios = [
    {
      question: "You arrive first at a night-time highway rollover with fuel leaking on the pavement and an unconscious breathing driver inside. What is your FIRST immediate action?",
      options: [
        { label: "Rush inside the wreck and immediately drag the driver out by their arms", correct: false, explanation: "INCORRECT. Unless active flames are present, moving an injured person without spinal support can cause fatal vertebral cervical cord severing." },
        { label: "Park safely 50m upstream, activate hazard flashers, deploy warning triangles, and call ResQ-Plus SOS", correct: true, explanation: "CORRECT! Scene safety always comes first. Preventing a high-speed secondary collision saves both you and the survivor while automated software calls rescue technicians." },
        { label: "Offer the unconscious patient aqueous liquids to resuscitate them", correct: false, explanation: "NEVER administer oral liquids to unconscious or impaired accident victims due to aspiration suffocation risk and pending surgery protocols." }
      ]
    },
    {
      question: "While waiting for ResQ-Plus dispatched ambulances, you notice a deep arterial wound on the passenger's thigh projecting bright red pulsing hemorrhaging. What is your priority protocol?",
      options: [
        { label: "Apply immediate, firm, direct heavy manual compression using clean surgical cloths or tourniquets", correct: true, explanation: "EXCELLENT! Arterial bleeding can cause fatal cardiac hypovolemic shock within 180 seconds. Firm direct mechanical pressure is the single most critical intervention." },
        { label: "Elevate the legs and leave the bleeding limb untouched until flight surgeons arrive", correct: false, explanation: "INCORRECT. Passive elevation is completely ineffective against pressurized arterial bleeding; without mechanical compression, exsanguination will occur." },
        { label: "Clean the open wound with alcohol wipes and put a loose adhesive bandage over it", correct: false, explanation: "INCORRECT. Minor topical sanitizers and light adhesive bandaging cannot stop pressurized femoral arterial blood loss." }
      ]
    }
  ];

  const toggleStepComplete = (stepIndex) => {
    if (completedSteps.includes(stepIndex)) {
      setCompletedSteps(completedSteps.filter(s => s !== stepIndex));
    } else {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const triggerAudioSimulation = (stepNum) => {
    // If already playing this step, stop it
    if (audioPlayingStep === stepNum) {
      window.speechSynthesis.cancel();
      setAudioPlayingStep(null);
      return;
    }

    // Stop any currently playing audio first
    window.speechSynthesis.cancel();

    const step = emergencySteps.find(s => s.step === stepNum);
    if (!step) return;

    // Build the full script to read aloud
    const script = [
      `Stage ${step.step} Protocol: ${step.title}.`,
      `Timeframe: ${step.timeframe}.`,
      step.headline,
      ...step.actions.map((act, i) => `Action ${i + 1}: ${act}`),
      `Critical Warning: ${step.warning}`
    ].join(' ... ');

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a clear English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setAudioPlayingStep(stepNum);
    utterance.onend = () => setAudioPlayingStep(null);
    utterance.onerror = () => setAudioPlayingStep(null);

    setAudioPlayingStep(stepNum);
    window.speechSynthesis.speak(utterance);
  };

  const handleQuizSubmit = (optIndex) => {
    setQuizAnswer(optIndex);
    const isCorrect = drillScenarios[selectedScenario].options[optIndex].correct;
    setQuizScore(prev => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1
    }));
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-16 text-on-surface animate-fadeIn">
      
      {/* ─── 1. HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low border border-outline-variant/60 rounded-3xl p-6 md:p-10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-xs font-black tracking-wider uppercase text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            {t("ResQ-Plus Emergency Protocol & Awareness")}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight leading-tight">
            {t("How to React During a")} <span className="text-rose-500 underline decoration-rose-500/40 underline-offset-4">{t("Road Accident")}</span>
          </h1>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
            {t("ResQ-Plus is an advanced digital healthcare & vehicle emergency platform focused primarily on")} <strong>{t("Preventing Road Accidents through AI smart software")}</strong> {t("and accelerating zero-touch triage when collisions happen. Study this step-by-step reaction guide to protect lives.")}
          </p>
        </div>

        <div className="z-10 flex flex-row md:flex-col gap-3 w-full md:w-auto min-w-[200px]">
          <div className="flex-1 bg-surface-container-lowest/90 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-outline-variant/80 shadow-md text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant block mb-1">{t("Protocol Status")}</span>
            <span className="text-xl font-black text-emerald-500 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-lg">verified</span>
              {completedSteps.length} {t("of")} 5 {t("Reviewed")}
            </span>
          </div>
          <button 
            onClick={() => {
              setCompletedSteps([1, 2, 3, 4, 5]);
            }}
            className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-on-primary text-xs font-black rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            {t("Mark All Verified")}
          </button>
        </div>
      </div>

      {/* ─── 2. STEP-BY-STEP INTERACTIVE REACTION PROTOCOL ──────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-outline-variant/40 pb-4">
          <div>
            <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500">format_list_numbered</span>
              {t("Step-by-Step Accident Response Protocol")}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{t("Click any numbered emergency stage below to expand detailed operational checklists and safety boundaries.")}</p>
          </div>
          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/60">
            ⏳ {t("Golden Hour Target: Under 15 Min")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {emergencySteps.map((stepItem) => {
            const isSelected = activeStep === stepItem.step;
            const isDone = completedSteps.includes(stepItem.step);
            return (
              <button
                key={stepItem.step}
                onClick={() => setActiveStep(stepItem.step)}
                className={`p-4 rounded-2xl border transition-all duration-300 text-left flex flex-col justify-between h-36 relative overflow-hidden group ${
                  isSelected 
                    ? 'bg-surface-container-high border-primary shadow-xl ring-2 ring-primary/20 scale-[1.02]' 
                    : 'bg-surface-container-low border-outline-variant/60 hover:border-outline hover:bg-surface-container'
                }`}
              >
                <div className="flex justify-between items-start w-full z-10">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'
                  }`}>
                    #{stepItem.step}
                  </span>
                  {isDone && (
                    <span className="material-symbols-outlined text-emerald-500 text-xl animate-bounce" title="Reviewed">check_circle</span>
                  )}
                </div>
                
                <div className="z-10 mt-2">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-on-surface-variant/80 mb-0.5">{t(stepItem.timeframe)}</p>
                  <p className="text-xs font-black text-on-surface leading-tight line-clamp-2">{t(stepItem.title)}</p>
                </div>

                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-on-surface-variant pointer-events-none transform group-hover:scale-125 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[70px]">{stepItem.icon}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Detail Showcase */}
        {emergencySteps.map((item) => {
          if (activeStep !== item.step) return null;
          const isDone = completedSteps.includes(item.step);
          const isPlaying = audioPlayingStep === item.step;

          return (
            <div key={item.step} className="bg-surface-container-low border border-outline-variant/80 rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-500 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/50 pb-5 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-surface text-[10px] font-black uppercase text-primary border border-outline-variant">
                        {t("Stage")} {item.step} {t("Protocol")}
                      </span>
                      <span className="text-xs font-bold text-on-surface-variant">• {t(item.timeframe)}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">{t(item.title)}</h3>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => triggerAudioSimulation(item.step)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                      isPlaying 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse shadow-lg shadow-amber-500/20' 
                        : 'bg-surface-container border-outline-variant hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{isPlaying ? 'volume_up' : 'play_circle'}</span>
                    {isPlaying ? t('Broadcasting AI Audio Protocol...') : t('Listen to Audio Guidance')}
                  </button>

                  <button
                    onClick={() => toggleStepComplete(item.step)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md ${
                      isDone 
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                        : 'bg-rose-600 text-white hover:bg-rose-500 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{isDone ? 'task_alt' : 'check_circle_outline'}</span>
                    {isDone ? t('Reviewed & Acknowledged') : t('Mark Step as Reviewed')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <p className="text-sm font-black text-on-surface bg-surface p-4 rounded-2xl border-l-4 border-rose-500 shadow-sm leading-relaxed">
                    "{t(item.headline)}"
                  </p>
                  
                  <div className="space-y-3 pt-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-500">task_alt</span>
                      {t("Required Immediate Actions Checklist:")}
                    </h4>
                    
                    <div className="space-y-2.5">
                      {item.actions.map((act, i) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 bg-surface/60 rounded-2xl border border-outline-variant/40 hover:border-outline transition-colors">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center font-black text-xs mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-xs font-semibold text-on-surface leading-relaxed pt-0.5">{t(act)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Warning Card & Telemetry Quick Box */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-5 text-left space-y-2.5 shadow-lg">
                    <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-base">gpp_maybe</span>
                      {t("Critical Safety Warning")}
                    </div>
                    <p className="text-xs text-on-surface font-extrabold leading-relaxed">
                      {t(item.warning)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-surface to-surface-container p-5 rounded-2xl border border-outline-variant/60 shadow-sm space-y-3">
                    <h5 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center justify-between">
                      {t("ResQ-Plus Live Triage Aid")}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h5>
                    <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
                      {t("In the event of physical entrapment, hold your phone power switch 5 times to bypass lock-screens and invoke ResQ-Plus Silent SOS Satellite link.")}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-primary border-t border-outline-variant/50 pt-2">
                      <span>{t("Telemetry Response Time:")}</span>
                      <span className="font-mono bg-primary/10 px-2 py-0.5 rounded">&lt; 200 milliseconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 3. RESQ-PLUS SOFTWARE AWARENESS & TELEMETRY SHOWCASE ─────────────── */}
      <div className="mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-outline-variant/40 pb-4">
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">online_prediction</span>
              {t("How ResQ-Plus Prevents Road Accidents Through Software")}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {t("Explore our state-of-the-art vehicular telemetry overlay and predictive safety algorithms designed to halt collisions before impact.")}
            </p>
          </div>
          <span className="text-xs font-black text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            {t("Proactive Telematics Engine Enabled")}
          </span>
        </div>

        {/* High-Tech Demonstration Image Card */}
        <div className="relative rounded-3xl overflow-hidden border border-outline-variant/80 shadow-2xl bg-slate-950 group">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span className="px-3 py-1 bg-slate-900/90 backdrop-blur-md text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t("Live Telemetry Simulation Radar")}
            </span>
            <span className="px-3 py-1 bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg hidden sm:inline-block">
              {t("ResQ-Plus Anti-Collision OS v4.2")}
            </span>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none flex items-end p-6 md:p-8">
            <div className="space-y-1 z-20">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-400">{t("ResQ-Plus Predictive Prevention Core")}</p>
              <h3 className="text-lg md:text-2xl font-black text-white tracking-tight leading-tight">
                {t("Synthesizing vehicle LiDAR vectors with medical Health Vault emergency routing in real time.")}
              </h3>
            </div>
          </div>

          <img 
            src="/awareness_demo.png" 
            alt="ResQ-Plus AI Traffic Safety & Telemetry Overlay" 
            className="w-full h-[360px] md:h-[480px] object-cover object-center transition-transform duration-1000 group-hover:scale-[1.02]"
          />
        </div>

        {/* Tips & Tricks Grid Below Image Placeholder */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500">lightbulb</span>
            {t("Essential Road Safety Tips & Software Prevention Secrets")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {safetyTips.map((tip) => (
              <div 
                key={tip.id} 
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant/70 hover:border-outline rounded-2xl p-5 transition-all duration-300 shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-3 rounded-2xl border ${tip.bg} ${tip.color} shadow-sm transform group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-2xl">{tip.icon}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant bg-surface px-2.5 py-1 rounded-full border border-outline-variant/60">
                      {t(tip.category)}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-on-surface leading-snug mb-2 group-hover:text-primary transition-colors">
                    {t(tip.title)}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    {t(tip.description)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-outline-variant/40 flex items-center justify-between text-[11px] font-bold text-on-surface/70">
                  <span>{t("ResQ-Plus Protection:")}</span>
                  <span className="text-emerald-500 flex items-center gap-1 font-black">
                    <span className="material-symbols-outlined text-xs">check_circle</span> {t("Active Monitor")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. INTERACTIVE EMERGENCY RESPONSE DRILL SIMULATOR ─────────────── */}
      <div className="mt-8 bg-gradient-to-br from-surface-container via-surface-container-low to-surface border border-outline-variant/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/50 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-2 inline-block">
              {t("Interactive Live Triage Drill")}
            </span>
            <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">
              {t("Test Your Emergency Reaction Decision-Making")}
            </h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {t("Select an emergency scenario below and choose the correct medical survival protocol to test your readiness.")}
            </p>
          </div>
          
          <div className="bg-surface px-5 py-3 rounded-2xl border border-outline-variant shadow-sm text-center min-w-[150px]">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-on-surface-variant block">{t("Drill Score")}</span>
            <span className="text-lg font-black text-on-surface">
              {quizScore.correct} / {quizScore.total} <span className="text-xs font-bold text-on-surface-variant">{t("Correct")}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-outline-variant/40 pb-3">
          {drillScenarios.map((scen, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedScenario(idx);
                setQuizAnswer(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedScenario === idx 
                  ? 'bg-primary text-on-primary shadow-md' 
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t(idx === 0 ? 'Scenario 1: Highway Rollover Scene Safety' : 'Scenario 2: Arterial Bleeding Control')}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-sm font-black text-on-surface bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 leading-relaxed">
            🚨 <strong>{t("Scenario Challenge:")}</strong> {t(drillScenarios[selectedScenario].question)}
          </p>

          <div className="space-y-3">
            {drillScenarios[selectedScenario].options.map((opt, optIdx) => {
              const isChosen = quizAnswer === optIdx;
              const hasAnswered = quizAnswer !== null;
              let optionClasses = 'bg-surface hover:bg-surface-container border-outline-variant';

              if (hasAnswered && isChosen) {
                optionClasses = opt.correct 
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-on-surface ring-2 ring-emerald-500/20' 
                  : 'bg-rose-500/15 border-rose-500/60 text-on-surface ring-2 ring-rose-500/20';
              } else if (hasAnswered && opt.correct) {
                optionClasses = 'bg-emerald-500/10 border-emerald-500/40 opacity-80';
              }

              return (
                <div key={optIdx} className={`p-4 rounded-2xl border transition-all ${optionClasses}`}>
                  <button
                    disabled={hasAnswered}
                    onClick={() => handleQuizSubmit(optIdx)}
                    className="w-full text-left flex items-center justify-between gap-4 font-bold text-xs leading-relaxed text-on-surface disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs ${
                        hasAnswered && opt.correct ? 'bg-emerald-500 text-slate-950' : 'bg-surface-container-highest text-on-surface'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{t(opt.label)}</span>
                    </div>
                    {hasAnswered && isChosen && (
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        opt.correct ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        {t(opt.correct ? 'Correct Action' : 'Critical Mistake')}
                      </span>
                    )}
                  </button>

                  {hasAnswered && isChosen && (
                    <div className={`mt-3 pt-3 border-t text-xs font-semibold leading-relaxed ${
                      opt.correct ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      <strong>{t(opt.correct ? '✨ Protocol Confirmed:' : '⚠️ Triage Analysis:')}</strong> {t(opt.explanation)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {quizAnswer !== null && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setQuizAnswer(null)}
                className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-black transition-all"
              >
                {t("Reset & Retry Scenario")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Voice Assistant */}
      <AIVoiceAssistant />
    </div>
  );
}
