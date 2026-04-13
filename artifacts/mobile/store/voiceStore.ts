import { create } from 'zustand';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

interface VoiceState {
  status: VoiceStatus;
  transcript: string | null;
  responseText: string | null;
  setStatus: (status: VoiceStatus) => void;
  setTranscript: (text: string | null) => void;
  setResponse: (text: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: null,
  responseText: null,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (responseText) => set({ responseText }),
  reset: () => set({ status: 'idle', transcript: null, responseText: null }),
}));
