import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, className = '', size = 'md' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying || !text) return;

    setIsLoading(true);

    // Simple language detection: If text contains Thai characters, use 'th', otherwise 'en'
    const isThai = /[\u0E00-\u0E7F]/.test(text);
    const lang = isThai ? 'th' : 'en';
    
    // Use Google Translate TTS API (unofficial but widely supported for this use case)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.oncanplaythrough = () => {
      setIsLoading(false);
      setIsPlaying(true);
      audio.play().catch(err => {
        console.error("Playback failed", err);
        setIsPlaying(false);
      });
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.onerror = (e) => {
      console.error("Audio load error", e);
      setIsLoading(false);
      setIsPlaying(false);
      // Fallback: If Google blocks the request (404/403), sometimes opening in new tab works, 
      // but for an in-app experience, we just stop loading.
    };

    // Trigger load
    audio.load();
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <button
      onClick={playAudio}
      disabled={isLoading || isPlaying}
      className={`text-thai-600 hover:text-thai-700 hover:bg-thai-50 rounded-full p-2 transition-colors focus:outline-none active:bg-thai-100 ${className}`}
      title="Play Pronunciation"
    >
      {isLoading ? (
        <svg className={`animate-spin ${iconSize}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : isPlaying ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
           <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
           <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );
};