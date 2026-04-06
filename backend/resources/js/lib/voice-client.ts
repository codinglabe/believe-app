import { router } from "@inertiajs/react";

export interface ChatMessage {
    id: string;
    role: "user" | "model" | "system";
    text: string;
    timestamp: Date;
    isFinal: boolean | undefined;
}

export interface LiveClientState {
    isConnected: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    volume: number;
}

type StateListener = (state: LiveClientState) => void;
type MessageListener = (messages: ChatMessage[]) => void;
type ErrorListener = (error: string | null) => void;

class VoiceClient {
    private static instance: VoiceClient;
    
    // State
    public state: LiveClientState = {
        isConnected: false,
        isSpeaking: false,
        isListening: false,
        volume: 0,
    };
    public messages: ChatMessage[] = [];
    public error: string | null = null;

    // Listeners
    private stateListeners: Set<StateListener> = new Set();
    private messageListeners: Set<MessageListener> = new Set();
    private errorListeners: Set<ErrorListener> = new Set();

    // Audio
    private audioContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime: number = 0;
    private recognition: any = null;
    
    // WebSocket / Config
    private ws: WebSocket | null = null;
    private API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    private HOST = "generativelanguage.googleapis.com";
    private MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025"; // Must include 'models/' prefix for WS

    private constructor() {}

    public static getInstance(): VoiceClient {
        if (!VoiceClient.instance) {
            VoiceClient.instance = new VoiceClient();
        }
        return VoiceClient.instance;
    }

    public subscribe(
        onStateChange: StateListener,
        onMessageChange: MessageListener,
        onErrorChange: ErrorListener
    ) {
        this.stateListeners.add(onStateChange);
        this.messageListeners.add(onMessageChange);
        this.errorListeners.add(onErrorChange);

        onStateChange(this.state);
        onMessageChange(this.messages);
        onErrorChange(this.error);

        return () => {
            this.stateListeners.delete(onStateChange);
            this.messageListeners.delete(onMessageChange);
            this.errorListeners.delete(onErrorChange);
        };
    }

    private emitState() {
        this.stateListeners.forEach(l => l({ ...this.state }));
    }

    private emitMessages() {
        this.messageListeners.forEach(l => l([...this.messages]));
    }

    private emitError(err: string | null) {
        this.error = err;
        this.errorListeners.forEach(l => l(err));
    }

    public async connect() {
        if (this.state.isConnected) return;
        if (!this.API_KEY) {
            this.emitError("Google API Key not found.");
            return;
        }

        this.emitError(null);
        
        try {
            // 1. Audio Context (16kHz for Input, 24kHz for Output handled implicitly by CreateBuffer)
            if (!this.audioContext) {
                 this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: 16000 
                });
                await this.registerProcessor();
            }
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // 1b. Start Local Recognition (Hybrid Real-Time)
            this.startLocalRecognition();

            // 2. WebSocket Connection
            const url = `wss://${this.HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.API_KEY}`;
            this.ws = new WebSocket(url);

            this.ws.onopen = async () => {
                this.state.isConnected = true;
                this.emitState();
                
                // Send Setup Message
                this.sendSetupMessage();
                
                // Start Mic
                await this.startMicrophone();
            };

            this.ws.onmessage = (event) => {
                this.handleServerMessage(event.data);
            };

            this.ws.onclose = (e) => {
                console.log("WebSocket Closed", e.code, e.reason);
                this.state.isConnected = false;
                this.emitState();
                
                if (e.code === 1000) {
                     // Normal closure
                } else {
                     this.emitError(`Disconnected (${e.code})`);
                }
                this.disconnect();
            };
            
