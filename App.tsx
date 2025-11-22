
import React from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { Reader } from './components/Reader';
import { SettingsModal } from './components/SettingsModal';
import { useFolo } from './hooks/useFolo';

const App: React.FC = () => {
  // Architecture: Presentation Layer detached from Business Logic
  const { state, actions } = useFolo();

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Global Modals */}
      <SettingsModal 
        isOpen={state.isSettingsOpen}
        onClose={() => actions.setIsSettingsOpen(false)}
        onImportFeeds={actions.importFeeds}
        feeds={state.feeds}
      />

      {/* Layout: Three-Pane Design (Folo Style) */}
      
      {/* Pane 1: Navigation / Sidebar */}
      <div className="hidden md:block h-full flex-shrink-0 z-20">
        <Sidebar 
          feeds={state.feeds}
          selectedFeedId={state.selectedFeedId}
          onSelectFeed={actions.setSelectedFeedId}
          onAddFeed={actions.addFeed}
          onDeleteFeed={actions.deleteFeed}
          onOpenSettings={() => actions.setIsSettingsOpen(true)}
        />
      </div>

      {/* Pane 2: Feed / Article List */}
      {/* Responsive: Hidden on mobile if article is selected */}
      <div className={`
        ${state.selectedArticleId ? 'hidden lg:block' : 'w-full'} 
        md:w-auto h-full flex-shrink-0 border-r border-gray-200 dark:border-slate-800 z-10
      `}>
        <ArticleList 
          feeds={state.feeds}
          articles={state.articles}
          selectedArticleId={state.selectedArticleId}
          onSelectArticle={(a) => actions.setSelectedArticleId(a.id)}
          isLoading={state.isLoading}
          filterText={state.filterText}
          onFilterChange={actions.setFilterText}
        />
      </div>

      {/* Pane 3: Reader / Detail View */}
      {/* Responsive: Full width on mobile if selected */}
      <div className={`
        ${!state.selectedArticleId ? 'hidden lg:block' : 'w-full'} 
        flex-1 h-full relative bg-white dark:bg-slate-950
      `}>
         {/* Mobile Navigation Back Button */}
        {state.selectedArticleId && (
          <button 
            onClick={() => actions.setSelectedArticleId(null)}
            className="lg:hidden absolute top-4 left-4 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-full shadow-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300"
            aria-label="Back to list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        
        <Reader 
          article={state.selectedArticle} 
          onUpdateArticle={actions.updateArticle}
        />
      </div>
    </div>
  );
};

export default App;
