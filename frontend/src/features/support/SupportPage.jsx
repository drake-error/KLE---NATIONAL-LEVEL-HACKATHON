import React, { useState, useEffect } from 'react';

const STORAGE_KEY_TICKETS = 'resq_plus_support_tickets';
const STORAGE_KEY_SETTINGS = 'resq_plus_settings';

const TOPIC_ARTICLES = {
  'Getting started': [
    { title: 'How to configure your 1-Touch Emergency SOS shortcut', time: '3 min read', content: 'Navigate to Settings > Medical Profile to ensure your blood group and emergency contacts are filled out. Once configured, pressing the red SOS shortcut immediately connects you to the command dispatch loop.' },
    { title: 'Understanding ResQ-Plus automated paramedic routing', time: '5 min read', content: 'Our AI Command CAD calculates live ambulance proximity, traffic congestion, and emergency hospital specialty beds to dispatch the closest qualified responder within 60 seconds.' },
    { title: 'Connecting smartwatch vitals and telematics sensors', time: '4 min read', content: 'ResQ-Plus continuously monitors accelerometer pulse spikes and fall detection via Apple Watch, Garmin, and Android Wear sensors to trigger automated SOS alarms when you are unresponsive.' },
  ],
  'SOS & dispatch': [
    { title: 'What if I accidentally press the SOS emergency button?', time: '2 min read', content: 'You have a 10-second PIN-protected countdown window to abort an accidental activation before ambulance units and primary emergency contacts are notified.' },
    { title: 'How dispatchers communicate when you cannot speak', time: '4 min read', content: 'If you are unable to talk, our automated text-to-speech AI interacts via simple Yes/No touch buttons on your screen and monitors background acoustic audio for paramedics.' },
    { title: 'Live GPS location sharing accuracy in urban tunnels', time: '3 min read', content: 'ResQ-Plus leverages dead-reckoning accelerometers and local cellular cell-tower trialing to maintain paramedic targeting even inside concrete parking structures.' },
  ],
  'Ambulance tracking': [
    { title: 'Real-time telemetry and estimated arrival ETAs', time: '3 min read', content: 'Once an ambulance is dispatched, your Live Route Map automatically transitions to a high-refresh vehicle tracker showing exact distance, paramedic crew certifications, and vehicle plates.' },
    { title: 'Smart-Traffic signal preemption clearance explanations', time: '4 min read', content: 'In partnered metropolitan grids, ResQ-Plus transmits encrypted V2X radio signals to switch traffic lights green ahead of approaching ambulances, shaving up to 40% off arrival times.' },
  ],
  'Health Vault & records': [
    { title: 'How paramedics unlock emergency medical records', time: '3 min read', content: 'When an SOS is verified, responding paramedics are granted a temporary 30-minute decryption token to read your allergies, chronic conditions, and EKG history while en route.' },
    { title: 'End-to-end encryption standards in the Health Vault', time: '5 min read', content: 'All diagnostic blood reports and radiology imagery are encrypted at rest using AES-256 and zero-knowledge cryptographic hashing in our HIPAA-compliant cloud.' },
  ],
  'Family Safety circle': [
    { title: 'Setting up automated SMS & voice call SOS alerting', time: '3 min read', content: 'Configure your Primary and Secondary emergency contacts in Settings. When SOS triggers, they receive an SMS containing an encrypted live map tracker link immediately.' },
    { title: 'Configuring Geofence alerts for elderly family members', time: '4 min read', content: 'Create safe zone radiuses around home or residential healthcare facilities in Parental Monitoring to receive notifications if a vulnerable family member wanders out of bounds.' },
  ],
  'Hospitals & partners': [
    { title: 'Direct emergency room check-in prior to arrival', time: '3 min read', content: 'ResQ-Plus bypasses typical hospital triage delays by transmitting your vital telemetry directly to partner hospital trauma bays 10 minutes before the ambulance backs into the ambulance bay.' },
    { title: 'Network list of Level 1 Trauma & Stroke centers', time: '6 min read', content: 'Our AI dynamically maps admissions across over 450 accredited multi-specialty hospital partner networks nationwide based on bed availability and surgical staffing.' },
  ],
  'Emergency Protection plans': [
    { title: 'ResQ-Plus Pro vs. Standard Coverage Tiers', time: '3 min read', content: 'Pro Protection guarantees sub-5 minute priority paramedic dispatch, unlimited air/ground ambulance transportation coverage, and connected Smart-Traffic clearance grid access.' },
    { title: 'Linking health insurance policies for zero co-pay emergency admission', time: '4 min read', content: 'Input your UHID or policy number in Settings > Plan & Coverage to automate hospital billing pre-authorization instantly upon trauma admission.' },
  ],
  'Privacy & security': [
    { title: 'Managing real-time GPS sharing and telemetry permissions', time: '3 min read', content: 'You maintain absolute control over location tracking. ResQ-Plus only requests high-accuracy background GPS coordinates during active emergency dispatch loops.' },
    { title: 'Exporting or permanently deleting your Health Vault data', time: '2 min read', content: 'You can generate an encrypted JSON export of your complete health records or wipe all locally cached vault data directly from Settings > Privacy & Consent at any time.' },
  ]
};

