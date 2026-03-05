'use client';

import { useState, useCallback } from 'react';
import { AIReadingRequest, AIReadingResponse, getAIReadingStream } from '@/lib/api';
import { AstrolabeData } from '@/lib/astrolabe';

export function useAIReading(
  astrolabeData: AstrolabeData | null | undefined,
  originPalace?: { branch: string; palace: string },
) {
  const [aiResponse, setAiResponse] = useState<AIReadingResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStage, setStreamStage] = useState<'rag' | 'generating' | ''>('');

  const handleAIReading = useCallback(async () => {
    if (!astrolabeData) return;

    setAiLoading(true);
    setAiError(null);
    setStreamingText('');
    setIsStreaming(false);
    setStreamStage('rag');

    const palacesDict: AIReadingRequest['palaces'] = {};
    for (const palace of astrolabeData.palaces) {
      palacesDict[palace.name] = {
        branch: palace.earthlyBranch,
        stem: palace.heavenlyStem,
        stars: [
          ...palace.majorStars.map(s => ({
            name: s.name,
            brightness: s.brightness,
            mutagen: s.mutagen,
          })),
          ...palace.minorStars.map(s => ({
            name: s.name,
            brightness: s.brightness,
            mutagen: s.mutagen,
          })),
        ],
      };
    }

    const request: AIReadingRequest = {
      palaces: palacesDict,
      gender: astrolabeData.gender,
      age: astrolabeData.age || 30,
      origin_palace: originPalace,
      current_decadal: astrolabeData.currentDecadal,
      current_yearly: astrolabeData.currentYearly,
      five_elements_class: astrolabeData.fiveElementsClass,
      soul_star: astrolabeData.soulStar,
      body_star: astrolabeData.bodyStar,
    };

    await getAIReadingStream(request, {
      onRagComplete: () => {
        setStreamStage('generating');
        setIsStreaming(true);
      },
      onText: (chunk) => {
        setStreamingText(prev => prev + chunk);
      },
      onComplete: (result) => {
        setAiResponse(result);
        setIsStreaming(false);
        setAiLoading(false);
        setStreamStage('');
      },
      onError: (error) => {
        setAiError(error);
        setIsStreaming(false);
        setAiLoading(false);
        setStreamStage('');
      },
    });
  }, [astrolabeData, originPalace]);

  return {
    aiResponse,
    aiLoading,
    aiError,
    streamingText,
    isStreaming,
    streamStage,
    handleAIReading,
  };
}
