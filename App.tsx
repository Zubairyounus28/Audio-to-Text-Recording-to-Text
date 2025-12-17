import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import AudioRecorder from './components/AudioRecorder';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import { AppState, Language } from './types';
import { transcribeAudio } from './services/geminiService';
import { getMimeType } from './utils/fileUtils';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob, language: Language) => {
    try {
      setAppState(AppState.PROCESSING);
      setErrorMsg(null);
      
      // If it's a file upload, use its type, otherwise use recorded mimetype
      const mimeType = audioBlob instanceof File ? audioBlob.type : getMimeType();
      
      const text = await transcribeAudio(audioBlob, mimeType, language);
      
      setTranscript(text);
      setAppState(AppState.COMPLETED);
    } catch (err) {
      console.error(err);
      setErrorMsg("We encountered an issue processing your audio. Please check your connection and try again.");
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setTranscript('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-start pt-12 pb-12 px-4 sm:px-6">
        
        {/* Intro Text */}
        {appState === AppState.IDLE && (
           <div className="text-center mb-10 max-w-2xl animate-fade-in-up">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                Turn Voice into <span className="text-blue-600">Documents</span>
              </h1>
              <p className="text-lg text-slate-600">
                Record your meeting or upload an audio file.
                We'll transcribe your Urdu & English content into a Word file instantly.
              </p>
           </div>
        )}

        {/* Error Alert */}
        {appState === AppState.ERROR && errorMsg && (
          <div className="mb-8 w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 text-red-800">
             <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div>
               <h3 className="font-semibold text-sm">Processing Error</h3>
               <p className="text-sm mt-1">{errorMsg}</p>
               <button 
                 onClick={handleReset}
                 className="mt-3 text-xs font-bold uppercase tracking-wide text-red-700 hover:text-red-900"
               >
                 Try Again
               </button>
             </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="w-full">
          {appState !== AppState.COMPLETED ? (
            <div className="animate-in fade-in zoom-in duration-300">
                <AudioRecorder 
                  appState={appState}
                  onStateChange={setAppState}
                  onRecordingComplete={handleRecordingComplete}
                />
            </div>
          ) : (
             <div className="animate-in slide-in-from-bottom-8 duration-500">
                <TranscriptionDisplay 
                  transcript={transcript}
                  onReset={handleReset}
                />
             </div>
          )}
        </div>

      </main>
      
      <footer className="py-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ScribeFlow. Powered by Google Gemini 2.5 Flash.</p>
      </footer>
    </div>
  );
};

export default App;