import React, { useState, useRef } from 'react';
import { Download, Check, Copy, FileText, Volume2, Play, Loader2, Music } from 'lucide-react';
import { generateAndDownloadDocx } from '../services/docxService';
import { generateSpeech } from '../services/geminiService';
import { createWavBlob } from '../utils/fileUtils';

interface TranscriptionDisplayProps {
  transcript: string;
  onReset: () => void;
}

// Available voices in Gemini
const VOICES = [
  { id: 'Puck', name: 'Puck (Neutral)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Kore', name: 'Kore (Calm)' },
  { id: 'Fenrir', name: 'Fenrir (Energetic)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
];

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcript, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    generateAndDownloadDocx(transcript, `ScribeFlow-Transcript-${Date.now()}.docx`);
  };

  const handleGenerateAudio = async () => {
    if (!transcript) return;
    
    setIsGeneratingAudio(true);
    setAudioUrl(null);

    try {
      const pcmData = await generateSpeech(transcript, selectedVoice);
      const wavBlob = createWavBlob(pcmData, 24000);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate audio. The text might be too long or the service is busy.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `ScribeFlow-Audio-${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 lg:flex-row h-auto lg:h-[650px]">
      
      {/* Main Transcript Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2 text-slate-700">
             <FileText className="w-5 h-5 text-blue-600" />
             <span className="font-semibold text-sm uppercase tracking-wide">Transcript</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleCopy}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-sm flex items-center"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5 text-green-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            
            <button 
              onClick={handleDownloadDoc}
              className="flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              DOCX
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
          <div 
              className="prose prose-slate max-w-none text-lg leading-relaxed whitespace-pre-wrap text-slate-800 font-serif"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
              {transcript}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onReset}
            className="text-sm text-slate-500 hover:text-red-600 hover:underline transition-colors"
          >
            Discard & New Recording
          </button>
        </div>
      </div>

      {/* Audio / TTS Sidebar */}
      <div className="w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-fit lg:h-full">
         <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-sm uppercase tracking-wide text-slate-700">Audio & Voice</span>
         </div>
         
         <div className="p-5 flex flex-col gap-6">
            
            {/* Voice Selection */}
            <div className="space-y-3">
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select AI Voice</label>
               <div className="grid grid-cols-1 gap-2">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`flex items-center px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                        selectedVoice === voice.id 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500/20' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-3 ${selectedVoice === voice.id ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                      {voice.name}
                    </button>
                  ))}
               </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
              className={`w-full py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center ${
                isGeneratingAudio 
                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                   : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'
              }`}
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Generate Audio
                </>
              )}
            </button>

            {/* Audio Player Area */}
            {audioUrl ? (
              <div className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500">Preview</span>
                    <span className="text-xs text-purple-600 font-medium">Ready</span>
                 </div>
                 <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    controls 
                    className="w-full h-10 rounded-lg focus:outline-none"
                 />
                 <button
                    onClick={handleDownloadAudio}
                    className="w-full flex items-center justify-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                 >
                    <Download className="w-4 h-4 mr-2" />
                    Download Audio (.WAV)
                 </button>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                     <Music className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">Generate audio to listen</p>
               </div>
            )}
         </div>

         <div className="mt-auto p-4 bg-slate-50 text-[10px] text-slate-400 text-center leading-tight">
            * Uses standard Gemini AI voices. For cloning, specialized tools are required.
         </div>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;