import React, { useState, useEffect, useRef } from 'react';
import { generateSpeech } from './services/geminiService';
import RadarVisualizer from './components/RadarVisualizer';
import { VoiceName } from './types';
import { audioBufferToWav } from './services/audioUtils';
import { Square, Loader2, Volume2, Download, RefreshCw, Zap, Mic, Play, ArrowRight, User } from 'lucide-react';

const DEFAULT_TEXT = `Welcome to FastX Voice Generator. Experience the next generation of AI audio synthesis. Select a premium voice model, input your script, and generate studio-quality narration instantly.`;
const MAX_CHARS = 5000;

// Configuration for Voice Personas
interface VoicePersona {
  id: string;
  apiVoice: VoiceName;
  displayName: string;
  tags: string;
}

const VOICE_OPTIONS: VoicePersona[] = [
  { id: 'v_jason', apiVoice: VoiceName.Puck, displayName: 'Jason', tags: 'Deep // Authoritative' },
  { id: 'v_mike', apiVoice: VoiceName.Charon, displayName: 'Mike', tags: 'Deep // Narrative' },
  { id: 'v_henry', apiVoice: VoiceName.Fenrir, displayName: 'Henry', tags: 'Intense // Strong' },
  { id: 'v_jerry', apiVoice: VoiceName.Puck, displayName: 'Jerry', tags: 'Energetic // Clear' },
  { id: 'v_thomas', apiVoice: VoiceName.Charon, displayName: 'Thomas', tags: 'Low // Resonant' },
  { id: 'v_james', apiVoice: VoiceName.Fenrir, displayName: 'James', tags: 'Bold // Direct' },
];

