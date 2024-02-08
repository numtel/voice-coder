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

const statusEl = document.getElementById('status');
const textarea = document.getElementById('text');

document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape') {
    if(mediaRecorder) {
      setStatus('Transcribing... (Escape again to finish)');
      mediaRecorder.stop();
    } else {
      setStatus('Recording...');
      startRecording();
    }
  } else if(event.key === 'F1') {
    undo();
  } else if(event.key === 'F2') {
    redo();
  }
}, false);

function undo() {
  if(prevValue.length === 0) return;
  const [prev, selPos] = prevValue.pop();
  nextValue.push([textarea.value, textarea.selectionStart]);
  textarea.value = prev;
  textarea.selectionStart = selPos;
}

function redo() {
  if(nextValue.length === 0) return;
  const [next, selPos] = nextValue.pop();
  prevValue.push([textarea.value, textarea.selectionStart]);
  textarea.value = next;
  textarea.selectionStart = selPos;
}

async function fullRewrite(prompt) {
  setStatus('Asking about:' + prompt);
  const result = await getCompletion(prompt, textarea.value);
  textarea.value = result.choices[0].message.content;
}

async function lineRewrite(prompt) {
  setStatus('Updating line:' + prompt);
  const context = getCurrentLineString(textarea);
  const result = await getCompletion(prompt, context);
  replaceCurrentLine(textarea, result.choices[0].message.content);
}

function setStatus(value) {
  statusEl.innerHTML = value;
}
setStatus(`Ready (${language})`);

async function startRecording() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.onstart = () => {
        audioChunks = [];
      };
      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const formData = new FormData();
        formData.append("file", audioBlob);
        formData.append("model", "whisper-1");
        mediaRecorder = null;

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
        prevValue.push([textarea.value, textarea.selectionStart]);
        // Clear redo cache
        nextValue.splice(0, nextValue.length);
        // Do things with the text
        console.log(parsed.text);
        if(parsed.text.startsWith('Sam,')) {
          // Send it to out for a completion, if you're asking Sam (Altman)
          const prompt = parsed.text.slice(4);
          await fullRewrite(prompt);
        } else if(parsed.text.toLowerCase().startsWith('on this line,')) {
          const prompt = parsed.text.slice(13);
          await lineRewrite(prompt);
        } else if(parsed.text.toLowerCase().startsWith('language')) {
          const prompt = parsed.text.slice(9);
          language = prompt;
          localStorage.setItem('LANGUAGE', prompt);
        } else if(/^banana[\s\W]*$/i.test(parsed.text)) {
          undo();
          await fullRewrite(lastTranscription);
        } else if(/^avocado[\s\W]*$/i.test(parsed.text)) {
          undo();
          await lineRewrite(lastTranscription);
        } else {
          // TODO be exhaustive
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
            .replace(/new line/gi, '\n');
          if(codeish.endsWith('.'))
            codeish = codeish.slice(0, -1);

          lastTranscription = codeish;
          insertTextAtCursor(textarea, codeish);
        }
        setStatus(`Ready (${language})`);

      };
      mediaRecorder.start();
    } catch (error) {
      console.error(error);
      setStatus('Cannot access microphone!');
    }
  } else {
    setStatus("Your browser does not support audio capture");
  }
}

async function getCompletion(prompt, context) {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${APIKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-0125", // Faster + cheaper
//         model: "gpt-4-0125-preview",
        messages: [
          {
            "role": "system",
            "content": `You are an expert ${language} programmer. Return only the source code specified without any extra markup. Do not wrap the code in backticks for markdown. Always return the entire source input with the changes.`
          },
          {
            "role": "user",
            "content": context,
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
      }),
    }
  );

  const parsed = await response.json();
  return parsed;
}

// Thanks ChatGPT
function insertTextAtCursor(textarea, textToInsert) {
    // Get current text and cursor position
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    const textAfterCursor = textarea.value.substring(cursorPosition);

    // Insert the text at the cursor position
    textarea.value = textBeforeCursor + textToInsert + textAfterCursor;

    // Move the cursor to the end of the inserted text
    textarea.selectionStart = textarea.selectionEnd = cursorPosition + textToInsert.length;

    // Optionally, focus the textarea (useful if the insert is triggered by a button)
    textarea.focus();
}

// More from ChatGPT
function replaceCurrentLine(textarea, newLineText) {
    // Get current cursor position
    const cursorPos = textarea.selectionStart;

    // Get the current content of the textarea
    const text = textarea.value;

    // Find the start of the current line
    let lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;

    // Find the end of the current line
    let lineEnd = text.indexOf('\n', cursorPos);
    if (lineEnd === -1) lineEnd = text.length;

    // Replace the current line with newLineText
    textarea.value = text.substring(0, lineStart) + newLineText + text.substring(lineEnd);

    // Set cursor position to the end of the replaced line
    const newPos = lineStart + newLineText.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
}

// More from ChatGPT
function getCurrentLineString(textarea) {
  // Get cursor position
  const cursorPos = textarea.selectionStart;
  // Get text before cursor
  const textBeforeCursor = textarea.value.substring(0, cursorPos);
  // Find the start of the current line
  const startOfLine = textBeforeCursor.lastIndexOf('\n') + 1;
  // Find the end of the current line
  const endOfLine = textarea.value.indexOf('\n', cursorPos);
  // Extract the current line text
  const currentLineText = endOfLine === -1
                          ? textarea.value.substring(startOfLine) // If there's no newline after cursor
                          : textarea.value.substring(startOfLine, endOfLine); // If there is a newline after cursor

  return currentLineText;
}

