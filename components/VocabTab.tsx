import React, { useState, useRef } from 'react';
import { VocabCard, VocabFolder } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface VocabTabProps {
  vocabulary: VocabCard[];
  folders: VocabFolder[];
  onDelete: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveCard: (card: VocabCard) => void;
  onImport: (vocab: VocabCard[], folders: VocabFolder[]) => void;
}

export const VocabTab: React.FC<VocabTabProps> = ({ 
    vocabulary, 
    folders, 
    onDelete, 
    onCreateFolder, 
    onDeleteFolder,
    onMoveCard,
    onImport
}) => {
  const [viewFolderId, setViewFolderId] = useState<string | 'ROOT'>('ROOT');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate counts
  const getCount = (folderId?: string) => {
    return vocabulary.filter(c => c.folderId === folderId).length;
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleDeleteFolderWithConfirm = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the folder
    if (window.confirm(`Are you sure you want to delete folder "${name}"? Cards inside will be moved to General.`)) {
      onDeleteFolder(id);
    }
  };

  // Export Data to JSON file
  const handleExport = () => {
    const data = JSON.stringify({ vocabulary, folders }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tuktuk-thai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import Data from JSON file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.vocabulary && Array.isArray(json.vocabulary)) {
          onImport(json.vocabulary, json.folders || []);
        } else {
          alert("Invalid file format: Missing vocabulary data.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderCard = (card: VocabCard) => (
    <div key={card.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
       
       <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
          {/* Move Dropdown */}
          <div className="relative group/move">
             <button className="text-gray-300 hover:text-thai-600 p-1" title="Move to Folder">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
             </button>
             <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover/move:block z-10 overflow-hidden">
                <div className="text-xs font-semibold text-gray-400 px-3 py-2 bg-gray-50 uppercase">Move to...</div>
                <button 
                   onClick={() => onMoveCard({...card, folderId: undefined})}
                   className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-thai-50 hover:text-thai-700 flex items-center gap-2"
                >
                   {card.folderId !== undefined && <span className="text-green-500 text-xs">●</span>}
                   General
                </button>
                {folders.map(f => (
                   <button 
                      key={f.id}
                      onClick={() => onMoveCard({...card, folderId: f.id})}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-thai-50 hover:text-thai-700 flex items-center gap-2"
                   >
                      {f.id !== card.folderId && <span className="text-green-500 text-xs">●</span>}
                      {f.name}
                   </button>
                ))}
             </div>
          </div>

          <button
             onClick={() => onDelete(card.id)}
             className="text-gray-300 hover:text-red-500 p-1"
             title="Remove"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
             </svg>
          </button>
       </div>

       <div className="flex justify-between items-start">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-thai-700 font-thai">{card.thai}</h3>
                <AudioPlayer text={card.thai} size="sm" />
                {/* Show folder badge if in search mode */}
                {searchTerm && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                        {card.folderId ? folders.find(f => f.id === card.folderId)?.name : 'General'}
                    </span>
                )}
             </div>
             <p className="text-sm text-thai-500 font-medium mb-2">{card.transliteration}</p>
             <p className="text-gray-800 font-medium border-t border-dashed border-gray-200 pt-2 mt-2">{card.english}</p>
             
             {card.exampleThai && (
               <div className="mt-3 bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-thai text-gray-700 mb-1 flex items-center gap-2">
                    {card.exampleThai}
                    <AudioPlayer text={card.exampleThai} size="sm" />
                  </p>
                  <p className="text-gray-500 italic">{card.exampleEnglish}</p>
               </div>
             )}
          </div>
       </div>
       <div className="mt-2 text-xs text-gray-300 text-right">
          {new Date(card.dateAdded).toLocaleDateString()}
       </div>
    </div>
  );

  // Search Logic
  const filteredCards = vocabulary.filter(c => 
    c.thai.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.transliteration.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Folder View Logic
  const targetFolderId = viewFolderId === 'GENERAL' ? undefined : viewFolderId;
  const folderName = viewFolderId === 'GENERAL' ? 'General' : folders.find(f => f.id === viewFolderId)?.name || 'Unknown';
  const currentFolderCards = vocabulary.filter(c => c.folderId === targetFolderId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-40"> {/* Extra padding bottom for fixed search bar */}
      
      {/* Hidden Import Input */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* VIEW: Search Results */}
      {searchTerm ? (
         <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-2 flex justify-between">
               <span>Search Results</span>
               <span className="bg-thai-100 text-thai-700 px-2 py-0.5 rounded-full text-xs">{filteredCards.length}</span>
            </h3>
            {filteredCards.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    No matching words found.
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredCards.map(renderCard)}
                </div>
            )}
         </div>
      ) : (
      /* VIEW: Folders & Cards */
      <>
          {/* FOLDER LIST VIEW */}
          {viewFolderId === 'ROOT' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-2xl font-bold text-gray-800">Collections</h2>
                    <div className="flex gap-2">
                        <button 
                          onClick={handleImportClick}
                          className="p-2 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-thai-600 transition-colors shadow-sm"
                          title="Import Backup"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </button>
                        <button 
                          onClick={handleExport}
                          className="p-2 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-thai-600 transition-colors shadow-sm"
                          title="Export Backup"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setIsCreating(true)}
                          className="bg-thai-600 text-white hover:bg-thai-700 px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          New Folder
                        </button>
                    </div>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreateFolder} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 animate-fade-in">
                        <div className="relative flex-1 w-full">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Folder Name (e.g. Travel)"
                                className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:border-thai-500 focus:ring-4 focus:ring-thai-100 outline-none text-lg font-medium transition-all"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 sm:flex-none px-4 py-3 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 sm:flex-none bg-thai-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-thai-700 shadow-sm transition-colors">
                                Create
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* General / Uncategorized Folder */}
                    <div 
                    onClick={() => setViewFolderId('GENERAL')}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center"
                    >
                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-3 group-hover:bg-thai-50 group-hover:text-thai-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">General</h3>
                        <p className="text-sm text-gray-400 mt-1">{getCount(undefined)} words</p>
                    </div>

                    {/* User Folders */}
                    {folders.map(folder => (
                    <div 
                        key={folder.id}
                        onClick={() => setViewFolderId(folder.id)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center relative"
                    >
                        <button 
                            onClick={(e) => handleDeleteFolderWithConfirm(folder.id, folder.name, e)}
                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10"
                            title="Delete Folder"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-3 group-hover:bg-amber-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-gray-800 truncate w-full px-2 text-lg">{folder.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{getCount(folder.id)} words</p>
                    </div>
                    ))}
                </div>
            </div>
          )}

          {/* SINGLE FOLDER CONTENT VIEW */}
          {viewFolderId !== 'ROOT' && (
            <div className="space-y-4 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <button 
                    onClick={() => setViewFolderId('ROOT')}
                    className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    </button>
                    <div>
                    <h2 className="text-2xl font-bold text-gray-800">{folderName}</h2>
                    <p className="text-sm text-gray-500">{currentFolderCards.length} cards</p>
                    </div>
                </div>

                {currentFolderCards.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p>No cards in this folder yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {currentFolderCards.slice().reverse().map(renderCard)}
                    </div>
                )}
            </div>
          )}
      </>
      )}

      {/* Unified Search Header - MOVED TO BOTTOM FIXED POSITION */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-100 via-gray-50 to-transparent z-30 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-200 relative">
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search vocabulary..."
                        className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-thai-500 focus:ring-2 focus:ring-thai-100 outline-none text-lg font-thai font-medium transition-all"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchTerm && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <button onClick={() => setSearchTerm('')} className="hover:text-gray-600 p-1 bg-gray-200 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};