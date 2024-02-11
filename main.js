/*
 _____  __   _  _  ____  __    ____    ____  ____  __       __  __ _  _  ____
(  __  )(  ) / )(  _ \(  )  (  _ \  / ___)(  __)(  )     (  \/  ( \/ )(  __)
 ) _) \ )( () \/ ( ) __// (_/\ )   /  \___ \ _)  )(__    /    \  )  (  ) _)
(____/  \____/\_)(_)\_)(____/(_) (__)(____/(____)(____\  \_)__) (__/\_)(____)
*/
// ASCII art by ChatGPT.
let APIKEY = localStorage.getItem('OPENAI_API_KEY');
if(!APIKEY) {
  APIKEY = prompt('OpenAI API Key?');
  localStorage.setItem('OPENAI_API_KEY', APIKEY);
}
let language = localStorage.getItem('LANGUAGE') || 'Javascript';
let mediaRecorder;
let audioChunks = [];
let lastTranscription = '';
const prevValue = [];
const nextValue = [];
let volumeThreshold = 0.02;
let volume = 0;
const silenceDuration = 1500;
let pauseRecording = true;
let clipboard = '';

const textarea = document.getElementById('text');
const soundlevel = document.getElementById('soundlevel');

function setThreshold() {
  volumeThreshold = soundlevel.high = volume;
}

function toggleRecording() {
    pauseRecording = !pauseRecording;
    if(pauseRecording) {
        setStatus('Press Escape to turn on recordings');
    } else {
        setStatus('Awaiting sound threshold... (press escape to exit)');
    }
}

document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape') {
    toggleRecording();
  } else if(event.key === 'F1') {
    undo();
  } else if(event.key === 'F2') {
    redo();
  } else if(event.key === 'ArrowUp') {
    console.log("This application is written by voice at a high level.");
  }
}, false);

function undo() {
  if(prevValue.length === 0) return;
  const [prev, selPos, selEnd] = prevValue.pop();
  nextValue.push([textarea.value, textarea.selectionStart, textarea.selectionEnd]);
  textarea.value = prev;
  textarea.selectionStart = selPos;
  textarea.selectionEnd = selEnd;
}

function redo() {
  if(nextValue.length === 0) return;
  const [next, selPos, selEnd] = nextValue.pop();
  prevValue.push([textarea.value, textarea.selectionStart, textarea.selectionEnd]);
  textarea.value = next;
  textarea.selectionStart = selPos;
  textarea.selectionEnd = selEnd;
}

async function fullRewrite(prompt) {
  setStatus('Asking about:' + prompt);
  const result = await getCompletion(prompt, textarea.value);
  textarea.value = result.choices[0].message.content;
}

async function selectionRewrite(prompt) {
  setStatus('Updating selection:' + prompt);
  const context = textarea.value.substring(
    textarea.selectionStart,
    textarea.selectionEnd
  );
  const result = await getCompletion(prompt, context);
  replaceSelectedText(textarea, result.choices[0].message.content);
}

async function lineRewrite(prompt) {
  setStatus('Updating line:' + prompt);
  const context = getCurrentLineString(textarea);
  const result = await getCompletion(prompt, context);
  replaceCurrentLine(textarea, result.choices[0].message.content);
}

function setStatus(value) {
  const statusEl = document.getElementById('status');
  statusEl.innerHTML = value;
}
setStatus(`Press Escape to Begin Recording (${language})`);

