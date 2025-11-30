import React, { useState, useEffect } from 'react';
import { AppTab, VocabCard, VocabFolder } from './types';
import { TranslateTab } from './components/TranslateTab';
import { VocabTab } from './components/VocabTab';
import { QuizTab } from './components/QuizTab';

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TRANSLATE);
  const [vocabulary, setVocabulary] = useState<VocabCard[]>([]);
  const [folders, setFolders] = useState<VocabFolder[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Load Data from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('thaiMasterData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.vocabulary) setVocabulary(data.vocabulary);
        if (data.folders) setFolders(data.folders);
      } catch (e) {
        console.error("Error parsing local storage data", e);
      }
    }
  }, []);

  // Persistence Helper (LocalStorage Only)
  const saveToLocalStorage = (newVocab: VocabCard[], newFolders: VocabFolder[]) => {
    localStorage.setItem('thaiMasterData', JSON.stringify({ vocabulary: newVocab, folders: newFolders }));
  };

  // Vocab Actions
  const addToVocab = (card: VocabCard) => {
    const newVocab = [...vocabulary, card];
    setVocabulary(newVocab);
    saveToLocalStorage(newVocab, folders);
    
    setNotificationMsg('Saved to Flashcards');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const deleteFromVocab = (id: string) => {
    const newVocab = vocabulary.filter(c => c.id !== id);
    setVocabulary(newVocab);
    saveToLocalStorage(newVocab, folders);
  };

  const updateVocabCard = (updatedCard: VocabCard) => {
    const newVocab = vocabulary.map(c => c.id === updatedCard.id ? updatedCard : c);
    setVocabulary(newVocab);
    saveToLocalStorage(newVocab, folders);
  };

  // Folder Actions
  const createFolder = (name: string) => {
    const newFolder: VocabFolder = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
    };
    const newFolders = [...folders, newFolder];
    setFolders(newFolders);
    saveToLocalStorage(vocabulary, newFolders);
  };

  const deleteFolder = (id: string) => {
    // Remove the folder
    const newFolders = folders.filter(f => f.id !== id);
    setFolders(newFolders);

    // Move cards in that folder to 'Uncategorized' (remove folderId)
    const newVocab = vocabulary.map(card => {
      if (card.folderId === id) {
        const { folderId, ...rest } = card;
        return rest as VocabCard;
      }
      return card;
    });
    setVocabulary(newVocab);

    saveToLocalStorage(newVocab, newFolders);
  };

  const moveCard = (card: VocabCard) => {
     updateVocabCard(card);
  };

  // Import Data
  const importData = (importedVocab: VocabCard[], importedFolders: VocabFolder[]) => {
    // Simple merge logic: Add items if their ID does not exist
    let addedCards = 0;
    const existingVocabIds = new Set(vocabulary.map(v => v.id));
    const newVocab = [...vocabulary];
    
    importedVocab.forEach(card => {
        if (!existingVocabIds.has(card.id)) {
            newVocab.push(card);
            addedCards++;
        }
    });

    const existingFolderIds = new Set(folders.map(f => f.id));
    const newFolders = [...folders];
    
    importedFolders.forEach(folder => {
        if (!existingFolderIds.has(folder.id)) {
            newFolders.push(folder);
        }
    });

    setVocabulary(newVocab);
    setFolders(newFolders);
    saveToLocalStorage(newVocab, newFolders);
    
    setNotificationMsg(`Imported ${addedCards} new cards`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-thai-100 selection:text-thai-800 pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-gradient-to-tr from-thai-600 to-thai-400 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                  ก
               </div>
               <h1 className="text-xl font-bold tracking-tight text-gray-900">TukTuk Thai</h1>
            </div>
            
            {/* Simple Stats */}
            <div className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
               {vocabulary.length} words
            </div>
        </div>
      </header>

      {/* Notification Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-2xl z-50 transition-all transform ${showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
             {notificationMsg}
          </div>
      </div>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-140px)]">
        <div className={activeTab === AppTab.TRANSLATE ? 'block' : 'hidden'}>
          <TranslateTab 
             onAddToVocab={addToVocab} 
             vocabulary={vocabulary}
             folders={folders}
          />
        </div>
        
        <div className={activeTab === AppTab.VOCABULARY ? 'block' : 'hidden'}>
          <VocabTab 
            vocabulary={vocabulary} 
            folders={folders}
            onDelete={deleteFromVocab} 
            onCreateFolder={createFolder}
            onDeleteFolder={deleteFolder}
            onMoveCard={moveCard}
            onImport={importData}
          />
        </div>

        <div className={activeTab === AppTab.QUIZ ? 'block' : 'hidden'}>
          <QuizTab vocabulary={vocabulary} folders={folders} />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex justify-around items-center pb-4">
           <button 
             onClick={() => setActiveTab(AppTab.TRANSLATE)}
             className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${activeTab === AppTab.TRANSLATE ? 'text-thai-600 bg-thai-50' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
             </svg>
             <span className="text-[10px] font-bold">Translate</span>
           </button>
           
           <button 
             onClick={() => setActiveTab(AppTab.VOCABULARY)}
             className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${activeTab === AppTab.VOCABULARY ? 'text-thai-600 bg-thai-50' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
             <span className="text-[10px] font-bold">Flashcards</span>
           </button>

           <button 
             onClick={() => setActiveTab(AppTab.QUIZ)}
             className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${activeTab === AppTab.QUIZ ? 'text-thai-600 bg-thai-50' : 'text-gray-400 hover:text-gray-600'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
             </svg>
             <span className="text-[10px] font-bold">Quiz</span>
           </button>
        </div>
      </nav>
    </div>
  );
}

export default App;