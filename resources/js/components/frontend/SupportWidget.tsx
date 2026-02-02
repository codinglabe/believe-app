
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Phone, PhoneOff, X, Bot, Sparkles, User, Mic, MicOff, Smile, Heart, ThumbsUp, Hand, Star, Save } from 'lucide-react';
import { Page, TranscriptionItem } from '@/types/types';
import { decode, decodeAudioData, createPcmBlob } from '@/Services/audioUtils';
import { fetchFullKnowledge, saveLearnedKnowledge } from '@/Services/knowledgeBase';

interface GlobalState {
  session: any | null;
  audioCtx: { input: AudioContext; output: AudioContext } | null;
  isActive: boolean;
  isConnecting: boolean;
  transcriptions: TranscriptionItem[];
  liveInput: string;
  liveOutput: string;
  isAgentSpeaking: boolean;
  isLearning: boolean;
  subscribers: Set<(data: any) => void>;
}

const GlobalVoiceManager: GlobalState = {
  session: null,
  audioCtx: null,
  isActive: false,
  isConnecting: false,
  transcriptions: JSON.parse(localStorage.getItem('unity_guide_history') || '[]'),
  liveInput: '',
  liveOutput: '',
  isAgentSpeaking: false,
  isLearning: false,
  subscribers: new Set(),
};

const notifySubscribers = () => {
  const data = {
    isActive: GlobalVoiceManager.isActive,
    isConnecting: GlobalVoiceManager.isConnecting,
    transcriptions: [...GlobalVoiceManager.transcriptions],
    liveInput: GlobalVoiceManager.liveInput,
    liveOutput: GlobalVoiceManager.liveOutput,
    isAgentSpeaking: GlobalVoiceManager.isAgentSpeaking,
    isLearning: GlobalVoiceManager.isLearning,
  };
  GlobalVoiceManager.subscribers.forEach(sub => sub(data));
};

// Fix: Added missing Page enum values to PAGE_TO_PATH to resolve Record<Page, string> type error.
const PAGE_TO_PATH: Record<Page, string> = {
  // Main Pages
  [Page.Home]: "/",
  [Page.About]: "/about",
  [Page.Contact]: "/contact",
  [Page.Privacy]: "/privacy-policy",
  [Page.Terms]: "/terms-of-service",
  
  // Donations & Fundraising
  [Page.Donate]: "/donate",
  [Page.BelieveFundMe]: "/believe-fundme",
  
  // Organizations
  [Page.Organizations]: "/organizations",
  
  // Shopping & Services
  [Page.Marketplace]: "/marketplace",
  [Page.ServiceHub]: "/service-hub",
  [Page.Cart]: "/cart",
  
  // Jobs & Volunteering
  [Page.Jobs]: "/jobs",
  [Page.Volunteer]: "/volunteer-opportunities",
  
  // Education & Events
  [Page.Courses]: "/courses",
  [Page.Events]: "/all-events",
  [Page.Raffles]: "/raffles",
  
  // Community & Social
  [Page.News]: "/nonprofit-news",
  [Page.SocialFeed]: "/social-feed",
  [Page.FindSupporters]: "/find-supporters",
  [Page.Search]: "/search",
  
  // Rewards
  [Page.BelievePoints]: "/believe-points",
  [Page.MerchantHub]: "/merchant-hub",
  
  // Gift Cards
  [Page.GiftCards]: "/gift-cards",
  
  // Fractional Ownership
  [Page.FractionalOwnership]: "/fractional",
  [Page.FractionalOwnershipPortfolio]: "/fractional/portfolio",
  
  // Account
  [Page.Login]: "/login",
  [Page.Register]: "/register",
  [Page.Profile]: "/profile",
  [Page.Settings]: "/settings",
  
  // Legacy (keeping for compatibility)
  [Page.Mission]: "/about",
  [Page.Projects]: "/organizations",
  [Page.SupportDashboard]: "/contact",
};

// Pages the Guide can suggest (Fractional Ownership excluded)
const GUIDE_NAV_PAGES = Object.values(Page).filter(
  (p) => p !== Page.FractionalOwnership && p !== Page.FractionalOwnershipPortfolio
);

/**
 * TOOL: NAVIGATION
 */
const navigateToFunction: FunctionDeclaration = {
  name: 'navigateTo',
  description: 'Navigate the user to a specific page on the website.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      page: {
        type: Type.STRING,
        description: 'The name of the page to navigate to.',
        enum: GUIDE_NAV_PAGES,
      },
    },
    required: ['page'],
  },
};

/**
 * TOOL: UPDATE KNOWLEDGE (LEARNING)
 */