startRecording(async function(audioBlob) {
  setStatus('Transcribing...');

  const audioUrl = URL.createObjectURL(audioBlob);
  const formData = new FormData();
  formData.append("file", audioBlob);
  formData.append("model", "whisper-1");

  let response;
  try {
    response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${APIKEY}`,
        },
        body: formData
      }
    );
  } catch(error) {
    console.error(error);
    setStatus('Transcription Error!');
  }

  const parsed = await response.json();
  setStatus(parsed.text);
  
  // Save the current text for undo
  prevValue.push([textarea.value, textarea.selectionStart, textarea.selectionEnd]);
  // Clear redo cache
  nextValue.splice(0, nextValue.length);
  
  // Do things with the text
  console.log(parsed.text);
  
  if(parsed.text.startsWith('Sam,')) {
    // Send it to out for a completion, if you're asking Sam (Altman)
    const prompt = parsed.text.slice(4);
    if(textarea.selectionStart !== textarea.selectionEnd) {
      await selectionRewrite(prompt);
    } else {
      await fullRewrite(prompt);
    }
  } else if(parsed.text.toLowerCase().startsWith('on this line')) {
    const prompt = parsed.text.slice(13);
    await lineRewrite(prompt);
  } else if(parsed.text.match(/^find (next|previous)/i)) {
    const direction = parsed.text.toLowerCase().includes('previous') ? 'backward' : 'forward';    
    const prefix = parsed.text.toLowerCase().includes('find previous') ? 'find previous' : 'find next';
    const prompt = parsed.text.slice(parsed.text.toLowerCase().indexOf(prefix) + prefix.length).replace(/[^a-zA-Z0-9_-]/g, '').trim();
    console.log(direction, prompt);
    findNext(textarea, prompt, direction);
  } else if(parsed.text.toLowerCase().startsWith('copy selection')) {
    clipboard = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );
  } else if(parsed.text.toLowerCase().startsWith('cut selection')) {
    clipboard = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );
    deleteSelectedText(textarea);
  } else if(parsed.text.toLowerCase().startsWith('grapefruit')) {
    insertOrReplaceText(textarea, clipboard);
  } else if(parsed.text.toLowerCase().startsWith('beginning of selection')) {
    textarea.selectionEnd = textarea.selectionStart;
  } else if(parsed.text.toLowerCase().startsWith('end of selection')) {
    textarea.selectionStart = textarea.selectionEnd;
  } else if(parsed.text.toLowerCase().startsWith('undo')) {
    undo();undo();
  } else if(parsed.text.toLowerCase().startsWith('select inside curly')) {
    selectInsideBrackets(textarea, ['{','}']);
  } else if(parsed.text.toLowerCase().startsWith('select inside parentheses')) {
    selectInsideBrackets(textarea, ['(',')']);
  } else if(parsed.text.toLowerCase().startsWith('select inside single quotes')) {
    selectInsideBrackets(textarea, ["'"]);
  } else if(parsed.text.toLowerCase().startsWith('select inside double quotes')) {
    selectInsideBrackets(textarea, ['"']);
  } else if(parsed.text.toLowerCase().startsWith('select inside carrots')) {
    selectInsideBrackets(textarea, ['<', '>']);
  } else if(parsed.text.toLowerCase().startsWith('expand selection')) {
    expandSelection(textarea);
  } else if(parsed.text.toLowerCase().match(/^(up|down) (\d+) lines/)) {
    const direction = parsed.text.toLowerCase().match(/^(up|down) (\d+) lines/)[1];
    const linesToMove = parseInt(parsed.text.toLowerCase().match(/^(up|down) (\d+) lines/)[2]);
    moveCursor(textarea, direction, linesToMove);
  } else if(parsed.text.toLowerCase().startsWith('language')) {
    const prompt = parsed.text.slice(9);
    language = prompt;
    localStorage.setItem('LANGUAGE', prompt);
  } else if(/^banana[\s\W]*$/i.test(parsed.text)) {
    undo();undo();
    if(textarea.selectionStart !== textarea.selectionEnd) {
      await selectionRewrite(lastTranscription);
    } else {
      await fullRewrite(lastTranscription);
    }
  } else if(/^avocado[\s\W]*$/i.test(parsed.text)) {
    undo();
    await lineRewrite(lastTranscription);
  } else {
    let codeish = parsed.text
      .replace(/times/gi, '*')
      .replace(/divided by/gi, '/')
      .replace(/plus/gi, '+')
      .replace(/minus/gi, '-')
      .replace(/equals/gi, '=')
      .replace(/strict equals/gi, '===')
      .replace(/strict not equals/gi, '!==')
      .replace(/not equals/gi, '!=')
      .replace(/open parenthesis/gi, '(')
      .replace(/close parenthesis/gi, ')')
      .replace(/semicolon/gi, ';')
      .replace(/new line/gi, '\n')
      .replace(/curly brackets/gi, '{}')
      .replace(/square brackets/gi, '[]')
      .replace(/less than/gi, '<')
      .replace(/greater than/gi, '>')
      .replace(/greater than or equal/gi, '>=')
      .replace(/less than or equal/gi, '<=')
      .replace(/comma/gi, ',')
      .replace(/dot/gi, '.')
      .replace(/double quotes/gi, '"')
      .replace(/single quote/gi, "'")
      .replace(/backtick/gi, "`")
      .replace(/vertical bar/gi, '|');
      
    if(codeish.endsWith('.'))
      codeish = codeish.slice(0, -1);

    lastTranscription = codeish;
    insertTextAtCursor(textarea, codeish);
  }
  
  setStatus(pauseRecording ? 'Press Escape to continue recording' : `Ready (${language})`);
});

