(function() {
  'use strict';

  let currentModal = null;
  let currentTimeout = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  const SEARCH_DELAY = 3000; // Reduced delay for better UX on redirect

  // Voice recording functions
  async function startVoiceRecording(input, voiceBtn, voiceStatus) {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice search is not supported in your browser');
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up media recorder
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      isRecording = true;

      // Update UI
      updateVoiceUI(voiceBtn, voiceStatus, 'recording');

      // Handle data available
      mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = function() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        transcribeAudio(audioBlob, input, voiceBtn, voiceStatus);
        
        // Stop the media stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isRecording) {
          stopVoiceRecording();
        }
      }, 10000);

    } catch (error) {
      console.error('Error starting voice recording:', error);
      updateVoiceUI(voiceBtn, voiceStatus, 'error');
      
      if (error.name === 'NotAllowedError') {
        alert('Microphone permission is required for voice search');
      } else {
        alert('Could not start voice recording. Please try again.');
      }
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
    }
  }

  async function transcribeAudio(audioBlob, input, voiceBtn, voiceStatus) {
    try {
      updateVoiceUI(voiceBtn, voiceStatus, 'processing');

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-search.webm');

      // Send to transcription API
      const response = await fetch('/apps/xpertsearch/api/voice-transcription', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success && data.data.text) {
        input.value = data.data.text.trim();
        input.focus();
        updateVoiceUI(voiceBtn, voiceStatus, 'success');
        
        // Auto-search if we got a good transcription
        if (data.data.text.trim().length > 2) {
          setTimeout(() => {
            redirectToSearch(data.data.text.trim());
          }, 1000);
        }
      } else {
        throw new Error(data.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('Error transcribing audio:', error);
      updateVoiceUI(voiceBtn, voiceStatus, 'error');
      alert('Could not transcribe audio. Please try typing your search instead.');
    }
  }

  function updateVoiceUI(voiceBtn, voiceStatus, state) {
    const voiceText = voiceStatus.querySelector('.ai-search-voice-text');
    
    switch (state) {
      case 'recording':
        voiceBtn.classList.add('recording');
        voiceStatus.classList.remove('hidden');
        voiceText.textContent = 'Listening... (Click again to stop)';
        break;
      case 'processing':
        voiceBtn.classList.remove('recording');
        voiceBtn.classList.add('processing');
        voiceText.textContent = 'Processing...';
        break;
      case 'success':
        voiceBtn.classList.remove('processing');
        voiceStatus.classList.add('hidden');
        break;
      case 'error':
        voiceBtn.classList.remove('recording', 'processing');
        voiceStatus.classList.add('hidden');
        break;
      default:
        voiceBtn.classList.remove('recording', 'processing');
        voiceStatus.classList.add('hidden');
    }
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-search-modal-backdrop';
    modal.innerHTML = `
      <div class="ai-search-modal-container">
        <div class="ai-search-modal-header">
          <h3>AI Search</h3>
          <button class="ai-search-close-btn" type="button">×</button>
        </div>
        <div class="ai-search-modal-search">
          <div class="ai-search-input-container">
            <input type="text" class="ai-search-modal-input" placeholder="Search for products or speak your query..." autofocus>
            <button class="ai-search-voice-btn" type="button" title="Voice search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <button class="ai-search-submit-btn" type="button">Search</button>
          </div>
          <div class="ai-search-hint">
            Press Enter, click Search, or use voice to find products
          </div>
          <div class="ai-search-voice-status hidden">
            <div class="ai-search-voice-indicator">
              <div class="ai-search-voice-pulse"></div>
              <span class="ai-search-voice-text">Listening...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }

  function redirectToSearch(query) {
    if (!query.trim()) return;

    // Close modal first for smooth transition
    closeModal();
    
    // Redirect to the dedicated search results page
    const shopDomain = window.location.hostname;
    const searchUrl = `/apps/xpertsearch/search?q=${encodeURIComponent(query.trim())}&shop=${shopDomain}`;
    
    // Use window.location.href for better compatibility across all browsers
    window.location.href = searchUrl;
  }

  function openModal(initialQuery = '') {
    if (currentModal) {
      closeModal();
    }

    currentModal = createModal();
    document.body.appendChild(currentModal);
    document.body.style.overflow = 'hidden';

    const input = currentModal.querySelector('.ai-search-modal-input');
    const submitBtn = currentModal.querySelector('.ai-search-submit-btn');
    const closeBtn = currentModal.querySelector('.ai-search-close-btn');
    const voiceBtn = currentModal.querySelector('.ai-search-voice-btn');
    const voiceStatus = currentModal.querySelector('.ai-search-voice-status');

    // Set initial query if provided
    if (initialQuery) {
      input.value = initialQuery;
      // If there's an initial query, redirect immediately
      setTimeout(() => redirectToSearch(initialQuery), 100);
      return;
    }

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    currentModal.addEventListener('click', function(e) {
      if (e.target === currentModal) {
        closeModal();
      }
    });

    submitBtn.addEventListener('click', function() {
      redirectToSearch(input.value);
    });

    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        redirectToSearch(input.value);
      }
    });

    // Voice search functionality
    voiceBtn.addEventListener('click', function() {
      startVoiceRecording(input, voiceBtn, voiceStatus);
    });

    // Optional: Auto-redirect after user stops typing (disabled by default)
    // Uncomment the following lines if you want auto-redirect behavior
    /*
    input.addEventListener('input', function() {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      
      const query = input.value.trim();
      if (query.length > 2) { // Only auto-search for queries longer than 2 characters
        currentTimeout = setTimeout(() => {
          redirectToSearch(query);
        }, SEARCH_DELAY);
      }
    });
    */

    // Escape key to close
    document.addEventListener('keydown', handleEscapeKey);
    
    // Focus the input
    setTimeout(() => input.focus(), 100);
  }

  function closeModal() {
    if (currentModal) {
      document.body.removeChild(currentModal);
      document.body.style.overflow = '';
      currentModal = null;
      
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
      }
      
      document.removeEventListener('keydown', handleEscapeKey);
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // Global function to open modal (called by block buttons)
  window.openAISearchModal = function(initialQuery) {
    openModal(initialQuery);
  };

  // Initialize triggers when DOM is ready
  function initializeTriggers() {
    // Handle button triggers
    document.querySelectorAll('.ai-search-trigger-btn').forEach(button => {
      button.addEventListener('click', function() {
        const blockId = this.getAttribute('data-block-id');
        const placeholder = this.getAttribute('data-placeholder');
        openModal('');
      });
    });

    // Handle icon button triggers
    document.querySelectorAll('.ai-search-icon-btn').forEach(button => {
      button.addEventListener('click', function() {
        const blockId = this.getAttribute('data-block-id');
        const placeholder = this.getAttribute('data-placeholder');
        openModal('');
      });
    });

    // Handle input triggers (fake inputs that open modal)
    document.querySelectorAll('.ai-search-input').forEach(input => {
      input.addEventListener('click', function() {
        const placeholder = this.getAttribute('placeholder') || '';
        openModal('');
      });
      
      input.addEventListener('focus', function() {
        this.blur(); // Remove focus
        const placeholder = this.getAttribute('placeholder') || '';
        openModal('');
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTriggers);
  } else {
    initializeTriggers();
  }

  // Re-initialize when new content is added (for theme editor)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.classList && (node.classList.contains('ai-search-trigger-btn') || node.classList.contains('ai-search-icon-btn') || node.classList.contains('ai-search-input'))) {
              initializeTriggers();
            } else if (node.querySelector && (node.querySelector('.ai-search-trigger-btn') || node.querySelector('.ai-search-icon-btn') || node.querySelector('.ai-search-input'))) {
              initializeTriggers();
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})(); 