/**
 * js/pages/chatbot.js
 * AI Virtual Assistant + Health Tips for patient portal
 * Uses Claude claude-sonnet-4-20250514 via Anthropic API
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════
   VIRTUAL ASSISTANT PAGE
══════════════════════════════ */
Pages['assistant'] = () => {
  setTimeout(() => _initChatbot(), 100);
  return `
    <div style="display:grid;grid-template-columns:1fr 360px;gap:16px;height:calc(100vh - 120px);min-height:500px">

      <!-- LEFT: Chat panel -->
      <div style="display:flex;flex-direction:column;background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden">

        <!-- Chat header -->
        <div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center">
            <i class="ti ti-robot" style="font-size:20px;color:#fff"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;color:#fff;font-size:15px">NIHMS Virtual Assistant</div>
            <div style="font-size:11px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px">
              <div style="width:7px;height:7px;border-radius:50%;background:#4ade80;animation:pulse 2s infinite"></div>
              Online · Powered by Claude AI
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="_clearChat()" title="Clear chat" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#fff;font-size:12px">
              <i class="ti ti-trash"></i> Clear
            </button>
            <button onclick="_toggleVoice()" id="voice-btn" title="Voice input" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#fff;font-size:12px">
              <i class="ti ti-microphone"></i> Speak
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fafafa">
          <!-- Welcome message -->
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0F6E56,#1A4A9B);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="ti ti-robot" style="font-size:14px;color:#fff"></i>
            </div>
            <div style="max-width:75%">
              <div style="background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:12px 14px;font-size:14px;line-height:1.6;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.06)">
                Hello! I'm your NIHMS Medical Assistant. Ask me <strong>anything</strong> about your health.
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px">
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-pill" style="font-size:13px;color:var(--green-dark)"></i>Medications</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-flask" style="font-size:13px;color:var(--green-dark)"></i>Lab results</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-heart-rate" style="font-size:13px;color:var(--green-dark)"></i>Symptoms</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-brain" style="font-size:13px;color:var(--green-dark)"></i>Mental health</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-virus" style="font-size:13px;color:var(--green-dark)"></i>HIV &amp; TB</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-baby-carriage" style="font-size:13px;color:var(--green-dark)"></i>Pregnancy</div>
                </div>
                <div style="font-size:12px;color:#888;border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
                  For emergencies call <strong>10177</strong> immediately.
                </div>
              </div>
              <div style="font-size:11px;color:#aaa;margin-top:4px;padding-left:4px">Just now</div>
            </div>
          </div>
        </div>

        <!-- Quick questions -->
        <div id="quick-questions" style="padding:10px 16px;border-top:1px solid var(--border);background:#fff;flex-shrink:0">
          <div style="font-size:11px;color:#aaa;margin-bottom:8px;font-weight:500">SUGGESTED QUESTIONS</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${[
              'What do my blood test results mean?',
              'I have chest pain — is it serious?',
              'What are HIV symptoms and treatment?',
              'How do ARVs work?',
              'What causes high blood pressure?',
              'I feel depressed — what can help?',
              'How does diabetes affect my body?',
              'What should I know about TB?',
              'What is a normal blood sugar level?',
              'Can I mix alcohol with my medication?'
            ].map(q=>`<button onclick="_sendQuickQ('${q}')" style="font-size:12px;padding:5px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg-surface);color:#555;cursor:pointer;white-space:nowrap;transition:all .15s" onmouseover="this.style.background='var(--green-light)';this.style.borderColor='var(--green)';this.style.color='var(--green-dark)'" onmouseout="this.style.background='var(--bg-surface)';this.style.borderColor='var(--border)';this.style.color='#555'">${q}</button>`).join('')}
          </div>
        </div>

        <!-- Input area -->
        <div style="padding:12px 16px;border-top:1px solid var(--border);background:#fff;flex-shrink:0">
          <div style="display:flex;gap:8px;align-items:flex-end">
            <div style="flex:1;position:relative">
              <textarea id="chat-input" rows="1" placeholder="Type your health question or press the mic to speak…"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-family:inherit;font-size:14px;resize:none;outline:none;line-height:1.5;max-height:100px;overflow-y:auto;transition:border-color .15s"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_sendMessage();}"
                oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"
                onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
              </textarea>
            </div>
            <button id="send-btn" onclick="_sendMessage()"
              style="width:42px;height:42px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:all .15s"
              onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
              <i class="ti ti-send"></i>
            </button>
          </div>
          <div style="font-size:11px;color:#bbb;margin-top:6px;text-align:center">
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <!-- RIGHT: Health tips + Knowledge panel -->
      <div style="display:flex;flex-direction:column;gap:12px;overflow-y:auto">

        <!-- Knowledge Search -->
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden">
          <div style="background:linear-gradient(135deg,#1A4A9B,#0F6E56);padding:14px 16px;display:flex;align-items:center;gap:10px">
            <i class="ti ti-search" style="color:#fff;font-size:18px"></i>
            <div style="font-weight:600;color:#fff;font-size:14px">Knowledge Search</div>
          </div>
          <div style="padding:14px">
            <div style="position:relative;margin-bottom:10px">
              <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:14px"></i>
              <input id="kb-search" type="text" placeholder="Search health topics…"
                style="width:100%;padding:9px 9px 9px 32px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;outline:none;font-family:inherit;transition:border-color .15s"
                onkeydown="if(event.key==='Enter')_searchKnowledge(this.value)"
                onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
            </div>
            <div id="kb-results" style="font-size:13px">
              ${_getKbTopics().map(t=>`<div onclick="_searchKnowledge('${t.q}')" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;border:1px solid transparent;margin-bottom:4px" onmouseover="this.style.background='var(--green-light)';this.style.borderColor='var(--green)'" onmouseout="this.style.background='';this.style.borderColor='transparent'">
                <i class="ti ${t.icon}" style="color:var(--green-dark);font-size:14px;flex-shrink:0"></i>
                <span style="color:#333">${t.label}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Daily Health Tips -->
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden;flex:1">
          <div style="background:linear-gradient(135deg,#EF9F27,#E05D2A);padding:14px 16px;display:flex;align-items:center;gap:10px">
            <i class="ti ti-bulb" style="color:#fff;font-size:18px"></i>
            <div style="font-weight:600;color:#fff;font-size:14px">Daily Health Tips</div>
            <button onclick="_refreshTip()" style="margin-left:auto;background:rgba(255,255,255,.2);border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#fff;font-size:11px">
              <i class="ti ti-refresh"></i> New tip
            </button>
          </div>
          <div id="health-tips-body" style="padding:14px">
            <div id="current-tip" style="animation:fadeIn .4s ease"></div>
          </div>
        </div>

      </div>
    </div>

    <style>
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      .typing-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#aaa;animation:typing 1.2s infinite;margin:0 2px}
      .typing-dot:nth-child(2){animation-delay:.2s}
      .typing-dot:nth-child(3){animation-delay:.4s}
    </style>`;
};

/* ── Knowledge base topics ── */
function _getKbTopics() {
  return [
    { icon:'ti-virus',          label:'HIV & AIDS',                    q:'Explain HIV, AIDS, symptoms, CD4 count, and ARV treatment in South Africa' },
    { icon:'ti-lungs',          label:'Tuberculosis (TB)',              q:'What is TB, how is it spread, what are symptoms, and how is it treated with DOTS?' },
    { icon:'ti-droplet-half-2', label:'Diabetes explained',            q:'Explain type 1 and type 2 diabetes, blood sugar levels, symptoms, and management' },
    { icon:'ti-heart-rate',     label:'High blood pressure',           q:'What causes hypertension, what are the symptoms and complications, and how is it treated?' },
    { icon:'ti-pill',           label:'Understanding medications',      q:'How do I know if my medication is working and what are common side effects to watch for?' },
    { icon:'ti-flask',          label:'Reading lab results',           q:'How do I read and understand blood test results like FBC, LFT, urea and cholesterol?' },
    { icon:'ti-brain',          label:'Mental health in SA',           q:'What mental health conditions are common in South Africa and how can I get help?' },
    { icon:'ti-gender-bigender',label:'Sexual & reproductive health',  q:'What should I know about sexual health, STIs, contraception, and reproductive care?' },
    { icon:'ti-baby-carriage',  label:'Pregnancy & maternal health',   q:'What do I need to know about pregnancy, antenatal care, and safe delivery in South Africa?' },
    { icon:'ti-leaf',           label:'Traditional & modern medicine', q:'Can I use traditional medicine alongside modern medicine and what are the risks?' },
    { icon:'ti-shield-check',   label:'Vaccinations & immunisation',   q:'What vaccines do adults and children need in South Africa and why are they important?' },
    { icon:'ti-heart',          label:'Heart disease & stroke',        q:'What are the warning signs of a heart attack and stroke, and what should I do?' },
  ];
}

/* ── Health tips bank ── */
const _healthTips = [
  { icon:'💧', color:'#1A4A9B', bg:'#EEF2FF', title:'Stay Hydrated', body:'Drink 6–8 glasses of water daily. Proper hydration supports kidney function, energy levels, and skin health. Keep a water bottle nearby as a reminder.', category:'Wellness' },
  { icon:'🚶', color:'#0F6E56', bg:'#E1F5EE', title:'Move Every Day', body:'Even 30 minutes of brisk walking daily reduces the risk of heart disease, diabetes, and depression. You don\'t need a gym — a walk in your neighbourhood counts!', category:'Exercise' },
  { icon:'🍎', color:'#E05D2A', bg:'#FEF3EC', title:'Eat the Rainbow', body:'Include fruits and vegetables of different colours in your meals. They provide essential vitamins, minerals, and antioxidants that protect against disease.', category:'Nutrition' },
  { icon:'😴', color:'#7C3AED', bg:'#F5F3FF', title:'Prioritise Sleep', body:'Adults need 7–9 hours of quality sleep. Poor sleep is linked to weight gain, weakened immunity, and mental health problems. Keep a consistent sleep schedule.', category:'Sleep' },
  { icon:'🧘', color:'#D97706', bg:'#FFFBEB', title:'Manage Stress', body:'Chronic stress raises blood pressure and weakens immunity. Try deep breathing: inhale for 4 counts, hold for 4, exhale for 6. Practice for 5 minutes daily.', category:'Mental Health' },
  { icon:'🩺', color:'#DC2626', bg:'#FEF2F2', title:'Regular Check-ups', body:'Annual health screenings catch problems early. Blood pressure, cholesterol, blood sugar, and cancer screenings save lives. Book your next check-up today.', category:'Prevention' },
  { icon:'🚭', color:'#65A30D', bg:'#F7FEE7', title:'Avoid Smoking', body:'Smoking causes 7 out of 10 lung cancer cases. Within just 20 minutes of quitting, your heart rate drops. Your clinic can provide free stop-smoking support.', category:'Lifestyle' },
  { icon:'🤲', color:'#0F6E56', bg:'#E1F5EE', title:'Hand Hygiene', body:'Washing hands with soap for 20 seconds prevents 80% of common infections. Do it after using the toilet, before eating, and after coughing or sneezing.', category:'Hygiene' },
  { icon:'☀️', color:'#D97706', bg:'#FFFBEB', title:'Sunscreen Matters', body:'Even on cloudy days, UV rays damage skin. Apply SPF 30+ sunscreen when outdoors. Skin cancer is one of the most preventable cancers with proper sun protection.', category:'Prevention' },
  { icon:'🦷', color:'#1A4A9B', bg:'#EEF2FF', title:'Oral Health = Body Health', body:'Gum disease is linked to heart disease and diabetes. Brush twice a day, floss daily, and visit a dentist every 6 months for a check-up.', category:'Dental' },
];

let _tipIndex = 0;
let _chatHistory = [];
let _isListening = false;

/* ── Initialise chatbot ── */
function _initChatbot() {
  _tipIndex = Math.floor(Math.random() * _healthTips.length);
  _renderTip();
}

/* ── Render health tip ── */
function _renderTip() {
  const tip = _healthTips[_tipIndex % _healthTips.length];
  const el  = document.getElementById('current-tip');
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:8px 0 14px">
      <div style="font-size:40px;margin-bottom:10px">${tip.icon}</div>
      <span style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:${tip.bg};color:${tip.color}">${tip.category}</span>
    </div>
    <div style="font-weight:700;font-size:16px;color:#111;margin-bottom:10px">${tip.title}</div>
    <div style="font-size:13px;color:#555;line-height:1.7">${tip.body}</div>
    <button onclick="_askAboutTip('${tip.title}')"
      style="margin-top:14px;width:100%;padding:9px;border-radius:10px;border:1.5px solid var(--green);background:transparent;color:var(--green-dark);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s"
      onmouseover="this.style.background='var(--green-light)'" onmouseout="this.style.background='transparent'">
      <i class="ti ti-message-question"></i> Ask about this
    </button>`;
}

