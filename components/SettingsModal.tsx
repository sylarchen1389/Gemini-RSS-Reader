import React, { useRef, useState } from 'react';
import { X, Upload, Download, AlertTriangle, Check } from 'lucide-react';
import { parseOPML } from '../services/rss';
import { Feed } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFeeds: (feeds: { title: string, url: string }[]) => void;
  feeds: Feed[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportFeeds,
  feeds 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedFeeds = parseOPML(content);
        
        if (parsedFeeds.length === 0) {
          setImportStatus('error');
          setStatusMsg('No valid feeds found in OPML file.');
          return;
        }

        onImportFeeds(parsedFeeds);
        setImportStatus('success');
        setStatusMsg(`Successfully imported ${parsedFeeds.length} feeds.`);
      } catch (err) {
        setImportStatus('error');
        setStatusMsg('Failed to parse file.');
      }
    };

    reader.readAsText(file);
  };

  const handleExport = () => {
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <head>
        <title>Folo Feeds Export</title>
    </head>
    <body>
        ${feeds.map(f => `<outline text="${f.title.replace(/"/g, '&quot;')}" title="${f.title.replace(/"/g, '&quot;')}" type="rss" xmlUrl="${f.url.replace(/"/g, '&quot;')}" />`).join('\n        ')}
    </body>
</opml>`;

    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'folo_feeds.opml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Feed Management
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <Upload className="mb-2 text-gray-400 group-hover:text-indigo-500" size={24} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Import OPML</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".opml,.xml" 
                className="hidden" 
              />

              <button 
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <Download className="mb-2 text-gray-400 group-hover:text-indigo-500" size={24} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Export OPML</span>
              </button>
            </div>

            {importStatus === 'success' && (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                <Check size={16} />
                <span>{statusMsg}</span>
              </div>
            )}
            {importStatus === 'error' && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                <AlertTriangle size={16} />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>

          {/* AI Configuration Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              AI Configuration
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</span>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">Google Gemini</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</span>
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <Check size={14} className="mr-1" /> Configured (Env)
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                The AI service uses the API key configured in the environment. No manual entry required.
              </p>
            </div>
          </div>

        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
