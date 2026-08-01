import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { speakInLanguage, stopSpeaking as stopSpeakingEngine, initVoices } from '../../utils/speechVoice';

// ─── Language-specific voice mapping for Web Speech API ────────────────
const LANG_VOICE_MAP = {
  en: { bcp47: 'en-IN', label: 'English' },
  hi: { bcp47: 'hi-IN', label: 'हिन्दी' },
  kn: { bcp47: 'kn-IN', label: 'ಕನ್ನಡ' },
  ta: { bcp47: 'ta-IN', label: 'தமிழ்' },
  te: { bcp47: 'te-IN', label: 'తెలుగు' },
};

// ─── Pre-scripted safety guidance for each language ────────────────────
const SAFETY_SCRIPTS = {
  en: {
    greeting: "Hello! I am your ResQ-Plus AI Safety Assistant. I am here to help you with emergency road accident protocols, first aid guidance, and safety awareness. How can I help you today?",
    topics: {
      "accident": "In a road accident: First, ensure your own safety. Move your vehicle to the side. Turn on hazard lights. Place warning triangles 50 meters behind. Then call emergency services or press the SOS button in ResQ-Plus. Do not move injured persons unless there is a fire risk.",
      "first aid": "For first aid: Check if the person is breathing. If there is heavy bleeding, apply firm pressure with a clean cloth. Keep the patient warm with a blanket. Do not give water to unconscious persons. Keep talking to conscious victims to keep them calm.",
      "sos": "To activate SOS: Press the red SOS button on your ResQ-Plus dashboard. This will automatically send your GPS coordinates, blood type, and allergy information from your Health Vault to the nearest emergency responders. You can also press your phone power button 5 times for silent SOS.",
      "golden hour": "The Golden Hour is the critical first 60 minutes after a traumatic injury. Getting proper medical treatment within this window dramatically increases survival rates. ResQ-Plus optimizes ambulance routing to ensure arrival within 15 minutes.",
      "cpr": "To perform CPR: Place the heel of your hand on the center of the chest. Push hard and fast at 100-120 compressions per minute. Allow the chest to fully recoil between compressions. If trained, give rescue breaths after every 30 compressions.",
    }
  },
  hi: {
    greeting: "नमस्ते! मैं आपकी ResQ-Plus AI सुरक्षा सहायक हूँ। मैं आपकी आपातकालीन सड़क दुर्घटना प्रोटोकॉल, प्राथमिक उपचार मार्गदर्शन, और सुरक्षा जागरूकता में मदद करने के लिए यहाँ हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    topics: {
      "दुर्घटना": "सड़क दुर्घटना में: सबसे पहले अपनी सुरक्षा सुनिश्चित करें। अपने वाहन को किनारे ले जाएं। हैजार्ड लाइट्स चालू करें। चेतावनी त्रिकोण 50 मीटर पीछे रखें। फिर आपातकालीन सेवाओं को कॉल करें या ResQ-Plus में SOS बटन दबाएं। जब तक आग का खतरा न हो, घायल व्यक्तियों को हिलाएं नहीं।",
      "प्राथमिक उपचार": "प्राथमिक उपचार के लिए: जांचें कि व्यक्ति सांस ले रहा है या नहीं। अगर भारी रक्तस्राव हो रहा है, तो साफ कपड़े से मजबूत दबाव डालें। रोगी को कंबल से गर्म रखें। बेहोश व्यक्तियों को पानी न दें। सचेत पीड़ितों से बात करते रहें ताकि वे शांत रहें।",
      "sos": "SOS सक्रिय करने के लिए: अपने ResQ-Plus डैशबोर्ड पर लाल SOS बटन दबाएं। यह स्वचालित रूप से आपके GPS निर्देशांक, रक्त प्रकार, और आपके हेल्थ वॉल्ट से एलर्जी की जानकारी निकटतम आपातकालीन उत्तरदाताओं को भेजेगा।",
      "गोल्डन आवर": "गोल्डन आवर एक गंभीर चोट के बाद पहले 60 मिनट की महत्वपूर्ण अवधि है। इस समय सीमा के भीतर उचित चिकित्सा उपचार प्राप्त करने से जीवित रहने की दर नाटकीय रूप से बढ़ जाती है। ResQ-Plus 15 मिनट के भीतर पहुंचने के लिए एम्बुलेंस रूटिंग को अनुकूलित करता है।",
      "सीपीआर": "सीपीआर करने के लिए: अपने हाथ की एड़ी को छाती के केंद्र पर रखें। प्रति मिनट 100-120 संपीड़न की दर से जोर से और तेजी से दबाएं। संपीड़न के बीच छाती को पूरी तरह से वापस आने दें।",
    }
  },
  kn: {
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ResQ-Plus AI ಸುರಕ್ಷತಾ ಸಹಾಯಕ. ತುರ್ತು ರಸ್ತೆ ಅಪಘಾತ ಪ್ರೋಟೋಕಾಲ್‌ಗಳು, ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಮಾರ್ಗದರ್ಶನ, ಮತ್ತು ಸುರಕ್ಷತಾ ಜಾಗೃತಿಯಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    topics: {
      "ಅಪಘಾತ": "ರಸ್ತೆ ಅಪಘಾತದಲ್ಲಿ: ಮೊದಲು ನಿಮ್ಮ ಸುರಕ್ಷತೆಯನ್ನು ಖಚಿತಪಡಿಸಿ. ನಿಮ್ಮ ವಾಹನವನ್ನು ಪಕ್ಕಕ್ಕೆ ಸರಿಸಿ. ಹ್ಯಾಝರ್ಡ್ ಲೈಟ್ಸ್ ಆನ್ ಮಾಡಿ. 50 ಮೀಟರ್ ಹಿಂದೆ ಎಚ್ಚರಿಕೆ ತ್ರಿಕೋನಗಳನ್ನು ಇರಿಸಿ. ನಂತರ ತುರ್ತು ಸೇವೆಗಳಿಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ResQ-Plus ನಲ್ಲಿ SOS ಬಟನ್ ಒತ್ತಿ.",
      "ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ": "ಪ್ರಥಮ ಚಿಕಿತ್ಸೆಗಾಗಿ: ವ್ಯಕ್ತಿ ಉಸಿರಾಡುತ್ತಿದ್ದಾನೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ. ಭಾರೀ ರಕ್ತಸ್ರಾವವಿದ್ದರೆ, ಶುದ್ಧ ಬಟ್ಟೆಯಿಂದ ಗಟ್ಟಿಯಾಗಿ ಒತ್ತಡ ಹಾಕಿ. ರೋಗಿಯನ್ನು ಕಂಬಳಿಯಿಂದ ಬೆಚ್ಚಗಾಗಿ ಇಡಿ.",
      "sos": "SOS ಸಕ್ರಿಯಗೊಳಿಸಲು: ನಿಮ್ಮ ResQ-Plus ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಕೆಂಪು SOS ಬಟನ್ ಒತ್ತಿ. ಇದು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನಿಮ್ಮ GPS ನಿರ್ದೇಶಾಂಕಗಳು, ರಕ್ತ ಪ್ರಕಾರ, ಮತ್ತು ಅಲರ್ಜಿ ಮಾಹಿತಿಯನ್ನು ಹತ್ತಿರದ ತುರ್ತು ಪ್ರತಿಸ್ಪಂದಕರಿಗೆ ಕಳುಹಿಸುತ್ತದೆ.",
      "ಗೋಲ್ಡನ್ ಅವರ್": "ಗೋಲ್ಡನ್ ಅವರ್ ಎಂದರೆ ಗಂಭೀರ ಗಾಯದ ನಂತರದ ಮೊದಲ 60 ನಿಮಿಷಗಳ ನಿರ್ಣಾಯಕ ಅವಧಿ. ಈ ಸಮಯದೊಳಗೆ ಸರಿಯಾದ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ಪಡೆಯುವುದು ಬದುಕುಳಿಯುವ ಪ್ರಮಾಣವನ್ನು ನಾಟಕೀಯವಾಗಿ ಹೆಚ್ಚಿಸುತ್ತದೆ.",
    }
  },
  ta: {
    greeting: "வணக்கம்! நான் உங்கள் ResQ-Plus AI பாதுகாப்பு உதவியாளர். அவசரகால சாலை விபத்து நெறிமுறைகள், முதலுதவி வழிகாட்டுதல், மற்றும் பாதுகாப்பு விழிப்புணர்வில் உங்களுக்கு உதவ நான் இங்கே இருக்கிறேன். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    topics: {
      "விபத்து": "சாலை விபத்தில்: முதலில் உங்கள் பாதுகாப்பை உறுதிப்படுத்துங்கள். உங்கள் வாகனத்தை பக்கவாட்டில் நிறுத்துங்கள். ஹாசர்ட் விளக்குகளை ஒளிரச் செய்யுங்கள். 50 மீட்டர் பின்னால் எச்சரிக்கை முக்கோணங்களை வையுங்கள். பின்னர் அவசர சேவைகளை அழைக்கவும்.",
      "முதலுதவி": "முதலுதவிக்கு: நபர் சுவாசிக்கிறார்களா என்று சோதிக்கவும். கடுமையான இரத்தப்போக்கு இருந்தால், சுத்தமான துணியால் உறுதியாக அழுத்தம் கொடுங்கள். நோயாளியை போர்வையால் சூடாக வையுங்கள்.",
      "sos": "SOS செயல்படுத்த: உங்கள் ResQ-Plus டாஷ்போர்டில் சிவப்பு SOS பொத்தானை அழுத்தவும். இது தானாகவே உங்கள் GPS ஆயத்தொகுப்புகள், இரத்த வகை, மற்றும் ஒவ்வாமை தகவலை அருகிலுள்ள அவசர பதிலளிப்பாளர்களுக்கு அனுப்பும்.",
      "கோல்டன் அவர்": "கோல்டன் அவர் என்பது கடுமையான காயத்திற்குப் பிறகு முதல் 60 நிமிடங்களின் முக்கியமான காலம். இந்த நேரத்திற்குள் சரியான மருத்துவ சிகிச்சை பெறுவது உயிர்வாழ்வு விகிதத்தை வியத்தகு முறையில் அதிகரிக்கிறது.",
    }
  },
  te: {
    greeting: "నమస్కారం! నేను మీ ResQ-Plus AI భద్రతా సహాయకుడిని. అత్యవసర రోడ్ ప్రమాద ప్రోటోకాల్స్, ప్రథమ చికిత్స మార్గదర్శకత్వం, మరియు భద్రతా అవగాహనలో మీకు సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను. ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?",
    topics: {
      "ప్రమాదం": "రోడ్ ప్రమాదంలో: మొదట మీ భద్రతను నిర్ధారించుకోండి. మీ వాహనాన్ని పక్కకు తీసుకెళ్ళండి. హజార్డ్ లైట్లు ఆన్ చేయండి. 50 మీటర్ల వెనుక హెచ్చరిక త్రిభుజాలు ఉంచండి. అప్పుడు అత్యవసర సేవలకు కాల్ చేయండి.",
      "ప్రథమ చికిత్స": "ప్రథమ చికిత్స కోసం: వ్యక్తి శ్వాస తీసుకుంటున్నారా అని తనిఖీ చేయండి. తీవ్రమైన రక్తస్రావం ఉంటే, శుభ్రమైన గుడ్డతో గట్టిగా ఒత్తిడి అప్లై చేయండి. రోగికి దుప్పటితో వెచ్చదనం ఇవ్వండి.",
      "sos": "SOS యాక్టివేట్ చేయడానికి: మీ ResQ-Plus డాష్‌బోర్డ్‌లో ఎరుపు SOS బటన్ నొక్కండి. ఇది ఆటోమేటిక్‌గా మీ GPS కోఆర్డినేట్లు, రక్త రకం, మరియు అలర్జీ సమాచారాన్ని సమీపంలోని అత్యవసర ప్రతిస్పందకులకు పంపుతుంది.",
      "గోల్డెన్ అవర్": "గోల్డెన్ అవర్ అంటే తీవ్రమైన గాయం తర్వాత మొదటి 60 నిమిషాల క్లిష్టమైన కాలం. ఈ సమయంలో సరైన వైద్య చికిత్స పొందడం మనుగడ రేటును నాటకీయంగా పెంచుతుంది.",
    }
  }
};

