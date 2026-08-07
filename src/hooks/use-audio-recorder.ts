'use client';

import { useRef, useCallback, type RefObject } from 'react';
import { Socket } from 'socket.io-client';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecording = useRef(false);

  const startRecording = useCallback(async (socket: Socket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Try to use opus codec, fall back to default
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socket.connected) {
          const base64 = await blobToBase64(event.data);
          socket.emit('audio:chunk', { base64, mimeType });
        }
      };

      recorder.onerror = () => {
        isRecording.current = false;
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      isRecording.current = true;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow access in your browser settings.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'No microphone found. Please connect a microphone and try again.'
            : 'Failed to start recording. Please check your microphone settings.';

      console.error('Audio recording error:', message);
      throw new Error(message);
    }
  }, []);

  const stopRecording = useCallback(
    (socket: Socket) => {
      if (mediaRecorderRef.current && isRecording.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        isRecording.current = false;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (socket.connected) {
        socket.emit('audio:stop');
      }
    },
    []
  );

  return {
    startRecording,
    stopRecording,
    isRecording: isRecording as RefObject<boolean>,
  };
}
