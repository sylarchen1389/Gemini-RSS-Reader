import React, { useState } from 'react';
import { ExternalLink, Sparkles, Calendar, User } from 'lucide-react';
import { Article } from '../types';
import { generateSummary } from '../services/ai';

interface ReaderProps {
  article: Article | null;
  onUpdateArticle: (updated: Article) => void;
}

export const Reader: React.FC<ReaderProps> = ({ article, onUpdateArticle }) => {
  const [isSummarizing, setIsSummarizing] = useState(false);

  if (!article) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-950 flex items-center justify-center h-full">
        <div className="text-center space-y-3 text-gray-400">
          <div className="inline-block p-4 bg-gray-50 dark:bg-slate-900 rounded-full">
            <Sparkles size={32} className="text-gray-300 dark:text-slate-700" />
          </div>
          <p className="text-lg font-medium">Select an article to read</p>
        </div>
      </div>
    );
  }

  const handleSummarize = async () => {
    if (article.summary) return;

    setIsSummarizing(true);
    try {
      const summary = await generateSummary(article.content);
      onUpdateArticle({ ...article, summary });
    } catch (error) {
      console.error(error);
      alert("Failed to generate summary. Ensure API Key is configured.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const formattedDate = new Date(article.pubDate).toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex-1 bg-white dark:bg-slate-950 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        
        {/* Header */}
        <header className="mb-8 pb-8 border-b border-gray-100 dark:border-slate-800">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>
            {article.author && (
              <div className="flex items-center space-x-1">
                <User size={14} />
                <span>{article.author}</span>
              </div>
            )}
            <a 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Visit Website</span>
            </a>
          </div>

          {/* AI Summary Section */}
          <div className="bg-indigo-50 dark:bg-slate-900 rounded-xl p-6 border border-indigo-100 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-100 font-semibold">
                <Sparkles size={18} className="text-indigo-500" />
                <span>AI Summary</span>
              </div>
              {!article.summary && !isSummarizing && (
                <button
                  onClick={handleSummarize}
                  className="text-xs bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full border border-indigo-200 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all shadow-sm font-medium"
                >
                  Generate Summary
                </button>
              )}
            </div>
            
            {isSummarizing && (
              <div className="animate-pulse space-y-3 py-2">
                <div className="h-2 bg-indigo-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-indigo-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-2 bg-indigo-200 dark:bg-slate-700 rounded w-5/6"></div>
              </div>
            )}

            {article.summary && (
              <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                {/* Render summary lines as paragraphs if it's just text, or rely on markdown styling */}
                <div className="whitespace-pre-line">{article.summary}</div>
              </div>
            )}
            
            {!article.summary && !isSummarizing && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Use Gemini AI to quickly summarize the key points of this article.
              </p>
            )}
          </div>
        </header>

        {/* Content */}
        <article 
          className="prose prose-lg prose-slate dark:prose-invert max-w-none 
            prose-img:rounded-xl prose-a:text-indigo-600 dark:prose-a:text-indigo-400
            prose-headings:text-gray-900 dark:prose-headings:text-gray-100
            prose-p:text-gray-700 dark:prose-p:text-gray-300
            prose-pre:bg-gray-100 dark:prose-pre:bg-slate-800 prose-pre:text-gray-800 dark:prose-pre:text-gray-200
          "
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

      </div>
    </div>
  );
};