            this.ws.onerror = (e) => {
                console.error("WebSocket Error", e);
                this.emitError("Connection Error");
            };

        } catch (err: any) {
            console.error("Connection Failed", err);
             if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
                this.emitError("Microphone access denied");
            } else {
                this.emitError(`Connection failed: ${err.message || 'Unknown'}`);
            }
            this.disconnect();
        }
    }

    private sendSetupMessage() {
        if (!this.ws) return;
        
        const systemInstruction = `You are the 'Unity Guide' for BelieveInUnity.org.
        Help visitors learn about campaigns and navigate.
        If asked to go somewhere, use the 'navigate' tool.
        Detect the user's language and reply in that language.
        Be concise and warm.`;

        const setup = {
            setup: {
                model: this.MODEL,
                generation_config: {
                    response_modalities: ["AUDIO"], // Strictly AUDIO for stability
                    speech_config: {
                         voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
                    }
                },
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                tools: [{
                    function_declarations: [{
                        name: "navigate",
                        description: "Navigate to a page",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                page: { type: "STRING", description: "Path e.g. /donate" }
                            },
                            required: ["page"]
                        }
                    }]
                }]
            }
        };
        
        this.ws.send(JSON.stringify(setup));
    }

    private async handleServerMessage(data: any) {
        // Blob check
        if (data instanceof Blob) {
             const text = await data.text();
             data = JSON.parse(text);
        } else if (typeof data === 'string') {
             data = JSON.parse(data);
        } else {
             return; // Unknown
        }

        // Error
        if (data.error) {
            console.error(data.error);
            this.emitError(data.error.message || "Server Error");
            return;
        }

        // Tool Call
        if (data.toolCall) {
            this.handleToolCall(data.toolCall);
            return;
        }

        // Server Content
        if (data.serverContent) {
            const { modelTurn, turnComplete } = data.serverContent;
            
            if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                    if (part.inlineData) {
                        this.playAudioChunk(part.inlineData.data);
                    }
                }
            }

            if (turnComplete) {
                 const last = this.messages[this.messages.length - 1];
                 if (last && !last.isFinal) last.isFinal = true;
                 this.emitMessages();
            }
        }
    }

    private handleToolCall(toolCall: any) {
         for (const fc of toolCall.functionCalls) {
             if (fc.name === 'navigate') {
                 const page = (fc.args as any).page;
                 router.visit(page);
                 
                 this.messages.push({
                    id: Date.now().toString(),
                    role: 'system',
                    text: `Navigating to ${page}...`,
                    timestamp: new Date(),
                    isFinal: true
                });
                this.emitMessages();

                // Send Response
                const response = {
                    tool_response: {
                        function_responses: [{
                            name: fc.name,
                            id: fc.id,
                            response: { result: "Navigated" }
                        }]
                    }
                };
                this.ws?.send(JSON.stringify(response));
             }
         }
    }

    private async startMicrophone() {
        if (!this.audioContext) return;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
            
            this.workletNode.port.onmessage = (event) => {
                const pcmBuffer = event.data;
                const base64 = this.arrayBufferToBase64(pcmBuffer);
                
                // Volume
                this.calculateVolume(pcmBuffer);
                
                // Send to WebSocket
                if (this.state.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                     const msg = {
                         realtime_input: {
                             media_chunks: [{
                                 mime_type: "audio/pcm",
                                 data: base64
                             }]
                         }
                     };
                     this.ws.send(JSON.stringify(msg));
                }
            };
            
            source.connect(this.workletNode);
        } catch (e) {
            throw e;
        }
    }

    private startLocalRecognition() {
        if (!('webkitSpeechRecognition' in window)) return;
        
        try {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = navigator.language || 'en-US';

            this.recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript || interimTranscript) {
                    const text = finalTranscript || interimTranscript;
                    this.updateLastUserMessage(text);
                }
            };
            
            this.recognition.onend = () => {
                if (this.state.isConnected && this.recognition) {
                    try { this.recognition.start(); } catch(e) {}
                }
            };

            this.recognition.start();

        } catch (e) {
            console.warn("Local recognition failed", e);
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        this.state.isConnected = false;
        this.state.isSpeaking = false;
        this.state.isListening = false;
        this.state.volume = 0;
        this.emitState();
    }
    
    // --- Helpers ---

    private updateLastUserMessage(text: string) {
         const lastMsg = this.messages[this.messages.length - 1];
         if (lastMsg && lastMsg.role === 'user' && !lastMsg.isFinal) {
             lastMsg.text = text;
         } else {
             this.messages.push({
                 id: Date.now().toString(),
                 role: 'user',
                 text: text,
                 timestamp: new Date(),
                 isFinal: false
             });
         }
         this.emitMessages();
    }

    private async registerProcessor() {
        try {
             await this.audioContext!.audioWorklet.addModule("data:text/javascript;charset=utf-8," + encodeURIComponent(`
                class PCMProcessor extends AudioWorkletProcessor {
                    constructor() { super(); this.buffer = []; }
                    process(inputs, outputs, parameters) {
                        const input = inputs[0];
                        if (input.length > 0) {
                            const float32 = input[0];
                            const int16 = new Int16Array(float32.length);
                            for (let i=0; i<float32.length; i++) {
                                const s = Math.max(-1, Math.min(1, float32[i]));
                                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }
                            this.port.postMessage(int16.buffer, [int16.buffer]);
                        }
                        return true;
                    }
                }
                registerProcessor("pcm-processor", PCMProcessor)
            `));
        } catch(e) { console.error("Worklet error", e); }
    }

    private async playAudioChunk(base64Data: string) {
        if (!this.audioContext) return;
        const binary = atob(base64Data);
        // ... Conversion logic ...
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i=0; i<int16.length; i++) float32[i] = int16[i] / 32768.0;
        
        // 24kHz output for Gemini Native
        const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        const start = Math.max(now, this.nextStartTime);
        source.start(start);
        this.nextStartTime = start + buffer.duration;
        
        this.state.isSpeaking = true;
        this.emitState();
        
        source.onended = () => {
             if (this.audioContext!.currentTime >= this.nextStartTime - 0.05) {
                 this.state.isSpeaking = false;
                 this.emitState();
             }
        };
    }

    private calculateVolume(buffer: ArrayBuffer) {
        const int16 = new Int16Array(buffer);
        let sum = 0;
        for (let i=0; i<int16.length; i+=10) sum += Math.abs(int16[i]);
        const avg = sum / (int16.length/10);
        this.state.volume = Math.min(1, avg / 10000);
        this.state.isListening = true; 
        this.emitState();
    }

    private arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

export const voiceClient = VoiceClient.getInstance();
