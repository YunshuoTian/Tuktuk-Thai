import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VocabCard, QuizQuestion, VocabFolder } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface QuizTabProps {
  vocabulary: VocabCard[];
  folders: VocabFolder[];
}

export const QuizTab: React.FC<QuizTabProps> = ({ vocabulary, folders }) => {
  const [step, setStep] = useState<'SETUP' | 'PLAYING' | 'SUMMARY'>('SETUP');
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]); // Empty means NONE selected initially, logic below handles "Select All"
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Track used questions to prevent repeats within a session
  const usedCardIdsRef = useRef<Set<string>>(new Set());

  // Sound Effects Helper
  const playSound = (type: 'correct' | 'wrong' | 'complete') => {
    const sounds = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Success chime
      wrong: 'https://assets.mixkit.co/active_storage/sfx/2994/2994-preview.mp3',   // Soft error beep
      complete: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' // Achievement fanfare
    };
    
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.4; // Keep volume pleasant
      audio.play().catch(e => console.log('Audio play prevented', e));
    } catch (e) {
      console.error("Sound error", e);
    }
  };

  // Filter vocabulary based on selection
  const getActiveVocabulary = useCallback(() => {
    if (selectedFolderIds.length === 0) return []; // If nothing selected, return empty
    return vocabulary.filter(c => {
      // If 'GENERAL' is selected, look for undefined folderId
      if (selectedFolderIds.includes('GENERAL') && c.folderId === undefined) return true;
      // Otherwise match folderId
      return c.folderId && selectedFolderIds.includes(c.folderId);
    });
  }, [vocabulary, selectedFolderIds]);

  const generateQuestion = useCallback(() => {
    const activeVocab = getActiveVocabulary();
    if (activeVocab.length < 4) return null;

    // 1. Candidate pool for the CORRECT ANSWER (prioritize unused)
    let candidatePool = activeVocab.filter(c => !usedCardIdsRef.current.has(c.id));
    
    // If we've exhausted unused cards, fallback to full list (allow repeats if necessary)
    if (candidatePool.length === 0) {
        candidatePool = activeVocab;
    }

    // Pick a random correct card from the pool
    const correctIndex = Math.floor(Math.random() * candidatePool.length);
    const correctCard = candidatePool[correctIndex];

    // Mark as used for this session
    usedCardIdsRef.current.add(correctCard.id);

    // Determine direction: Thai -> Eng or Eng -> Thai
    const type: 'THAI_TO_ENG' | 'ENG_TO_THAI' = Math.random() > 0.5 ? 'THAI_TO_ENG' : 'ENG_TO_THAI';

    const questionText = type === 'THAI_TO_ENG' ? correctCard.thai : correctCard.english;
    const correctAnswer = type === 'THAI_TO_ENG' ? correctCard.english : correctCard.thai;

    // Generate 3 distractors
    const options = new Set<string>();
    options.add(correctAnswer);

    // Distractors can come from any card in the active set (except the correct one)
    const distractorPool = activeVocab.filter(c => c.id !== correctCard.id);
    const shuffledDistractors = [...distractorPool].sort(() => Math.random() - 0.5);

    for (const dCard of shuffledDistractors) {
      if (options.size >= 4) break;
      const val = type === 'THAI_TO_ENG' ? dCard.english : dCard.thai;
      if (val && val !== correctAnswer && val.trim() !== "") {
        options.add(val);
      }
    }

    return {
      question: questionText,
      correctAnswer: correctAnswer,
      options: Array.from(options).sort(() => Math.random() - 0.5),
      type,
      card: correctCard // pass full card for audio/context
    };
  }, [getActiveVocabulary]);

  const startQuiz = () => {
    usedCardIdsRef.current.clear(); // Reset history for new game
    setScore(0);
    setQuestionCount(0);
    const q = generateQuestion();
    if (q) {
      setCurrentQuestion(q);
      setStep('PLAYING');
    }
  };

  const handleAnswer = (answer: string) => {
    if (feedback !== null) return; // Prevent multiple clicks

    setSelectedOption(answer);
    const isCorrect = answer === currentQuestion?.correctAnswer;
    setFeedback(isCorrect ? 'CORRECT' : 'WRONG');

    if (isCorrect) {
      setScore(s => s + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }

    // Next question delay
    setTimeout(() => {
      setQuestionCount(c => c + 1);
      if (questionCount >= 9) { // End after 10 questions
        setStep('SUMMARY');
        setFeedback(null);
        setSelectedOption(null);
        playSound('complete');
      } else {
        const nextQ = generateQuestion();
        if (nextQ) {
          setCurrentQuestion(nextQ);
          setFeedback(null);
          setSelectedOption(null);
        } else {
          setStep('SUMMARY');
          playSound('complete');
        }
      }
    }, 1200); // Slightly shorter delay for snappier feel
  };

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helpers for "Select All"
  const allFolderIds = ['GENERAL', ...folders.map(f => f.id)];
  const isAllSelected = allFolderIds.length > 0 && allFolderIds.every(id => selectedFolderIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFolderIds([]);
    } else {
      setSelectedFolderIds(allFolderIds);
    }
  };

  // SETUP SCREEN
  if (step === 'SETUP') {
    const activeCount = getActiveVocabulary().length;
    const canStart = activeCount >= 4;

    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-160px)] pb-2 animate-fade-in">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full">
          
          {/* Compact Header */}
          <div className="text-center space-y-1 flex-none mb-2">
            <div className="w-10 h-10 bg-thai-50 rounded-full flex items-center justify-center mx-auto text-thai-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 font-thai">Start Quiz</h2>
            <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                Select decks (min 4 words total).
            </p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="bg-gray-50 rounded-xl p-2 border border-gray-200 flex-1 overflow-y-auto">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50 pb-1 z-10">Select Decks</h3>
                
                <div className="space-y-1.5">
                {/* Select All Option */}
                <label className="flex items-center gap-2 p-2 bg-thai-50 rounded-lg border border-thai-200 hover:border-thai-300 cursor-pointer transition-all shadow-sm">
                    <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-thai-600 focus:ring-thai-500 transition-colors cursor-pointer accent-thai-600"
                    />
                    <div className="flex-1">
                        <div className="font-bold text-xs text-thai-800">Select All</div>
                    </div>
                </label>

                {/* General Folder */}
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-thai-300 cursor-pointer transition-all shadow-sm">
                    <input 
                        type="checkbox" 
                        checked={selectedFolderIds.includes('GENERAL')}
                        onChange={() => toggleFolderSelection('GENERAL')}
                        className="w-4 h-4 rounded border-gray-300 text-thai-600 focus:ring-thai-500 transition-colors cursor-pointer accent-thai-600"
                    />
                    <div className="flex-1">
                        <div className="font-medium text-xs text-gray-800">General</div>
                        <div className="text-[10px] text-gray-400">{vocabulary.filter(c => c.folderId === undefined).length} words</div>
                    </div>
                </label>

                {/* User Folders */}
                {folders.map(f => (
                    <label key={f.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-thai-300 cursor-pointer transition-all shadow-sm">
                        <input 
                        type="checkbox" 
                        checked={selectedFolderIds.includes(f.id)}
                        onChange={() => toggleFolderSelection(f.id)}
                        className="w-4 h-4 rounded border-gray-300 text-thai-600 focus:ring-thai-500 transition-colors cursor-pointer accent-thai-600"
                        />
                        <div className="flex-1">
                        <div className="font-medium text-xs text-gray-800">{f.name}</div>
                        <div className="text-[10px] text-gray-400">{vocabulary.filter(c => c.folderId === f.id).length} words</div>
                        </div>
                    </label>
                ))}
                </div>
            </div>
          </div>

          <div className="pt-3 flex-none">
             <button 
               onClick={startQuiz}
               disabled={!canStart}
               className="w-full bg-thai-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-thai-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
             >
               Start Quiz ({activeCount} words)
             </button>
          </div>
        </div>
      </div>
    );
  }

  // SUMMARY SCREEN
  if (step === 'SUMMARY') {
     const percentage = Math.round((score / 10) * 100);
     return (
      <div className="max-w-2xl mx-auto py-10 animate-fade-in">
         <div className="bg-white rounded-3xl p-8 shadow-xl text-center border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-thai-400 to-thai-600"></div>
            
            <div className="mb-6 animate-pop">
               <span className="text-6xl">
                 {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
               </span>
            </div>
            
            <h2 className="text-4xl font-bold text-gray-800 font-thai mb-2">Quiz Complete!</h2>
            <p className="text-gray-500 mb-8">Here is how you did today</p>

            <div className="flex justify-center items-center gap-8 mb-8">
               <div className="text-center">
                  <div className="text-3xl font-bold text-thai-600">{score}</div>
                  <div className="text-xs text-gray-400 uppercase">Correct</div>
               </div>
               <div className="w-px h-12 bg-gray-200"></div>
               <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">10</div>
                  <div className="text-xs text-gray-400 uppercase">Total</div>
               </div>
            </div>

            <button 
              onClick={() => setStep('SETUP')}
              className="bg-thai-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-thai-700 transition-all shadow-md w-full sm:w-auto"
            >
              Play Again
            </button>
         </div>
      </div>
     );
  }

  // PLAYING SCREEN
  if (!currentQuestion) return null;

  // Helper to determine grid layout based on option length
  // If options are Thai (short), use 2 cols to save space. If English (often defs), use 1 col.
  const isThaiOptions = currentQuestion.type === 'ENG_TO_THAI';

  return (
    // Full height container minus bottom nav approx height
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-160px)] pb-2">
       
       {/* Styles for animations */}
       <style>{`
         @keyframes shake {
           0%, 100% { transform: translateX(0); }
           10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
           20%, 40%, 60%, 80% { transform: translateX(4px); }
         }
         @keyframes pop {
           0% { transform: scale(1); }
           50% { transform: scale(1.05); }
           100% { transform: scale(1); }
         }
         @keyframes slide-up {
           from { opacity: 0; transform: translateY(10px); }
           to { opacity: 1; transform: translateY(0); }
         }
         .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
         .animate-pop { animation: pop 0.3s ease-out; }
         .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
       `}</style>

       {/* Top Bar: Progress & Score */}
       <div className="flex-none mb-2">
           <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-1.5 px-1 uppercase tracking-wide">
              <span>Question {questionCount + 1} / 10</span>
              <span className="bg-thai-50 text-thai-600 px-2 py-0.5 rounded-full">Score: {score}</span>
           </div>
           <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-thai-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((questionCount) / 10) * 100}%` }}
              ></div>
           </div>
       </div>

       {/* Question Card (Flex 1 to take available space but not fixed huge height) */}
       <div 
         key={currentQuestion.question}
         className="flex-1 flex flex-col justify-center items-center bg-white rounded-3xl p-6 shadow-lg border border-gray-100 text-center mb-4 animate-slide-up relative overflow-hidden"
       >
           <div className="absolute top-0 left-0 w-full h-1.5 bg-thai-500"></div>
           
           <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-3">
             {currentQuestion.type === 'THAI_TO_ENG' ? 'Translate to English' : 'Translate to Thai'}
           </h3>
           
           <div className="text-4xl font-bold text-gray-800 font-thai mb-2 leading-tight break-words max-w-full">
              {currentQuestion.question}
           </div>
           
           {currentQuestion.card && (
              <div className="mt-2">
                 <AudioPlayer text={currentQuestion.card.thai} size="md" className="text-thai-500 bg-thai-50 hover:bg-thai-100" />
              </div>
           )}
       </div>

       {/* Options Grid (Dynamic Cols) */}
       <div className={`grid ${isThaiOptions ? 'grid-cols-2' : 'grid-cols-1'} gap-2 flex-none`}>
          {currentQuestion.options.map((option, idx) => {
            let stateClasses = "bg-white border-gray-200 text-gray-600 hover:border-thai-300 hover:bg-gray-50";
            
            if (selectedOption === option) {
                if (feedback === 'CORRECT') {
                    stateClasses = "bg-green-50 border-green-500 text-green-700 animate-pop";
                } else if (feedback === 'WRONG') {
                    stateClasses = "bg-red-50 border-red-500 text-red-700 animate-shake";
                }
            } else if (feedback === 'WRONG' && option === currentQuestion.correctAnswer) {
                // Show correct answer when wrong
                stateClasses = "bg-green-50 border-green-500 text-green-700 opacity-80";
            }

            return (
               <button
                 key={idx}
                 onClick={() => handleAnswer(option)}
                 disabled={feedback !== null}
                 className={`
                    relative p-3 rounded-xl border-2 font-medium text-base shadow-sm transition-all 
                    ${isThaiOptions ? 'font-thai h-16 flex items-center justify-center text-center' : 'text-left pl-4'}
                    ${stateClasses}
                 `}
               >
                 {/* Selection Marker */}
                 <div className={`
                    absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2
                    ${isThaiOptions ? 'hidden' : 'block'} 
                    ${selectedOption === option 
                        ? (feedback === 'CORRECT' ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') 
                        : 'border-gray-200'}
                 `}></div>

                 <span className={isThaiOptions ? '' : 'ml-6'}>{option}</span>
               </button>
            );
          })}
       </div>
    </div>
  );
};