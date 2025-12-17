import React from 'react';
import { Mic, FileText } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            ScribeFlow
          </span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Gemini AI Active</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 border-l pl-4 border-slate-200">
             <span className="font-medium text-slate-700">Urdu</span>
             <span>&</span>
             <span className="font-medium text-slate-700">English</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;