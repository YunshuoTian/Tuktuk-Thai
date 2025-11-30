import React, { useState, useRef, useEffect } from 'react';
import { quickTranslate, analyzeText, getSynonymsForSegments } from '../services/geminiService';
import { TranslationResult, LoadingState, Segment, VocabCard, VocabFolder } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface TranslateTabProps {
  onAddToVocab: (card: VocabCard) => void;
  vocabulary: VocabCard[];
  folders: VocabFolder[];
}

export const TranslateTab: React.FC<TranslateTabProps> = ({ onAddToVocab, vocabulary, folders }) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentSearchRef = useRef<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = async () => {
    if (!input.trim()) return;
    
    // Reset state
    const currentTerm = input.trim();
    currentSearchRef.current = currentTerm;
    
    setResult(null);
    setStatus(LoadingState.LOADING);

    try {
      // STEP 1: Instant Translation (Google Translate)
      const basic = await quickTranslate(currentTerm);
      
      // Check if user changed search while waiting
      if (currentSearchRef.current !== currentTerm) return;

      const initialResult: TranslationResult = {
        originalText: currentTerm,
        translatedText: basic.translatedText,
        transliteration: basic.transliteration,
        segments: [], // Not ready yet
        exampleSentenceThai: '',
        exampleSentenceEnglish: '',
      };
      
      setResult(initialResult);
      setStatus(LoadingState.PARTIAL_SUCCESS); // UI shows main card, loads analysis below

      // STEP 2: Deep Analysis (Gemini) - Fast Breakdown (No synonyms yet)
      const details = await analyzeText(currentTerm, basic.translatedText);
      
      if (currentSearchRef.current !== currentTerm) return;

      const intermediateResult = {
        ...initialResult,
        segments: details.segments,
        exampleSentenceThai: details.exampleSentenceThai,
        exampleSentenceEnglish: details.exampleSentenceEnglish
      };
      
      setResult(intermediateResult);
      setStatus(LoadingState.SUCCESS);

      // STEP 3: Enrich with Synonyms (Background)
      // This runs silently and updates the UI when ready
      try {
         const segmentsWithSynonyms = await getSynonymsForSegments(details.segments);
         
         if (currentSearchRef.current !== currentTerm) return;

         setResult(prev => prev ? {
             ...prev,
             segments: segmentsWithSynonyms
         } : null);
      } catch (synErr) {
         console.warn("Background synonym fetch failed", synErr);
         // Non-critical failure, ignore
      }

    } catch (error) {
      console.error(error);
      setStatus(LoadingState.ERROR);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const isSaved = (thaiText: string) => {
    if (!thaiText) return false;
    return vocabulary.some(c => c.thai.trim() === thaiText.trim());
  };

  const handleAddSegment = (segment: Segment) => {
    if (isSaved(segment.thai)) return;
    const newCard: VocabCard = {
      id: Date.now().toString() + Math.random().toString(),
      thai: segment.thai,
      transliteration: segment.transliteration,
      english: segment.english,
      partOfSpeech: segment.partOfSpeech,
      dateAdded: Date.now(),
      folderId: targetFolderId || undefined,
    };
    onAddToVocab(newCard);
  };

  const handleAddMain = () => {
    if (!result) return;
    // If input was english, main thai is translatedText. If input was thai, main thai is originalText.
    const isThaiInput = /[\u0E00-\u0E7F]/.test(result.originalText);
    const mainThai = isThaiInput ? result.originalText : result.translatedText;
    
    if (isSaved(mainThai)) return;

    const mainEnglish = isThaiInput ? result.translatedText : result.originalText;
    
    const newCard: VocabCard = {
      id: Date.now().toString(),
      thai: mainThai,
      transliteration: result.transliteration,
      english: mainEnglish,
      exampleThai: result.exampleSentenceThai,
      exampleEnglish: result.exampleSentenceEnglish,
      dateAdded: Date.now(),
      folderId: targetFolderId || undefined,
    };
    onAddToVocab(newCard);
  };

  // Determine if the main result is saved
  const isThaiInput = result ? /[\u0E00-\u0E7F]/.test(result.originalText) : false;
  const mainThai = result ? (isThaiInput ? result.originalText : result.translatedText) : '';
  const mainEnglish = result ? (isThaiInput ? result.translatedText : result.originalText) : '';
  const isMainSaved = isSaved(mainThai);

  const selectedFolderName = targetFolderId 
    ? folders.find(f => f.id === targetFolderId)?.name || 'Unknown' 
    : 'General';
    
  // UI State for Layout Mode
  // If we have a result OR are loading, we use compact mode.
  // If we are IDLE (fresh start), we use large card mode.
  const isCompact = status !== LoadingState.IDLE && (status === LoadingState.LOADING || result !== null);

  return (
    <div className={`max-w-2xl mx-auto pb-20 transition-all duration-500 ease-in-out ${!isCompact ? 'h-[70vh] flex flex-col justify-center' : ''}`}>
      
      {/* Floating Search Card (Transitioning UI) */}
      <div className={`
          bg-white rounded-3xl shadow-xl border border-gray-100 transition-all duration-500 ease-in-out z-20
          ${isCompact ? 'p-3 sticky top-4 mb-4 shadow-md' : 'p-8 mb-0'}
      `}>
        
        {/* Header: Label & Folder Selector */}
        <div className="flex items-center justify-between mb-2">
           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
             Translate
           </label>
           
           {/* Compact Folder Selector Pill */}
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Save to</span>
             <div className="relative" ref={dropdownRef}>
               <button 
                 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                 className="flex items-center gap-2 bg-thai-50 hover:bg-thai-100 text-thai-700 px-2 py-1 rounded-full text-[10px] font-bold transition-colors outline-none"
                 title="Select folder to save words"
               >
                 <span className="truncate max-w-[80px]">{selectedFolderName}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>

               {isDropdownOpen && (
                 <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                    <div className="text-xs font-bold text-gray-300 uppercase px-4 py-2 bg-gray-50">Save to...</div>
                    <div className="max-h-48 overflow-y-auto p-1">
                       <button 
                         onClick={() => { setTargetFolderId(''); setIsDropdownOpen(false); }}
                         className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${targetFolderId === '' ? 'bg-thai-50 text-thai-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                       >
                          <div className={`w-2 h-2 rounded-full ${targetFolderId === '' ? 'bg-thai-500' : 'bg-gray-300'}`}></div>
                          General
                       </button>
                       {folders.map(f => (
                          <button 
                            key={f.id}
                            onClick={() => { setTargetFolderId(f.id); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${targetFolderId === f.id ? 'bg-thai-50 text-thai-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                             <div className={`w-2 h-2 rounded-full ${targetFolderId === f.id ? 'bg-thai-500' : 'bg-gray-300'}`}></div>
                             <span className="truncate">{f.name}</span>
                          </button>
                       ))}
                    </div>
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* Centered Input - Reduced Size & Weight */}
        <div className="relative group mb-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            className={`w-full text-center font-medium text-gray-800 placeholder-gray-300 border-b border-gray-100 focus:border-thai-500 bg-transparent py-1 outline-none transition-all font-thai
                ${isCompact ? 'text-lg' : 'text-2xl'}
            `}
            autoFocus={false}
          />
        </div>

        {/* Action Button - Smaller in compact mode */}
        <button
            onClick={handleSearch}
            disabled={status === LoadingState.LOADING}
            className={`w-full bg-thai-600 text-white rounded-2xl font-bold hover:bg-thai-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 transform active:scale-95 flex items-center justify-center gap-2
                ${isCompact ? 'py-2 text-xs' : 'py-4 text-xl'}
            `}
          >
            {status === LoadingState.LOADING ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Translating...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Translate</span>
              </>
            )}
          </button>
      </div>

      {/* Results Area */}
      {(status === LoadingState.SUCCESS || status === LoadingState.PARTIAL_SUCCESS) && result && (
        <div className="space-y-3 animate-fade-in pt-1 pb-20">
          
          {/* Main Translation Card - Compact */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-thai-500"></div>
            
            <div className="flex justify-between items-center mb-2 pl-3">
               <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Translation</span>
               <button 
                 onClick={handleAddMain} 
                 disabled={isMainSaved}
                 className={`text-[10px] px-2 py-1 rounded-lg transition flex items-center gap-1 font-medium ${
                   isMainSaved 
                    ? 'bg-green-100 text-green-700 cursor-default' 
                    : 'bg-thai-50 text-thai-700 hover:bg-thai-100'
                 }`}
               >
                 {isMainSaved ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Saved
                    </>
                 ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Save
                    </>
                 )}
               </button>
            </div>
            
            <div className="flex items-start gap-3 pl-3">
               <div className="flex-1">
                  <h2 className="text-2xl font-bold text-thai-700 font-thai mb-0.5 leading-tight">{mainThai}</h2>
                  <p className="text-xs text-gray-400 mb-0.5">{result.transliteration}</p>
                  <p className="text-lg font-medium text-gray-900 leading-tight">{mainEnglish}</p>
               </div>
               <div className="pt-0.5">
                  <AudioPlayer text={mainThai} size="md" className="text-white bg-thai-500 hover:bg-thai-600 shadow-sm p-1.5" />
               </div>
            </div>

            {(result.exampleSentenceThai || result.exampleSentenceEnglish) && (
               <div className="mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 ml-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Example</h4>
                  <p className="text-sm text-gray-800 font-thai mb-0.5 flex items-center gap-2 leading-snug">
                     {result.exampleSentenceThai}
                     <AudioPlayer text={result.exampleSentenceThai} size="sm" />
                  </p>
                  <p className="text-xs text-gray-600 italic leading-snug">{result.exampleSentenceEnglish}</p>
               </div>
            )}
          </div>

          {/* Word Breakdown */}
          {status === LoadingState.PARTIAL_SUCCESS ? (
            <div className="space-y-2 opacity-60 px-1">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Breakdown</h3>
              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse flex gap-3">
                 <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                 <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-2.5 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                 </div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 animate-pulse flex gap-3">
                 <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                 <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-2.5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                 </div>
              </div>
            </div>
          ) : (
            result.segments.length > 0 && (
              <div className="space-y-2 animate-fade-in px-1">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Breakdown</h3>
                 <div className="grid gap-2">
                    {result.segments.map((segment, idx) => {
                       const saved = isSaved(segment.thai);
                       return (
                          <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-start justify-between group transition-all">
                             <div className="flex items-start gap-2.5">
                                <div className="mt-0.5">
                                   <AudioPlayer text={segment.thai} size="sm" className="text-gray-300 hover:text-thai-600 bg-gray-50" />
                                </div>
                                <div>
                                   <div className="flex items-baseline gap-2 flex-wrap">
                                      <span className="text-base font-bold text-thai-700 font-thai">{segment.thai}</span>
                                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase font-bold">{segment.partOfSpeech}</span>
                                   </div>
                                   <div className="text-gray-600 mt-0.5 text-xs">
                                      <span className="font-medium text-gray-900">{segment.english}</span>
                                      <span className="text-gray-300 mx-1.5">|</span>
                                      <span className="italic text-gray-500">{segment.transliteration}</span>
                                   </div>
                                   
                                   {/* Synonyms Display */}
                                   {segment.synonyms && segment.synonyms.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap gap-1 animate-fade-in">
                                         {segment.synonyms.slice(0, 4).map((syn, sIdx) => (
                                            <button 
                                              key={sIdx} 
                                              onClick={() => setInput(syn)} 
                                              className="text-[9px] text-gray-500 bg-gray-50 hover:bg-thai-50 hover:text-thai-600 px-1.5 py-0.5 rounded border border-gray-100 transition-colors"
                                            >
                                              {syn}
                                            </button>
                                         ))}
                                      </div>
                                   )}
                                </div>
                             </div>
                             
                             <button 
                                onClick={() => handleAddSegment(segment)}
                                disabled={saved}
                                className={`p-1.5 rounded-lg transition-all ${
                                  saved 
                                    ? 'text-green-500 bg-green-50' 
                                    : 'text-gray-300 hover:text-thai-600 hover:bg-thai-50'
                                }`}
                             >
                                {saved ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                             </button>
                          </div>
                       );
                    })}
                 </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};