const FAQS_DATA = [
  {
    question: 'What happens the moment I press SOS?',
    answer: 'Instantly, three concurrent actions trigger: (1) Our AI Command CAD locks onto your high-precision GPS coordinates and routes the closest equipped ambulance unit; (2) An automated SMS containing a real-time tracking link is fired to all configured Emergency Contacts; and (3) A dedicated 24/7 clinical dispatcher initiates a voice check-in while monitoring ambient audio telemetry.'
  },
  {
    question: 'Does ResQ-Plus work without internet?',
    answer: 'Yes! If cellular data or WiFi connectivity drops below operational thresholds, the ResQ-Plus mobile runtime automatically switches to an encrypted offline fallback protocol, transmitting your GPS coordinates and SOS payload via high-priority SMS relay or connected satellite SOS band.'
  },
  {
    question: 'Who can see my medical records?',
    answer: 'Your Health Vault is protected by end-to-end encryption. Under normal conditions, no external staff or insurance partners have access. When an active emergency dispatch is initiated, responding paramedics and receiving hospital ER trauma physicians are issued a temporary, audited 30-minute decryption key to review critical blood groups and allergy warnings.'
  },
  {
    question: 'How quickly does support respond?',
    answer: 'For active dispatch escalations or critical SOS device sync failures, our 24/7 technical emergency command responds within 15 minutes. For general account, billing, or non-emergency vault queries, dedicated technical coordinators reply within 1 business day.'
  },
  {
    question: 'Can I add elderly parents to my Safety Circle?',
    answer: 'Yes! Through our Parental Monitoring module, you can enroll elderly parents or family members into your Safety Circle. You can track their automated medication compliance, monitor connected fall-detection smartwatches, and receive instant alerts if they exit designated geofenced safety zones.'
  },
  {
    question: 'How do I update my emergency coverage tier?',
    answer: 'Navigate directly to Settings > Plan & Coverage to view your current subscription tier (e.g., ResQ-Plus Pro Emergency Support), verify your linked HDFC/Star Health insurance policy IDs, or manage your annual emergency coverage billing cycle.'
  }
];

