import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Upload, FileAudio, X } from 'lucide-react';
import { AppState, Language } from '../types';
import { getMimeType } from '../utils/fileUtils';

interface AudioRecorderProps {
  appState: AppState;
  onRecordingComplete: (blob: Blob, language: Language) => void;
  onStateChange: (state: AppState) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ appState, onRecordingComplete, onStateChange }) => {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [language, setLanguage] = useState<Language>('Mixed');
  const [duration, setDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob, language);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      onStateChange(AppState.RECORDING);
      
      setDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
      onStateChange(AppState.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      onStateChange(AppState.PROCESSING);
    }
  };

  // File Upload Logic
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      } else {
        alert("Please select a valid audio or video file.");
      }
    }
  };

  const processFile = () => {
    if (selectedFile) {
      onStateChange(AppState.PROCESSING);
      onRecordingComplete(selectedFile, language);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const isRecording = appState === AppState.RECORDING;
  const isProcessing = appState === AppState.PROCESSING;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg mx-auto transition-all duration-300">
      
      {/* Configuration Header */}
      {!isRecording && !isProcessing && (
        <div className="w-full mb-8 space-y-4">
          {/* Mode Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('record')}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Mic className="w-4 h-4 mr-2" />
              Record Audio
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Audio Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none"
              style={{ backgroundImage: 'none' }} // Remove default arrow if needed, but standard is fine
            >
              <option value="Mixed">Mixed (Siraiki, Urdu & English)</option>
              <option value="Siraiki">Siraiki Only</option>
              <option value="Urdu">Urdu Only</option>
              <option value="English">English Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Action Area */}
      <div className="w-full flex flex-col items-center">
        
        {isProcessing ? (
          <div className="flex flex-col items-center py-8">
             <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             </div>
             <p className="text-slate-600 font-medium">Transcribing {mode === 'record' ? 'recording' : 'file'}...</p>
             <p className="text-slate-400 text-sm mt-1">This might take a moment.</p>
          </div>
        ) : mode === 'record' ? (
          <>
            <div className="mb-8 text-center">
              <div className={`text-5xl font-mono font-light tracking-wider transition-colors duration-300 ${isRecording ? 'text-slate-900' : 'text-slate-400'}`}>
                {formatTime(duration)}
              </div>
              <div className="mt-2 text-sm text-slate-500 font-medium h-6">
                {isRecording ? 'Recording...' : 'Ready to Record'}
              </div>
            </div>

            <div className="flex items-center justify-center">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg recording-pulse transition-all duration-200 active:scale-95"
                  aria-label="Stop Recording"
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-100"
                  aria-label="Start Recording"
                >
                  <Mic className="w-8 h-8" />
                  <div className="absolute inset-0 rounded-full border border-red-200 opacity-0 group-hover:opacity-100 scale-110 transition-all duration-500"></div>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="w-full">
            {!selectedFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center group"
              >
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">Click to upload audio</p>
                <p className="text-xs text-slate-400 mt-1">MP3, WAV, M4A, MP4 supported</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 overflow-hidden">
                       <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <FileAudio className="w-6 h-6 text-blue-600" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                       </div>
                    </div>
                    <button onClick={clearFile} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                       <X className="w-4 h-4" />
                    </button>
                 </div>
                 
                 <button 
                   onClick={processFile}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all active:translate-y-0.5 flex items-center justify-center"
                 >
                   Start Transcription
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-400 max-w-xs">
         {mode === 'record' 
           ? "Speak clearly. The AI will detect speech based on your language selection."
           : "Upload a clear audio file. Large files may take longer to process."
         }
      </div>
    </div>
  );
};

export default AudioRecorder;