// ─── Quick action suggestions per language ─────────────────────────────
const QUICK_ACTIONS = {
  en: ["What to do in an accident?", "How to do first aid?", "How to use SOS?", "What is Golden Hour?", "How to perform CPR?"],
  hi: ["दुर्घटना में क्या करें?", "प्राथमिक उपचार कैसे करें?", "SOS कैसे इस्तेमाल करें?", "गोल्डन आवर क्या है?", "सीपीआर कैसे करें?"],
  kn: ["ಅಪಘಾತದಲ್ಲಿ ಏನು ಮಾಡಬೇಕು?", "ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಹೇಗೆ?", "SOS ಹೇಗೆ ಬಳಸುವುದು?", "ಗೋಲ್ಡನ್ ಅವರ್ ಎಂದರೇನು?"],
  ta: ["விபத்தில் என்ன செய்வது?", "முதலுதவி எப்படி செய்வது?", "SOS எப்படி பயன்படுத்துவது?", "கோல்டன் அவர் என்ன?"],
  te: ["ప్రమాదంలో ఏం చేయాలి?", "ప్రథమ చికిత్స ఎలా?", "SOS ఎలా వాడాలి?", "గోల్డెన్ అవర్ అంటే?"],
};

export default function AIVoiceAssistant() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech voices asynchronously on component mount
  useEffect(() => {
    initVoices();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize with greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const script = SAFETY_SCRIPTS[lang] || SAFETY_SCRIPTS.en;
      setMessages([{ role: 'assistant', content: script.greeting }]);
    }
  }, [isOpen, lang]);

  // ─── Speech Synthesis (Text-to-Speech) ─────────────────────────────
  const speakText = (text) => {
    stopSpeakingEngine();
    setIsSpeaking(true);

    // speakInLanguage uses Google Translate TTS for Kannada/Tamil/Telugu
    // since Windows has no native TTS voices for these languages
    speakInLanguage(text, lang, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    stopSpeakingEngine();
    setIsSpeaking(false);
  };

  // ─── Speech Recognition (Voice Input) ──────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    const voiceConfig = LANG_VOICE_MAP[lang] || LANG_VOICE_MAP.en;
    recognition.lang = voiceConfig.bcp47;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      setIsListening(false);
      // Auto-send after voice input
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // ─── Message Processing ───────────────────────────────────────────
  const findResponse = (query) => {
    const script = SAFETY_SCRIPTS[lang] || SAFETY_SCRIPTS.en;
    const lowerQuery = query.toLowerCase();

    // Search through topic keywords
    for (const [key, response] of Object.entries(script.topics)) {
      if (lowerQuery.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerQuery.substring(0, Math.min(lowerQuery.length, 6)))) {
        return response;
      }
    }

    // Fallback: search English topics too if non-English
    if (lang !== 'en') {
      const enScript = SAFETY_SCRIPTS.en;
      for (const [key, response] of Object.entries(enScript.topics)) {
        if (lowerQuery.includes(key.toLowerCase())) {
          // Return the matched topic from the current language if available, otherwise English
          return script.topics[Object.keys(script.topics)[Object.keys(enScript.topics).indexOf(key)]] || response;
        }
      }
    }

    // Generic fallback response per language
    const fallbacks = {
      en: "I can help you with: road accident protocols, first aid guidance, SOS activation, Golden Hour information, and CPR instructions. Please ask about any of these topics!",
      hi: "मैं आपकी मदद कर सकती हूँ: सड़क दुर्घटना प्रोटोकॉल, प्राथमिक उपचार, SOS सक्रियण, गोल्डन आवर, और सीपीआर निर्देश। कृपया इनमें से किसी भी विषय के बारे में पूछें!",
      kn: "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ: ರಸ್ತೆ ಅಪಘಾತ ಪ್ರೋಟೋಕಾಲ್, ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ, SOS ಸಕ್ರಿಯಗೊಳಿಸುವಿಕೆ, ಗೋಲ್ಡನ್ ಅವರ್. ದಯವಿಟ್ಟು ಈ ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಿ!",
      ta: "நான் உங்களுக்கு உதவ முடியும்: சாலை விபத்து நெறிமுறைகள், முதலுதவி, SOS செயல்படுத்தல், கோல்டன் அவர். இந்த தலைப்புகளைப் பற்றி கேளுங்கள்!",
      te: "నేను మీకు సహాయం చేయగలను: రోడ్ ప్రమాద ప్రోటోకాల్స్, ప్రథమ చికిత్స, SOS యాక్టివేషన్, గోల్డెన్ అవర్. దయచేసి ఈ అంశాల గురించి అడగండి!",
    };
    return fallbacks[lang] || fallbacks.en;
  };

  const handleSend = (textToSend) => {
    const query = textToSend || userInput;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setUserInput('');

    // Generate response
    setTimeout(() => {
      const response = findResponse(query);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      // Auto-speak the response
      speakText(response);
    }, 400);
  };

  const quickActions = QUICK_ACTIONS[lang] || QUICK_ACTIONS.en;

  const labels = {
    en: { title: "AI Safety Voice Assistant", subtitle: "Speaks all 5 languages", speakBtn: "Speak", stopBtn: "Stop", placeholder: "Ask about safety protocols...", listening: "Listening...", quickLabel: "Quick Actions:" },
    hi: { title: "AI सुरक्षा ध्वनि सहायक", subtitle: "सभी 5 भाषाएँ बोलता है", speakBtn: "बोलें", stopBtn: "रुकें", placeholder: "सुरक्षा प्रोटोकॉल के बारे में पूछें...", listening: "सुन रहा है...", quickLabel: "त्वरित कार्रवाई:" },
    kn: { title: "AI ಸುರಕ್ಷತಾ ಧ್ವನಿ ಸಹಾಯಕ", subtitle: "ಎಲ್ಲಾ 5 ಭಾಷೆಗಳಲ್ಲಿ ಮಾತನಾಡುತ್ತದೆ", speakBtn: "ಮಾತನಾಡಿ", stopBtn: "ನಿಲ್ಲಿಸಿ", placeholder: "ಸುರಕ್ಷತಾ ಪ್ರೋಟೋಕಾಲ್ ಬಗ್ಗೆ ಕೇಳಿ...", listening: "ಕೇಳುತ್ತಿದೆ...", quickLabel: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು:" },
    ta: { title: "AI பாதுகாப்பு குரல் உதவியாளர்", subtitle: "அனைத்து 5 மொழிகளிலும் பேசுகிறது", speakBtn: "பேசுங்கள்", stopBtn: "நிறுத்து", placeholder: "பாதுகாப்பு நெறிமுறைகளைப் பற்றி கேளுங்கள்...", listening: "கேட்கிறது...", quickLabel: "விரைவு செயல்கள்:" },
    te: { title: "AI భద్రతా వాయిస్ అసిస్టెంట్", subtitle: "అన్ని 5 భాషలలో మాట్లాడుతుంది", speakBtn: "మాట్లాడండి", stopBtn: "ఆపండి", placeholder: "భద్రతా ప్రోటోకాల్స్ గురించి అడగండి...", listening: "వింటోంది...", quickLabel: "త్వరిత చర్యలు:" },
  };
  const l = labels[lang] || labels.en;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 z-50 bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 text-white p-4 rounded-full shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 group ring-4 ring-purple-500/30"
        title={l.title}
      >
        <span className="material-symbols-outlined text-2xl font-black">record_voice_over</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 group-hover:pr-2 transition-all duration-300 text-xs font-black tracking-wider uppercase">
          {l.title}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-8 z-50 w-[420px] max-h-[600px] bg-surface border border-outline-variant rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-5 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">record_voice_over</span>
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{l.title}</h3>
            <p className="text-[10px] text-white/70 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {l.subtitle} • {LANG_VOICE_MAP[lang]?.label}
            </p>
          </div>
        </div>
        <button onClick={() => { stopSpeaking(); setIsOpen(false); }} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px] bg-surface-container-lowest">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-tr-none'
                : 'bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-tl-none'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-black text-purple-500">AI {l.title}</span>
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                    className="text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors font-bold"
                  >
                    <span className="material-symbols-outlined text-[12px]">{isSpeaking ? 'stop' : 'volume_up'}</span>
                    {isSpeaking ? l.stopBtn : l.speakBtn}
                  </button>
                </div>
              )}
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-outline-variant/30 bg-surface-container-lowest">
          <p className="text-[9px] uppercase tracking-wider font-black text-on-surface-variant mb-1.5">{l.quickLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-[10px] px-2.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/60 text-on-surface hover:bg-surface-container-high hover:border-purple-500/40 transition-all font-bold"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-outline-variant/50 bg-surface flex items-center gap-2">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
            isListening
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
              : 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high'
          }`}
          title={isListening ? l.stopBtn : l.speakBtn}
        >
          <span className="material-symbols-outlined text-lg">{isListening ? 'mic_off' : 'mic'}</span>
        </button>
        <input
          type="text"
          value={isListening ? l.listening : userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={l.placeholder}
          disabled={isListening}
          className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-purple-500 font-semibold disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!userInput.trim() || isListening}
          className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-400 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  );
}