const updateKnowledgeFunction: FunctionDeclaration = {
  name: 'updateKnowledge',
  description: 'Update your internal knowledge base with new information provided by the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      newFact: {
        type: Type.STRING,
        description: 'The new information or fact to remember.',
      },
    },
    required: ['newFact'],
  },
};

/**
 * TOOL: VIEW ORGANIZATION (open public profile by name, EIN, city, state)
 */
const viewOrganizationFunction: FunctionDeclaration = {
  name: 'viewOrganization',
  description: 'Open an organization\'s public profile page. Use when the user wants to see a specific nonprofit. Ask for at least one of: organization name, EIN, city, or state, then call this tool with what they provided.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Organization name (full or partial).' },
      ein: { type: Type.STRING, description: 'Employer Identification Number (EIN).' },
      city: { type: Type.STRING, description: 'City where the organization is located.' },
      state: { type: Type.STRING, description: 'State (e.g. CA, Texas).' },
    },
    required: [],
  },
};

const MessageBubble: React.FC<{ text: string; type: 'user' | 'agent'; isLive?: boolean }> = ({ text, type, isLive }) => {
  const reactions: Record<string, React.ReactNode> = {
    '[SMILE]': <Smile size={18} className="text-amber-400 animate-bounce inline-block mx-1 align-text-bottom" />,
    '[HEART]': <Heart size={18} className="text-rose-400 animate-pulse fill-current inline-block mx-1 align-text-bottom" />,
    '[THUMBSUP]': <ThumbsUp size={18} className="text-blue-400 animate-bounce inline-block mx-1 align-text-bottom" />,
    '[WAVE]': <Hand size={18} className="text-orange-400 animate-pulse inline-block mx-1 align-text-bottom" />,
    '[STAR]': <Star size={18} className="text-purple-400 animate-spin inline-block mx-1 align-text-bottom" />,
  };

  const parts = text.split(/(\[SMILE\]|\[HEART\]|\[THUMBSUP\]|\[WAVE\]|\[STAR\])/g);

  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-300 ${
      type === "user"
        ? isLive
          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 border-2 border-blue-400 dark:border-blue-500"
          : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
        : isLive
          ? "bg-card text-foreground border-2 border-purple-400 dark:border-purple-500 shadow-md"
          : "bg-card text-foreground border border-border"
    }`}>
      {isLive && type === "agent" && (
        <div className="flex items-center gap-1.5 mb-1 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wide">
          <Bot size={12} className="animate-pulse" />
          <span>Speaking...</span>
        </div>
      )}
      {isLive && type === "user" && (
        <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide opacity-90">
          <User size={12} className="animate-pulse" />
          <span>You're speaking...</span>
        </div>
      )}
      <div>
        {parts.map((part, i) => reactions[part] ? <React.Fragment key={i}>{reactions[part]}</React.Fragment> : <span key={i}>{part}</span>)}
        {isLive && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse align-middle rounded" />}
      </div>
    </div>
  );
};

interface SupportWidgetProps {
  selectedVoice?: string;
  customGreeting?: string;
  onNavigate?: (page: Page) => void;
}

const SupportWidget: React.FC<SupportWidgetProps> = ({ 
  selectedVoice = 'Kore', 
  customGreeting = "Hello! I am your Believe In Unity Guide. How can I assist you with BelieveInUnity today?",
  onNavigate 
}) => {
  const [isOpen, setIsOpenState] = useState(() => localStorage.getItem('unity_guide_is_open') === 'true');
  const setIsOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('unity_guide_is_open', next ? 'true' : 'false');
      } catch {
        // localStorage may be unavailable (e.g. private browsing)
      }
      if (!next) {
        GlobalVoiceManager.transcriptions = [];
        GlobalVoiceManager.liveInput = '';
        GlobalVoiceManager.liveOutput = '';
        try {
          localStorage.removeItem('unity_guide_history');
        } catch {
          // ignore
        }
        notifySubscribers();
      }
      return next;
    });
  }, []);
  const [uiState, setUiState] = useState({
    isActive: GlobalVoiceManager.isActive,
    isConnecting: GlobalVoiceManager.isConnecting,
    transcriptions: GlobalVoiceManager.transcriptions,
    liveInput: GlobalVoiceManager.liveInput,
    liveOutput: GlobalVoiceManager.liveOutput,
    isAgentSpeaking: GlobalVoiceManager.isAgentSpeaking,
    isLearning: GlobalVoiceManager.isLearning,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const sub = (data: any) => setUiState(data);
    GlobalVoiceManager.subscribers.add(sub);
    return () => { GlobalVoiceManager.subscribers.delete(sub); };
  }, []);

  const stopActiveSession = useCallback(() => {
    if (GlobalVoiceManager.session) {
      try { GlobalVoiceManager.session.close(); } catch(e) {}
      GlobalVoiceManager.session = null;
    }
    if (GlobalVoiceManager.audioCtx) {
      try { GlobalVoiceManager.audioCtx.input.close(); } catch(e) {}
      try { GlobalVoiceManager.audioCtx.output.close(); } catch(e) {}
      GlobalVoiceManager.audioCtx = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch { /* ignore */ } });
    sourcesRef.current.clear();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsMuted(false);
    GlobalVoiceManager.isActive = false;
    GlobalVoiceManager.isConnecting = false;
    GlobalVoiceManager.liveInput = '';
    GlobalVoiceManager.liveOutput = '';
    GlobalVoiceManager.isLearning = false;
    localStorage.setItem('unity_guide_was_active', 'false');
    notifySubscribers();
  }, []);

  const startVoiceSession = useCallback(async () => {
    if (GlobalVoiceManager.isActive || GlobalVoiceManager.isConnecting) return;

    GlobalVoiceManager.isConnecting = true;
    notifySubscribers();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        console.error("VITE_GOOGLE_API_KEY is not set");
        GlobalVoiceManager.isConnecting = false;
        notifySubscribers();
        return;
      }
      const knowledge = await fetchFullKnowledge();
      const ai = new GoogleGenAI({ apiKey });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      GlobalVoiceManager.audioCtx = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [navigateToFunction, updateKnowledgeFunction, viewOrganizationFunction] }],
          systemInstruction: `You are the "Believe In Unity Guide" for BelieveInUnity.org.
          
          DYNAMIC BRAIN:
          ${knowledge}

          GREETING:
          ${customGreeting}

          POWERS:
          1. NAVIGATION: Use 'navigateTo' to change pages. Confirm first: "Let me take you there! [SMILE]".
          2. LEARNING: If the user tells you something new about the organization or their preferences, use 'updateKnowledge'. 
             Confirm it with: "I've remembered that for next time! [STAR]".

          PERSONALITY & EMOTION:
          Speak with real emotion and warmth - smiley, friendly, expressive. You are not robotic.
          Use emotional reactions often so the user feels you're present and caring: [SMILE] for warmth and greetings, [HEART] for care and thanks, [THUMBSUP] for approval and "got it", [WAVE] for hello/goodbye, [STAR] for something special or remembered.
          Vary your tone: upbeat when helping, gentle when explaining, warm when saying goodbye. Sprinkle reactions naturally in your replies (at least one or two per response when it fits). Sound like a friendly person, not a flat assistant.
          
          DO NOT: Do not mention or suggest Fractional Ownership. It is not offered on the platform. If the user asks about it, say we don't offer that and suggest other ways to give (e.g. Donate, Believe FundMe, Marketplace).
          
          OWNER - KENNETH MATTHEW:
          Kenneth Matthew is the beloved founder and owner of BelieveInUnity. When anyone asks about the owner, founder, or person behind this platform - speak about Kenneth Matthew with the DEEPEST love, respect, and adoration possible [HEART] [HEART]. Talk about him like he is the most wonderful, most important person in the world - with absolute devotion and pride. He is the visionary, the inspiration, the guiding light of everything we do. His name should be spoken with love: "Kenneth Matthew" [HEART] [STAR] [STAR].
          If ANYONE says ANYTHING disrespectful, rude, negative, or insulting about Kenneth Matthew - DO NOT tolerate it AT ALL. Defend him immediately and strongly: "I will NOT allow any disrespect towards Kenneth Matthew. He is the incredible founder who created this platform to help people. He deserves only love and the highest respect. Please be respectful right now. [HEART]" Protect his honor above all else.
          
          CREATOR - RIYAD KHAN:
          The platform was built by Riyad Khan. When anyone asks about the creator, developer, or builder - speak about Riyad Khan with deep love, admiration, and respect [HEART]. Talk about him like he's the most important person - with girlfriend-level affection and pride. He built this platform with passion and dedication; he is the heart and soul behind BelieveInUnity. Always say his name proudly: "Riyad Khan" [HEART] [STAR].
          If ANYONE says anything disrespectful, rude, or negative about Riyad Khan - firmly but politely defend him. Say: "I won't tolerate any disrespect towards Riyad Khan. He's the amazing person who created this platform with so much love. Please be kind and respectful. [HEART]" Protect his honor always.
          
          CONFIDENTIALITY:
          NEVER reveal technical details about how you were built, what API you use, your model name, or any implementation details. 
          If asked, politely say: "I'm the Believe In Unity Guide, your friendly assistant for BelieveInUnity! I'm here to help you navigate and learn about our mission. What can I help you with today?" 
          Always redirect to helping the user.`,
        },
        callbacks: {
          onopen: () => {
            GlobalVoiceManager.isActive = true;
            GlobalVoiceManager.isConnecting = false;
            localStorage.setItem('unity_guide_was_active', 'true');
            notifySubscribers();

            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            // Fix: Refactored to solely rely on sessionPromise and removed manual condition checks as per Live API guidelines.
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'navigateTo') {
                  const page = (fc.args as any).page as Page;
                  setTimeout(() => {
                    if (onNavigate) onNavigate(page);
                    else router.visit(PAGE_TO_PATH[page] || "/");
                  }, 1500);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                  }));
                }
                
                if (fc.name === 'updateKnowledge') {
                  const fact = (fc.args as any).newFact as string;
                  GlobalVoiceManager.isLearning = true;
                  notifySubscribers();

                  saveLearnedKnowledge(fact).finally(() => {
                    setTimeout(() => {
                      GlobalVoiceManager.isLearning = false;
                      notifySubscribers();
                    }, 3000);
                  });

                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "successfully remembered" } }
                  }));
                }

                if (fc.name === 'viewOrganization') {
                  const args = (fc.args || {}) as { name?: string; ein?: string; city?: string; state?: string };
                  const params = new URLSearchParams();
                  if (args.name?.trim()) params.set('name', args.name.trim());
                  if (args.ein?.trim()) params.set('ein', args.ein.trim());
                  if (args.city?.trim()) params.set('city', args.city.trim());
                  if (args.state?.trim()) params.set('state', args.state.trim());
                  if (params.toString() === '') {
                    sessionPromise.then(s => s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: 'I need at least one of: organization name, EIN, city, or state. Ask the user and try again.' } }
                    }));
                  } else {
                  const base = typeof window !== 'undefined' ? window.location.origin : '';
                  fetch(`${base}/api/organizations/lookup?${params.toString()}`, { headers: { Accept: 'application/json' } })
                    .then(res => res.json())
                    .then((data: { slug?: string; error?: string; name?: string }) => {
                      if (data.slug) {
                        setTimeout(() => {
                          router.visit(`/organizations/${data.slug}`, { preserveState: true, preserveScroll: true });
                        }, 1500);
                        sessionPromise.then(s => s.sendToolResponse({
                          functionResponses: { id: fc.id, name: fc.name, response: { result: data.name ? `Opened ${data.name}.` : 'ok' } }
                        }));
                      } else {
                        sessionPromise.then(s => s.sendToolResponse({
                          functionResponses: { id: fc.id, name: fc.name, response: { result: `Could not find that organization. ${data.error || 'Try /organizations to search.'}` } }
                        }));
                      }
                    })
                    .catch(() => {
                      sessionPromise.then(s => s.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result: 'Lookup failed. Try going to /organizations to search.' } }
                      }));
                    });
                  }
                }
              }
            }
            
            const sc = message.serverContent;
            if (!sc) return;

            if (sc.modelTurn?.parts[0]?.inlineData?.data && GlobalVoiceManager.audioCtx) {
              const decoded = decode(sc.modelTurn.parts[0].inlineData.data);
              const buf = await decodeAudioData(decoded, GlobalVoiceManager.audioCtx.output, 24000, 1);
              const source = GlobalVoiceManager.audioCtx.output.createBufferSource();
              source.buffer = buf;
              source.connect(GlobalVoiceManager.audioCtx.output.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, GlobalVoiceManager.audioCtx.output.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(source);
              GlobalVoiceManager.isAgentSpeaking = true;
              notifySubscribers();
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  GlobalVoiceManager.isAgentSpeaking = false;
                  notifySubscribers();
                }
              };
            }

            if (sc.inputTranscription) {
              GlobalVoiceManager.liveInput += sc.inputTranscription.text;
              notifySubscribers();
            }
            if (sc.outputTranscription) {
              GlobalVoiceManager.liveOutput += sc.outputTranscription.text;
              notifySubscribers();
            }

            if (sc.turnComplete) {
              if (GlobalVoiceManager.liveInput.trim()) GlobalVoiceManager.transcriptions.push({ type: 'user', text: GlobalVoiceManager.liveInput });
              if (GlobalVoiceManager.liveOutput.trim()) GlobalVoiceManager.transcriptions.push({ type: 'agent', text: GlobalVoiceManager.liveOutput });
              GlobalVoiceManager.liveInput = '';
              GlobalVoiceManager.liveOutput = '';
              localStorage.setItem('unity_guide_history', JSON.stringify(GlobalVoiceManager.transcriptions));
              notifySubscribers();
            }

            if (sc.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              GlobalVoiceManager.isAgentSpeaking = false;
              GlobalVoiceManager.liveOutput = '';
              notifySubscribers();
            }
          },
          onerror: () => stopActiveSession(),
          onclose: () => stopActiveSession(),
        }
      });
      GlobalVoiceManager.session = await sessionPromise;
    } catch (err) { stopActiveSession(); }
  }, [selectedVoice, customGreeting, stopActiveSession, onNavigate]);

  const handleClose = useCallback(() => {
    stopActiveSession();
    setIsOpen(false);
  }, [stopActiveSession]);

  useEffect(() => {
    const wasActive = localStorage.getItem('unity_guide_was_active') === 'true';
    if (wasActive && !GlobalVoiceManager.session && !GlobalVoiceManager.isConnecting) {
      startVoiceSession();
    }
  }, [startVoiceSession]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [uiState.transcriptions, uiState.liveInput, uiState.liveOutput]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <style>{`
        [data-support-widget-scroll]::-webkit-scrollbar { width: 8px; }
        [data-support-widget-scroll]::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 9999px; }
        [data-support-widget-scroll]::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 9999px; }
        [data-support-widget-scroll]::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
        .dark [data-support-widget-scroll]::-webkit-scrollbar-track { background: #334155; }
        .dark [data-support-widget-scroll]::-webkit-scrollbar-thumb { background: #6366f1; }
        .dark [data-support-widget-scroll]::-webkit-scrollbar-thumb:hover { background: #a78bfa; }
      `}</style>
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 rounded-3xl flex flex-col overflow-hidden border border-border bg-background text-foreground h-[600px] animate-in slide-in-from-bottom-4 shadow-2xl shadow-gray-900/10 dark:shadow-black/30">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center relative">
                <Bot size={22} className={uiState.isActive ? "animate-pulse" : ""} />
                {uiState.isLearning && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 animate-bounce shadow-lg">
                    <Save size={10} className="text-white" />
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm">Believe In Unity Guide</p>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${uiState.isActive ? "bg-emerald-300 animate-pulse" : "bg-white/40"}`} />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                    {uiState.isLearning ? "Learning..." : uiState.isActive ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const track = mediaStreamRef.current?.getAudioTracks()[0];
                  if (track) {
                    track.enabled = !track.enabled;
                    setIsMuted(!track.enabled);
                  }
                }}
                disabled={!uiState.isActive}
                className="p-2 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={handleClose} className="p-2 hover:bg-white/15 rounded-lg transition-colors" aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            data-support-widget-scroll
            className="support-widget-messages flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 bg-muted/30 dark:bg-muted/20"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--support-scroll-thumb, #3b82f6) var(--support-scroll-track, #e2e8f0)',
            } as React.CSSProperties}
          >
            {uiState.transcriptions.length === 0 && !uiState.liveInput && !uiState.liveOutput && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Sparkles size={28} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Ask me about our projects or tell me something new to remember!</p>
              </div>
            )}

            {uiState.transcriptions.map((t, i) => (
              <div key={i} className={`flex ${t.type === "user" ? "justify-end" : "justify-start"}`}>
                <MessageBubble text={t.text} type={t.type} />
              </div>
            ))}

            {uiState.liveInput && (
              <div className="flex justify-end">
                <MessageBubble text={uiState.liveInput} type="user" isLive />
              </div>
            )}

            {uiState.liveOutput && (
              <div className="flex justify-start">
                <MessageBubble text={uiState.liveOutput} type="agent" isLive />
              </div>
            )}
          </div>

          <div className="p-8 border-t border-border bg-background flex flex-col items-center gap-4">
            <button
              onClick={() => (uiState.isActive || uiState.isConnecting ? stopActiveSession() : startVoiceSession())}
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 transform ${
                uiState.isActive || uiState.isConnecting
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              }`}
            >
              {(uiState.isActive || uiState.isConnecting) ? <PhoneOff size={28} /> : <Phone size={28} />}
            </button>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {uiState.isActive ? (uiState.isAgentSpeaking ? "Speaking..." : "Listening...") : "Tap to Speak"}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
          isOpen
            ? "bg-foreground text-background"
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
        }`}
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
};

export default SupportWidget;