window._refreshTip = () => {
  _tipIndex++;
  const el = document.getElementById('current-tip');
  if (el) { el.style.animation='none'; el.offsetHeight; el.style.animation='fadeIn .4s ease'; }
  _renderTip();
};

window._askAboutTip = (title) => {
  const input = document.getElementById('chat-input');
  if (input) { input.value = `Tell me more about: ${title}`; _sendMessage(); }
};

/* ── Knowledge search ── */
window._searchKnowledge = (query) => {
  const input = document.getElementById('kb-search');
  if (input) input.value = query;
  const chatInput = document.getElementById('chat-input');
  if (chatInput) { chatInput.value = query; _sendMessage(); }
};

/* ── Quick question ── */
window._sendQuickQ = (q) => {
  const input = document.getElementById('chat-input');
  if (input) { input.value = q; _sendMessage(); }
};

/* ── Send message to AI ── */
window._sendMessage = async () => {
  const input  = document.getElementById('chat-input');
  const text   = input?.value?.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  // Hide quick questions after first message
  const qq = document.getElementById('quick-questions');
  if (qq) qq.style.display = 'none';

  // Add user message
  _addMessage('user', text);
  _chatHistory.push({ role:'user', content: text });

  // Show typing indicator
  const typingId = _addTypingIndicator();

  // Disable send button
  const btn = document.getElementById('send-btn');
  if (btn) btn.disabled = true;

  try {
    const user = API.getStoredUser();
    const systemPrompt = `You are a knowledgeable and compassionate medical health assistant for NIHMS (National Integrated Healthcare Management System) in South Africa. You help patients understand any medical question they have — no topic is off limits.

Patient: ${user?.firstName || 'Patient'} ${user?.lastName || ''}

You can help with ALL medical questions including:
- Symptoms, causes, and what conditions feel like
- How diseases and medical conditions work
- Medications — what they do, side effects, interactions, dosages
- Lab results — what values mean, normal ranges, what high/low results indicate
- Medical procedures — what to expect, how to prepare, recovery
- Mental health — depression, anxiety, trauma, addiction
- Sexual and reproductive health — completely openly and without judgment
- Chronic disease management — diabetes, hypertension, HIV, TB, asthma
- Child health — paediatrics, vaccinations, development
- Women's health — pregnancy, menstruation, menopause, contraception
- Men's health — prostate, testosterone, sexual function
- Emergency signs — when to go to hospital immediately
- Nutrition, supplements, vitamins, herbal remedies
- Surgery — types, risks, anaesthesia, recovery
- Cancer — types, staging, treatment, side effects
- Genetics and hereditary conditions
- Traditional medicine and its interaction with modern medicine
- South African-specific health concerns (HIV/AIDS, TB, malaria, cholera, load shedding health impacts)
- NHI and public healthcare navigation in South Africa
- Any other medical or health topic the patient asks about

Response style:
- Be thorough, clear, and compassionate — patients deserve complete information
- Use plain language but don't oversimplify — patients can handle real medical information
- Give specific, actionable information not vague platitudes
- For emergency symptoms always include: "Call 10177 or go to your nearest emergency room immediately"
- Mention when professional consultation is important but never refuse to answer
- Reference South African context: public clinics, ARV programmes, DOTS therapy, NHI, traditional healers
- Format responses clearly with short paragraphs; use plain text, avoid markdown symbols`;

    // Call backend proxy (avoids CORS — browser can't call Anthropic directly)
    const res  = await API._fetchDirect('/auth/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages:     _chatHistory.slice(-10),
        systemPrompt: systemPrompt
      })
    });
    const reply = res.reply || 'I\'m sorry, I couldn\'t process your question. Please try again.';

    // Remove typing indicator
    _removeTypingIndicator(typingId);

    // Add AI response
    _addMessage('assistant', reply);
    _chatHistory.push({ role:'assistant', content: reply });

  } catch(e) {
    _removeTypingIndicator(typingId);
    const errMsg = e.message?.includes('ANTHROPIC_API_KEY')
      ? 'The AI assistant needs an API key configured. Please ask your system administrator to add ANTHROPIC_API_KEY to the backend .env file.'
      : 'I\'m having trouble connecting right now. Please try again in a moment, or speak to a nurse at your clinic for assistance.';
    _addMessage('assistant', errMsg);
  } finally {
    if (btn) btn.disabled = false;
    input?.focus();
  }
};