export default function SupportPage({ session, setCurrentTab }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Ticket form state
  const [fullName, setFullName] = useState('Aarav Mehta');
  const [email, setEmail] = useState('aarav@resqplus.app');
  const [priority, setPriority] = useState('Normal – question or request');
  const [description, setDescription] = useState('');
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    // Load default name/email from saved settings or session
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed?.profile?.fullName) setFullName(parsed.profile.fullName);
        if (parsed?.profile?.email) setEmail(parsed.profile.email);
      } else if (session?.user) {
        if (session.user.user_metadata?.full_name) setFullName(session.user.user_metadata.full_name);
        if (session.user.email) setEmail(session.user.email);
      }

      // Load existing tickets
      const savedTickets = localStorage.getItem(STORAGE_KEY_TICKETS);
      if (savedTickets) {
        setTickets(JSON.parse(savedTickets));
      } else {
        // Initial example ticket
        const initTickets = [{
          id: 'RSQ-8821',
          date: 'July 28, 2026',
          subject: 'Smartwatch EKG Bluetooth pairing diagnostic',
          priority: 'Normal',
          status: 'Resolved (Technical Coordinator assigned)'
        }];
        setTickets(initTickets);
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(initTickets));
      }
    } catch (e) {
      console.error('Error reading support data', e);
    }
  }, [session]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      triggerToast('Please describe how we can help before submitting.');
      return;
    }

    const ticketId = `RSQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: ticketId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      subject: description.length > 40 ? description.slice(0, 40) + '...' : description,
      priority: priority.split(' ')[0],
      status: 'In Progress (Escalated to Support desk)'
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));
    } catch (err) {}

    setDescription('');
    triggerToast(`Ticket ${ticketId} created successfully! An emergency technical coordinator will contact you shortly.`);
  };

  const cancelTicket = (id) => {
    const updated = tickets.filter(t => t.id !== id);
    setTickets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));
    } catch (err) {}
    triggerToast(`Support ticket ${id} has been withdrawn.`);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const topicsList = [
    { name: 'Getting started', count: '12 articles' },
    { name: 'SOS & dispatch', count: '18 articles' },
    { name: 'Ambulance tracking', count: '9 articles' },
    { name: 'Health Vault & records', count: '14 articles' },
    { name: 'Family Safety circle', count: '11 articles' },
    { name: 'Hospitals & partners', count: '7 articles' },
    { name: 'Emergency Protection plans', count: '8 articles' },
    { name: 'Privacy & security', count: '10 articles' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-2 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#002764] dark:bg-primary text-white dark:text-on-primary px-5 py-3 rounded-2xl shadow-2xl border border-outline-variant/40 flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Article / Topic Modal Drawer */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest dark:bg-surface-container/90 border border-outline-variant/60 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start border-b border-outline-variant/30 pb-4 mb-5">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">ResQ-Plus Help Directory</span>
                  <h3 className="text-2xl font-extrabold text-[#002764] dark:text-[#b0c6ff]">{selectedTopic}</h3>
                </div>
                <button 
                  onClick={() => { setSelectedTopic(null); setActiveArticle(null); }} 
                  className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {activeArticle ? (
                <div className="space-y-4 animate-fadeIn my-4">
                  <button 
                    onClick={() => setActiveArticle(null)} 
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-2"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Back to topic articles
                  </button>
                  <h4 className="text-xl font-bold text-on-surface">{activeArticle.title}</h4>
                  <span className="inline-block text-xs text-on-surface-variant px-2.5 py-1 bg-surface-container-low rounded-lg font-semibold">{activeArticle.time} • Approved by ResQ-Plus Operations</span>
                  <div className="p-4 bg-surface-container-low/40 border border-outline-variant/40 rounded-2xl mt-4 text-on-surface text-base leading-relaxed font-normal">
                    {activeArticle.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[55vh] pr-1 custom-scrollbar">
                  <p className="text-sm text-on-surface-variant mb-4">Select an article below to view immediate technical guidance and diagnostic procedures:</p>
                  {(TOPIC_ARTICLES[selectedTopic] || []).map((art, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActiveArticle(art)}
                      className="p-4 bg-surface-container-low/50 hover:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <h5 className="font-bold text-on-surface group-hover:text-primary transition-colors text-base mb-1">{art.title}</h5>
                        <span className="text-xs font-medium text-on-surface-variant">{art.time}</span>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant/30 pt-4 mt-6 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant text-xs">Need human assistance? Our 24/7 desk is ready.</span>
              <button
                onClick={() => { setSelectedTopic(null); setActiveArticle(null); }}
                className="px-5 py-2 bg-[#002764] dark:bg-primary text-white dark:text-on-primary font-bold rounded-xl text-xs shadow-md"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Grid matching Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Section: Browse by Topic & Frequently Asked Questions */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-10">
          
          {/* Section 1: Browse by Topic */}
          <div>
            <h1 className="text-3xl font-extrabold text-[#002764] dark:text-[#b0c6ff] tracking-tight mb-6">
              Browse by topic
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topicsList.map((top) => (
                <button
                  key={top.name}
                  onClick={() => { setSelectedTopic(top.name); setActiveArticle(null); }}
                  className="flex items-center justify-between p-4 md:px-5 md:py-4 bg-surface-container-lowest dark:bg-surface-container/40 hover:bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 rounded-2xl shadow-sm hover:shadow transition-all group text-left"
                >
                  <span className="font-extrabold text-base text-on-surface group-hover:text-primary transition-colors">{top.name}</span>
                  <span className="text-xs font-semibold text-[#747783] shrink-0 bg-surface-container-low px-2.5 py-1 rounded-lg">{top.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Frequently Asked Questions */}
          <div className="pt-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#002764] dark:text-[#b0c6ff] tracking-tight mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQS_DATA.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div 
                    key={index}
                    className={`border transition-all duration-200 rounded-2xl overflow-hidden ${
                      isOpen 
                        ? 'bg-surface-container-low/70 border-primary/50 shadow-sm' 
                        : 'bg-surface-container-lowest dark:bg-surface-container/30 border-outline-variant/35 hover:border-outline-variant'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 font-extrabold text-base text-on-surface"
                    >
                      <span>{faq.question}</span>
                      <span className={`material-symbols-outlined text-outline shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-sm text-on-surface-variant leading-relaxed animate-fadeIn border-t border-outline-variant/20 pt-4 font-medium">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Section: Support Ticketing & Response Commitments */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
          
          {/* Card 1: Open a support ticket */}
          <div className="bg-surface-container-lowest dark:bg-surface-container/50 border border-outline-variant/40 rounded-3xl p-6 lg:p-7 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6 text-[#002764] dark:text-[#b0c6ff]">
              <span className="material-symbols-outlined text-2xl">confirmation_number</span>
              <h3 className="text-xl font-extrabold text-on-surface">Open a support ticket</h3>
            </div>

            <form onSubmit={handleTicketSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                >
                  <option value="Normal – question or request">Normal – question or request</option>
                  <option value="High – urgent system or dispatch query">High – urgent system or dispatch query</option>
                  <option value="Critical – immediate emergency dispatch escalation">Critical – immediate emergency dispatch escalation</option>
                  <option value="Low – feature suggestion or feedback">Low – feature suggestion or feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">How can we help?</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                  placeholder="Describe what happened or what assistance you need..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#001945] dark:bg-primary text-white dark:text-on-primary rounded-xl font-extrabold text-base shadow-md hover:bg-[#002764] active:scale-98 transition-all"
              >
                Submit ticket
              </button>
            </form>

            {/* My Active Tickets Tracker */}
            {tickets.length > 0 && (
              <div className="mt-8 pt-6 border-t border-outline-variant/30">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  My Active Support Tickets ({tickets.length})
                </h4>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {tickets.map(t => (
                    <div key={t.id} className="p-3 bg-surface-container-low/50 rounded-xl border border-outline-variant/30 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold font-mono text-primary">{t.id}</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{t.priority}</span>
                        </div>
                        <p className="font-bold text-on-surface truncate max-w-[190px]">{t.subject}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{t.status}</p>
                      </div>
                      <button 
                        onClick={() => cancelTicket(t.id)} 
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0" 
                        title="Withdraw ticket"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Response commitments */}
          <div className="bg-surface-container-lowest dark:bg-surface-container/50 border border-outline-variant/40 rounded-3xl p-6 lg:p-7 shadow-sm">
            <h3 className="text-xl font-extrabold text-[#002764] dark:text-[#b0c6ff] mb-4">Response commitments</h3>
            
            <div className="space-y-3.5 mb-6 text-sm font-semibold border-b border-outline-variant/20 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-on-surface font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">emergency</span>
                  Critical
                </span>
                <span className="font-bold text-on-surface font-mono">15 min · 24/7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface font-bold">High</span>
                <span className="font-semibold text-on-surface-variant font-mono">2 hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface">Normal</span>
                <span className="font-semibold text-on-surface-variant font-mono">1 business day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface">Low</span>
                <span className="font-semibold text-on-surface-variant font-mono">3 business days</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentTab('system-status')}
              className="font-extrabold text-[#0ea5e9] hover:text-[#0284c7] dark:text-blue-400 text-sm flex items-center gap-1.5 transition-colors group"
            >
              <span>Check system status</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