const App: React.FC = () => {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_OPTIONS[1].id); // Default to Mike
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Initialize AudioContext
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    return () => {
      audioContextRef.current?.close();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, []);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const handlePreview = async (e: React.MouseEvent, voice: VoicePersona) => {
    e.stopPropagation();
    if (!audioContextRef.current || previewVoiceId) return;

    await ensureAudioContext();
    setPreviewVoiceId(voice.id);
    stopAudio(); 

    try {
      // Keep text extremely short to fix latency/delay issues
      const previewText = `Hello, I am ${voice.displayName}.`;
      const buffer = await generateSpeech(previewText, voice.apiVoice, audioContextRef.current);
      playAudio(buffer, () => setPreviewVoiceId(null));
    } catch (err) {
      console.error(err);
      setPreviewVoiceId(null);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || !audioContextRef.current) return;
    if (text.length > MAX_CHARS) {
      alert(`Character limit exceeded. Please reduce to ${MAX_CHARS} characters.`);
      return;
    }

    const selectedOption = VOICE_OPTIONS.find(v => v.id === selectedVoiceId);
    if (!selectedOption) return;

    await ensureAudioContext();
    setIsLoading(true);
    setAudioBuffer(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    stopAudio();

    try {
      const buffer = await generateSpeech(text, selectedOption.apiVoice, audioContextRef.current);
      setAudioBuffer(buffer);
      
      const wavBlob = audioBufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);
      setDownloadUrl(url);

      playAudio(buffer, () => setIsPlaying(false));
      setIsPlaying(true);
    } catch (error) {
      console.error(error);
      alert("Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (buffer: AudioBuffer, onEnded?: () => void) => {
    if (!audioContextRef.current || !analyserRef.current) return;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      if (onEnded) onEnded();
    };

    source.start(0);
    sourceNodeRef.current = source;
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setPreviewVoiceId(null);
  };

  const handleClear = () => {
    setText('');
    setAudioBuffer(null);
    setDownloadUrl(null);
    stopAudio();
  };

  return (
    <div className="min-h-screen text-zinc-200 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
      
      {/* Navbar / Header */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-zinc-950/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 relative flex items-center justify-between">
          
          {/* Left: Logo Mark */}
          <div className="flex items-center gap-3 z-10 relative">
            <div className="relative group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-lime-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative p-2 bg-zinc-950 rounded-lg flex items-center justify-center">
                 <Zap className="text-white w-5 h-5 fill-lime-400" />
              </div>
            </div>
          </div>

          {/* Center: Main Title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none">
            <h1 className="text-lg md:text-2xl lg:text-3xl font-black tracking-tighter uppercase italic transform -skew-x-6 hover:scale-105 transition-transform duration-300">
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-400 to-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                 Fast X Voice Generator
               </span>
            </h1>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-4 z-10 relative">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-medium tracking-wide text-lime-300">
                <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse shadow-[0_0_8px_#84cc16]"></span>
                GEMINI_1.5_PRO // CONNECTED
             </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Panel: Visualizer & Settings */}
          <div className="lg:col-span-4 space-y-6">
             {/* Visualizer Card */}
             <div className="w-full bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
               <RadarVisualizer isPlaying={isPlaying || previewVoiceId !== null} analyser={analyserRef.current} />
             </div>

             {/* Voice Selection Card */}
             <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden flex flex-col max-h-[600px]">
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest flex items-center gap-2 relative z-10 flex-shrink-0">
                  <User className="w-3 h-3 text-lime-400" /> 
                  Select Voice Persona
                </h3>
                
                <div className="space-y-3 relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {VOICE_OPTIONS.map((voice) => (
                    <div 
                      key={voice.id}
                      onClick={() => setSelectedVoiceId(voice.id)}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                        selectedVoiceId === voice.id 
                          ? 'bg-gradient-to-r from-emerald-500/20 to-lime-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`w-1 h-8 rounded-full transition-all duration-300 ${selectedVoiceId === voice.id ? 'bg-lime-400 scale-y-110' : 'bg-zinc-700'}`}></div>
                         <div>
                            <span className={`block font-bold text-sm tracking-wide ${selectedVoiceId === voice.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{voice.displayName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono uppercase">{voice.tags}</span>
                         </div>
                      </div>

                      <button 
                        onClick={(e) => handlePreview(e, voice)}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          previewVoiceId === voice.id 
                            ? 'bg-lime-500/20 text-lime-300' 
                            : 'hover:bg-white/10 text-zinc-500 hover:text-white'
                        }`}
                        title="Quick Preview"
                      >
                         {previewVoiceId === voice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Right Panel: Input & Actions */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Input Area */}
            <div className="flex-1 bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-1 relative group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-lime-500/10 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative h-full flex flex-col p-6">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-lime-300/80 font-mono text-[10px] tracking-wider uppercase">
                        <Mic className="w-3 h-3" />
                        <span>Script Input</span>
                    </div>
                    <button 
                      onClick={handleClear}
                      className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 border border-white/5"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                 </div>
                 
                 <textarea
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   className="flex-1 w-full min-h-[320px] bg-transparent border-0 resize-none focus:ring-0 text-zinc-200 text-lg leading-8 font-light placeholder-zinc-600 focus:outline-none selection:bg-lime-500/30"
                   spellCheck={false}
                   placeholder="Type something amazing here..."
                 />
                 
                 <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="h-1 flex-1 bg-zinc-800 rounded-full mr-4 overflow-hidden max-w-[200px]">
                       <div 
                         className={`h-full transition-all duration-300 ${text.length > MAX_CHARS ? 'bg-red-500' : 'bg-lime-500'}`}
                         style={{ width: `${Math.min((text.length / MAX_CHARS) * 100, 100)}%` }}
                       ></div>
                    </div>
                    <span className={`text-[10px] font-mono ${text.length > MAX_CHARS ? 'text-red-400' : 'text-zinc-500'}`}>
                       {text.length} / {MAX_CHARS}
                    </span>
                 </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button
                  onClick={handleGenerate}
                  disabled={(isLoading && !isPlaying) || text.length > MAX_CHARS}
                  className={`relative group overflow-hidden h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-[0.98] ${
                    isLoading 
                      ? 'bg-zinc-800 cursor-wait' 
                      : isPlaying
                        ? 'bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500/30'
                        : 'text-white shadow-lg shadow-emerald-500/25'
                  }`}
                >
                  {!isLoading && !isPlaying && (
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-600 group-hover:scale-105 transition-transform duration-500"></div>
                  )}
                  
                  <span className="relative flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                        <span className="text-zinc-400">Synthesizing...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square className="w-5 h-5 fill-current" />
                        <span>Stop Playback</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 fill-current" />
                        <span>Generate Audio</span>
                        <ArrowRight className="w-4 h-4 opacity-50 -ml-1 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
               </button>

               {downloadUrl ? (
                 <a
                   href={downloadUrl}
                   download={`fastx-voice-${Date.now()}.wav`}
                   className="h-16 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all duration-300 group"
                 >
                   <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                   <span>Download .WAV</span>
                 </a>
               ) : (
                 <div className="h-16 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider bg-zinc-900/50 border border-white/5 text-zinc-600 cursor-not-allowed">
                   <Download className="w-5 h-5 opacity-50" />
                   <span>Download</span>
                 </div>
               )}
            </div>
            
            <p className="text-center text-[10px] text-zinc-600 font-mono">
              Powered by <span className="text-lime-600/60">Gemini 2.5 Flash</span> Audio Generation
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;