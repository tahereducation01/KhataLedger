/**
 * voice.js - Voice entry using Web Speech API
 * Parses natural language like "Ramesh ko 500 diya"
 */

const Voice = (() => {

  let recognition = null;
  let listening = false;

  function isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  function init() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;

    if (!isSupported()) {
      voiceBtn.title = 'Voice input not supported in this browser';
      voiceBtn.style.opacity = '0.5';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      showResult(transcript);
      parseVoice(transcript);
    };

    recognition.onerror = (e) => {
      stopListening();
      const resultEl = document.getElementById('voice-result');
      if (resultEl) {
        resultEl.textContent = 'Error: ' + e.error + '. Please try again.';
        resultEl.classList.add('show');
      }
    };

    recognition.onend = () => {
      stopListening();
    };

    voiceBtn.addEventListener('click', toggleListening);
  }

  function toggleListening() {
    // --- NEW: Paywall Logic ---
    const user = Auth.getCurrentUser();
    // If user has no plan data (old account) or is on basic, block it.
    if (!user.plan || user.plan === 'basic') {
      if (confirm('🎙️ AI Voice Entry is a Pro feature!\n\nUpgrade to KhataLedger Pro for ₹99/mo to enter transactions using just your voice.\n\nWould you like to upgrade now?')) {
        window.location.href = 'subscription.html';
      }
      return; // Stop execution here
    }
    // --------------------------

    if (listening) {
      recognition.stop();
      stopListening();
    } else {
      startListening();
    }
  }

  function startListening() {
    const voiceBtn = document.getElementById('voice-btn');
    listening = true;
    voiceBtn.classList.add('listening');
    voiceBtn.title = 'Listening... Click to stop';
    recognition.start();
  }

  function stopListening() {
    const voiceBtn = document.getElementById('voice-btn');
    listening = false;
    if (voiceBtn) {
      voiceBtn.classList.remove('listening');
      voiceBtn.title = 'Voice entry';
    }
  }

  function showResult(text) {
    const resultEl = document.getElementById('voice-result');
    if (!resultEl) return;
    resultEl.textContent = '🎤 Heard: "' + text + '"';
    resultEl.classList.add('show');
  }

  /**
   * Parse Hindi/English voice input to extract:
   * - Amount (number)
   * - Type: gave (diya, diye, ko) or got (liya, liye, se)
   */
  function parseVoice(text) {
    const lower = text.toLowerCase();
    let amount = null;
    let type = null;

    // 1. Extract the number
    const numMatch = lower.match(/\d+(\.\d+)?/);
    if (numMatch) {
      amount = parseFloat(numMatch[0]);
    }

    // 2. Determine transaction type (Gave vs Got)
    if (/दिया|दिये|gave|give|diya|diye/.test(lower)) {
      type = 'gave';
    } else if (/लिया|लिये|mila|received|got|liya|liye/.test(lower)) {
      type = 'got';
    } else if (/ko/.test(lower)) {
      type = 'gave';
    } else if (/se/.test(lower)) {
      type = 'got';
    }

    if (amount) {
      // 3. Extract the clean Note by removing the number and filler Hinglish words
      // \b ensures we only remove whole words
      let cleanNote = lower
        .replace(numMatch[0], '')
        .replace(/\b(diya|diye|liya|liye|mila|ko|se|rs|rupees|rupee|muje|mujhe|maine|usne|ne|k|ke|liye|for|gave|got|received)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' '); // collapse multiple spaces

      // If nothing is left (e.g. they only said "100 rs diye"), provide a fallback note
      if (cleanNote.length === 0) {
        cleanNote = type === 'gave' ? 'Given via Voice' : 'Received via Voice';
      } else {
        // Capitalize first letter
        cleanNote = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);
      }

      // 4. Fill in the UI inputs
      const amountInput = document.getElementById('txn-amount');
      if (amountInput) amountInput.value = amount;

      const noteInput = document.getElementById('txn-note');
      if (noteInput) noteInput.value = cleanNote;

      // Dispatch event to ledger.js
      const event = new CustomEvent('voiceEntry', { detail: { amount, type } });
      document.dispatchEvent(event);

      // 5. Show rich success message below the button
      const resultEl = document.getElementById('voice-result');
      if (resultEl) {
        const typeLabel = type === 'gave' ? '🔴 You Gave' : type === 'got' ? '🟢 You Got' : '';
        resultEl.innerHTML = `✅ Amount: <b>₹${amount}</b><br>📝 Note: <b>${cleanNote}</b><br>${typeLabel}`;
      }
    }
  }

  return { init, isSupported };
})();
