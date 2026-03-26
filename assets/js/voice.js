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
    let targetCustomer = null;

    // 1. Extract the number
    const numMatch = lower.match(/\d+(\.\d+)?/);
    if (numMatch) amount = parseFloat(numMatch[0]);

    // 2. Determine transaction type
    if (/दिया|दिये|gave|give|diya|diye|ko/.test(lower)) type = 'gave';
    else if (/लिया|लिये|mila|received|got|liya|liye|se/.test(lower)) type = 'got';

    // 3. Find Customer Name
    const allCustomers = Customers.getAll();
    for (const c of allCustomers) {
      if (lower.includes(c.name.toLowerCase())) {
        targetCustomer = c;
        break;
      }
    }

    const resultEl = document.getElementById('voice-result');

    if (amount && type && targetCustomer) {
      // Clean up note
      let cleanNote = lower.replace(numMatch[0], '').replace(new RegExp(targetCustomer.name, 'ig'), '').trim();
      cleanNote = cleanNote.replace(/\b(diya|diye|liya|liye|mila|ko|se|rs|rupees|rupee)\b/gi, '').trim() || 'Voice Entry';

      // Dispatch event
      const event = new CustomEvent('voiceEntry', { detail: { amount, type, note: cleanNote, customer: targetCustomer } });
      document.dispatchEvent(event);

      if (resultEl) {
        const typeLabel = type === 'gave' ? '🔴 You Gave' : '🟢 You Got';
        resultEl.innerHTML = `✅ <b>${targetCustomer.name}</b><br>Amount: <b>₹${amount}</b><br>📝 ${cleanNote}<br>${typeLabel}`;
      }
    } else {
      if (resultEl) {
        resultEl.innerHTML = `❌ Couldn't understand. Please say: "<b>Customer Name</b> ko <b>Amount</b> diya"`;
        resultEl.classList.add('show');
        setTimeout(() => resultEl.classList.remove('show'), 4000);
      }
    }
  }

  return { init, isSupported };
})();