/* ── Add message to chat ── */
function _addMessage(role, text) {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;

  const isUser = role === 'user';
  const time   = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  // Convert simple markdown to HTML
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');

  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:10px;align-items:flex-start;${isUser?'flex-direction:row-reverse':''}`;
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;${isUser?'background:linear-gradient(135deg,#0F6E56,#1A4A9B)':'background:linear-gradient(135deg,#1A4A9B,#0F6E56)'}">
      <i class="ti ti-${isUser?'user':'robot'}" style="font-size:14px;color:#fff"></i>
    </div>
    <div style="max-width:75%">
      <div style="${isUser
        ? 'background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;border-radius:12px 0 12px 12px'
        : 'background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.06)'};padding:12px 14px;font-size:14px;line-height:1.6">
        <p style="margin:0">${formatted}</p>
      </div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;${isUser?'text-align:right':''}padding:0 4px">${time}</div>
    </div>`;

  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

/* ── Typing indicator ── */
function _addTypingIndicator() {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return null;
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id    = id;
  div.style.cssText = 'display:flex;gap:10px;align-items:flex-start';
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1A4A9B,#0F6E56);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="ti ti-robot" style="font-size:14px;color:#fff"></i>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:14px 18px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}

function _removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* ── Clear chat ── */
window._clearChat = () => {
  _chatHistory = [];
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  const qq = document.getElementById('quick-questions');
  if (qq) qq.style.display = 'block';
  _addMessage('assistant', 'Chat cleared. How can I help you today?');
};

/* ── Voice input ── */
window._toggleVoice = () => {
  const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SRClass) {
    UI.showToast('Voice input not supported. Please use Chrome or Edge.', 'err');
    return;
  }
  const btn = document.getElementById('voice-btn');
  if (_isListening && window._recognition) {
    window._recognition.stop();
    return; // onend handles the rest
  }
  try {
    window._recognition = new SRClass();
    window._recognition.lang = 'en-ZA';
    window._recognition.continuous = false;
    window._recognition.interimResults = false;
    window._recognition.maxAlternatives = 1;
    window._recognition.onstart = () => {
      _isListening = true;
      if (btn) { btn.innerHTML='<i class="ti ti-microphone" style="animation:pulse 1s infinite"></i> Listening…'; btn.style.background='rgba(231,76,60,.7)'; }
    };
    window._recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r=>r[0].transcript).join(' ').trim();
      if (text) { const input=document.getElementById('chat-input'); if(input){ input.value=text; _sendMessage(); } }
    };
    window._recognition.onerror = (e) => {
      UI.showToast('Voice error: '+(e.error||'unknown')+'. Please type instead.', 'err');
    };
    window._recognition.onend = () => {
      _isListening = false;
      if (btn) { btn.innerHTML='<i class="ti ti-microphone"></i> Speak'; btn.style.background='rgba(255,255,255,.15)'; }
    };
    window._recognition.start();
  } catch(e) {
    UI.showToast('Voice input failed: '+e.message, 'err');
  }
};
