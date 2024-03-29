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
  volumeThreshold = soundlevel.high = averageVolume.getAverage();
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
  statusEl.className = pauseRecording ? 'off' : 'on';
}
setStatus(`Press Escape to Begin Recording (${language})`);

const commands = {
  'sam': async (parsed) => {
    // Send it to out for a completion, if you're asking Sam (Altman)
    const prompt = parsed.text.slice(4);
    if(textarea.selectionStart !== textarea.selectionEnd) {
      await selectionRewrite(prompt);
    } else {
      await fullRewrite(prompt);
    }
  },
  'on this line': async (parsed) => {
    const prompt = parsed.text.slice(13);
    await lineRewrite(prompt);
  },
  'find (next|previous)': async (parsed) => {
    const direction = parsed.text.toLowerCase().includes('previous') ? 'backward' : 'forward';
    const prefix = parsed.text.toLowerCase().includes('find previous') ? 'find previous' : 'find next';
    const prompt = parsed.text.slice(parsed.text.toLowerCase().indexOf(prefix) + prefix.length).replace(/[^a-zA-Z0-9_-]/g, '').trim();
    console.log(direction, prompt);
    findNext(textarea, prompt, direction);
  },
  'copy selection': async (parsed) => {
    clipboard = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  },
  'cut selection': async (parsed) => {
    clipboard = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    deleteSelectedText(textarea);
  },
  'grapefruit': async (parsed) => {
    insertOrReplaceText(textarea, clipboard);
  },
  'beginning of selection': async (parsed) => {
    textarea.selectionEnd = textarea.selectionStart;
  },
  'end of selection': async (parsed) => {
    textarea.selectionStart = textarea.selectionEnd;
  },
  'undo': async (parsed) => {
    undo();undo();
  },
  'select inside curly': async (parsed) => {
    selectInsideBrackets(textarea, ['{','}']);
  },
  'select inside parentheses': async (parsed) => {
    selectInsideBrackets(textarea, ['(',')']);
  },
  'select inside single quotes': async (parsed) => {
    selectInsideBrackets(textarea, ["'"]);
  },
  'select inside double quotes': async (parsed) => {
    selectInsideBrackets(textarea, ['"']);
  },
  'select inside carrots': async (parsed) => {
    selectInsideBrackets(textarea, ['<', '>']);
  },
  'expand selection': async (parsed) => {
    expandSelection(textarea);
  },
  'move (up|down) (\\d+) lines': async (parsed) => {
    const direction = parsed.text.toLowerCase().match(/^move (up|down) (\d+) lines/)[1];
    const linesToMove = parseInt(parsed.text.toLowerCase().match(/^move (up|down) (\d+) lines/)[2]);
    moveCursor(textarea, direction, linesToMove);
  },
  'language': async (parsed) => {
    const prompt = parsed.text.slice(9);
    language = prompt;
    localStorage.setItem('LANGUAGE', prompt);
  },
  'banana': async (parsed) => {
    undo();undo();
    if(textarea.selectionStart !== textarea.selectionEnd) {
      await selectionRewrite(lastTranscription);
    } else {
      await fullRewrite(lastTranscription);
    }
  },
  'avocado': async (parsed) => {
    undo();
    await lineRewrite(lastTranscription);
  },
}

async function executeCommand(parsed) {
  const commandsStr = Object.keys(commands);
  let wasCommand = false;
  for(let i = 0; i < commandsStr.length; i++) {
    if((new RegExp(`^${commandsStr[i]}`, 'i')).test(parsed.text)) {
      wasCommand = true;
      await commands[commandsStr[i]](parsed);
    }
  }
  return wasCommand;
}

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
  console.log('Raw text:', parsed.text);
  const wasCommand = await executeCommand(parsed);

  if(!wasCommand) {
    if(!parsed.text) return;
    setStatus('Improving transcription: ' + parsed.text);
    // Attempt to correct transcription errors
    const result = await getCompletion('Correct the command or if it does not seem like one of the available commands, fix the transcription so that it is a valid source code fragment.', parsed.text, `You are a helpful assistant. Your task is to correct any discrepancies in the transcribed voice command or source code transcription. Make sure that the following commands (in regular expresion form) are spelled correctly: ${Object.keys(commands).join(', ')}. The commands to move up and down a number of lines can require changing numbers spelled out into numerical digits. Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided. Correct any source code transcription as if it were in ${language}. Do not return anything except the fixed command or the fixed source code fragment.`);
    const fixedCommand = result.choices[0].message.content;
    console.log('Improved text:', fixedCommand);
    const wasCommand2 = await executeCommand({text: fixedCommand});
    if(!wasCommand2) {
      let codeish = fixedCommand
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
  }

  setStatus(pauseRecording ? 'Press Escape to continue recording' : `Ready (${language})`);
});

