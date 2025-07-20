import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { 
  transcribeAudio, 
  parseAudioFromFormData, 
  validateAudioFile 
} from "../lib/ai/voice-transcription.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Only accept POST requests
    if (request.method !== "POST") {
      return json({ 
        success: false, 
        error: "Method not allowed" 
      }, { status: 405 });
    }

    // Parse audio from form data
    const audioData = await parseAudioFromFormData(request);
    
    if (!audioData) {
      return json({
        success: false,
        error: "No audio file provided or invalid format"
      }, { status: 400 });
    }

    const { audioBuffer, filename } = audioData;

    // Validate audio file
    const validation = validateAudioFile({
      size: audioBuffer.length,
      type: '', // Will be determined by filename
      name: filename
    });

    if (!validation.valid) {
      return json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    // Transcribe audio
    const result = await transcribeAudio(audioBuffer, filename, {
      language: 'en', // Default to English, could be made configurable
      prompt: 'This is a product search query. Please transcribe clearly and accurately.'
    });

    return json({
      success: true,
      data: {
        text: result.text,
        duration: result.duration,
        language: result.language
      }
    });

  } catch (error) {
    console.error('Voice transcription API error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed'
    }, { status: 500 });
  }
}; 