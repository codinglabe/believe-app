import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, X, Waves, Bot, Sparkles, User, Monitor } from "lucide-react"
import { voiceClient, type ChatMessage, type LiveClientState } from "@/lib/voice-client"

// Streaming Text Component for smooth typing effect
const StreamingText: React.FC<{ text: string; isComplete?: boolean }> = ({ text, isComplete }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // If text resets or is shorter (new message context), reset immediately
    if (text.length < displayedText.length) {
      setDisplayedText(text);
      return;
    }

    if (text.length > displayedText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, 10); // Fast typing for responsiveness
      return () => clearTimeout(timer);
    }
  }, [text, displayedText]);

  return (
    <span className="relative whitespace-pre-wrap">
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse align-middle opacity-70" />
      )}
    </span>
  );
};

export function VoiceAssistant() {
  // --- State Management ---
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("voiceAssistantOpen")
    return saved === "true"
  })

  // Sync isOpen to localStorage
  useEffect(() => {
    localStorage.setItem("voiceAssistantOpen", isOpen.toString())
  }, [isOpen])

  // Client State Sync (from Singleton)
  const [clientState, setClientState] = useState<LiveClientState>(voiceClient.state)
  const [messages, setMessages] = useState<ChatMessage[]>(voiceClient.messages)
  const [error, setError] = useState<string | null>(voiceClient.error)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Subscribe to Singleton Updates
  useEffect(() => {
    setClientState(voiceClient.state)
    setMessages(voiceClient.messages)

    const unsubscribe = voiceClient.subscribe(
      (state) => setClientState(state),
      (msgs) => setMessages(msgs),
      (err) => setError(err)
    )
    return () => unsubscribe()
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, clientState.isListening, clientState.isSpeaking])

  const toggleConnection = () => {
    if (clientState.isConnected) {
      voiceClient.disconnect();
    } else {
      voiceClient.connect();
    }
  }

  // --- Derived State for UI ---
  // Identify the "active" message (being typed or spoken) vs "history"
  // In our VoiceClient, the last message *is* the active one if !isFinal
  // But strictly, we can just map all messages.
  // The user's design shows "Live Bubbles" separate from history. 
  // We can replicate this by checking if the last message is !isFinal.

  const historyMessages = messages.filter(m => m.isFinal || (messages.indexOf(m) !== messages.length - 1));
  const activeMessage = messages.length > 0 && !messages[messages.length - 1].isFinal
    ? messages[messages.length - 1]
    : null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none sm:items-center">
      <div className="pointer-events-auto flex flex-col items-end sm:items-center">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95, originY: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-4 w-[calc(100vw-3rem)] sm:w-96 rounded-3xl shadow-2xl flex flex-col overflow-hidden bg-white/90 backdrop-blur-xl border border-white/20 dark:bg-slate-900/90 dark:border-slate-800 max-h-[min(650px,calc(100vh-120px))]"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-none">Believe In Unity Guide</span>
                    <div className="flex items-center mt-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${clientState.isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {clientState.isConnected ? 'Live' : 'Standby'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 h-[400px]">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 py-12">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                      <Sparkles size={32} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Believe In Unity Guide Active</h4>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Tap the phone to start a voice conversation. Everything you say will be shown here.</p>
                  </div>
                )}

                {/* Render History */}
                {historyMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : msg.role === 'system'
                        ? 'bg-gray-100 text-gray-500 text-xs italic w-full text-center border border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800'
                      }`}>
                      {msg.role !== 'system' && (
                        <div className="flex items-center space-x-1.5 mb-1 opacity-70">
                          {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                          <span className="text-[10px] font-bold uppercase">{msg.role === 'user' ? 'You' : 'Guide'}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {/* Render Active Message (Live Bubbles) */}
                {activeMessage && (
                  <div className={`flex ${activeMessage.role === 'user' ? 'justify-end animate-in fade-in slide-in-from-right-2' : 'justify-start animate-in fade-in slide-in-from-left-2'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${activeMessage.role === 'user'
                      ? 'bg-blue-600/90 text-white rounded-tr-none ring-2 ring-blue-400/20'
                      : 'bg-white text-slate-800 border-2 border-blue-100 rounded-tl-none shadow-sm dark:bg-gray-900 dark:text-gray-200 dark:border-blue-900'
                      }`}>
                      <div className={`flex items-center space-x-1.5 mb-1 opacity-70 ${activeMessage.role === 'model' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
                        {activeMessage.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                        <span className="text-[10px] font-bold uppercase">
                          {activeMessage.role === 'user' ? 'Speaking...' : 'Guide Speaking...'}
                        </span>
                      </div>
                      <StreamingText text={activeMessage.text} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <span className="px-3 py-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-100 dark:border-red-900/50">{error}</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-4">
                <button
                  onClick={toggleConnection}
                  // disabled={false} // We can disable if strict connecting state is added
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${clientState.isConnected
                    ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-100 dark:shadow-red-900/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-blue-900/20'
                    }`}
                >
                  {clientState.isConnected ? (
                    <PhoneOff size={26} className="text-white" />
                  ) : (
                    <Phone size={26} className="text-white" />
                  )}
                </button>
                <div className="text-center h-4 flex items-center justify-center">
                  {clientState.isConnected ? (
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {clientState.isSpeaking ? 'Agent Speaking' : 'Listening'}
                      </span>
                      <Waves size={14} className="animate-pulse" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Voice Assistance</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          layout
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group relative"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div key="bot" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                <Bot size={28} className="group-hover:rotate-6 transition-transform" />
              </motion.div>
            )}
          </AnimatePresence>

          {clientState.isConnected && !isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
          )}
        </motion.button>
      </div>
    </div>
  )
}
