import { z } from 'zod';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    const startTime = Date.now();
    
    // Create form data with the audio file
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: getMimeType(filename) });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    
    console.log(`🎤 Transcribing audio file: ${filename}`);
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Transcription completed in ${duration}ms`);
    
    return {
      text: data.text,
      duration,
      language: data.language,
    };
    
  } catch (error) {
    console.error('❌ Voice transcription failed:', error);
    throw error;
  }
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'mp4': 'audio/mp4',
    'mpeg': 'audio/mpeg',
    'mpga': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'ogg': 'audio/ogg',
  };
  
  return mimeTypes[ext || ''] || 'audio/webm';
}

/**
 * Validate audio file
 */
export function validateAudioFile(
  file: { size: number; type: string; name: string }
): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/m4a',
  ];
  
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
    };
  }
  
  const mimeType = file.type || getMimeType(file.name);
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Parse multipart form data to extract audio file
 */
export async function parseAudioFromFormData(
  request: Request
): Promise<{ audioBuffer: Buffer; filename: string } | null> {
  try {
    const contentType = request.headers.get('content-type');
    
    if (!contentType?.includes('multipart/form-data')) {
      return null;
    }
    
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile || typeof audioFile === 'string') {
      return null;
    }
    
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    return {
      audioBuffer,
      filename: audioFile.name || 'audio.webm',
    };
    
  } catch (error) {
    console.error('Failed to parse audio from form data:', error);
    return null;
  }
} 