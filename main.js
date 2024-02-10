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
const volumeThreshold = 0.02;
const silenceDuration = 1500;
let pauseRecording = true;

const textarea = document.getElementById('text');
const soundlevel = document.getElementById('soundlevel');

document.addEventListener('keydown', (event) => {if(event.key === 'Escape') {
  pauseRecording = !pauseRecording;
    if(pauseRecording) {
      setStatus('Press Escape to turn on recordings');
    } else {
      setStatus('Awaiting sound threshold... (press escape to exit)');
    }
  } else if(event.key === 'F1') {
    undo();
  } else if(event.key === 'F2') {
    redo();
  } else if(event.key === 'ArrowUp') {
console.log("This application is written by voice at a high level.");
  }}, false);

function undo() {
  if(prevValue.length === 0) return;
  const [prev, selPos] = prevValue.pop();
  nextValue.push([textarea.value, textarea.selectionStart]);
  textarea.value = prev;
  textarea.selectionStart = textarea.selectionEnd = selPos;
}

function redo() {
  if(nextValue.length === 0) return;
  const [next, selPos] = nextValue.pop();
  prevValue.push([textarea.value, textarea.selectionStart]);
  textarea.value = next;
  textarea.selectionStart = textarea.selectionEnd = selPos;
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

async function startRecording2 () {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(512, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        let recording = false;
        let silenceStart = 0;
        let recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        processor.onaudioprocess = function(event) {
            const input = event.inputBuffer.getChannelData(0);
            let sum = 0.0;
            for (let i = 0; i < input.length; ++i) {
                sum += input[i] * input[i];
            }
            let volume = Math.sqrt(sum / input.length);
            soundlevel.value = volume;

            if(pauseRecording) return;

            if (volume > volumeThreshold && !recording) { // Threshold: adjust based on testing
                recording = true;
                recordedChunks = [];
                mediaRecorder.start();
                setStatus('Recording started');
            } else if (volume <= volumeThreshold && recording) {
                if (silenceStart === 0) silenceStart = new Date().getTime();
                else if ((new Date().getTime() - silenceStart) > silenceDuration) { // 3 seconds of silence
                    mediaRecorder.stop();
                    recording = false;
                    setStatus('Recording stopped');
                    silenceStart = 0;
                }
            } else if (volume > volumeThreshold && recording) {
                silenceStart = 0; // reset silence timer
            }
        };

        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async function() {
            const audioBlob = new Blob(recordedChunks, { 'type' : 'audio/wav' });
            // Here you can save the blob to a file or upload it to a server, etc.
            console.log('Recording saved', audioBlob);
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
                prevValue.push([textarea.value, textarea.selectionStart]);
                // Clear redo cacheThis is a test
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
                } else if(parsed.text.toLowerCase().startsWith('on this line,')) {
                    const prompt = parsed.text.slice(13);
                    await lineRewrite(prompt);
                } else if(parsed.text.toLowerCase().startsWith('select inside curly')) {
                    selectInsideBrackets(textarea, ['{','}']);
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
                setStatus(`Ready (${language})`);
        };
    } catch (error) {
        console.error('Error accessing the microphone', error);
    }
}
startRecording2();



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
function selectInsideBrackets(textarea, bracketType) {
  const text = textarea.value;
  const start = text.lastIndexOf(bracketType[0], textarea.selectionStart);
  let end = text.indexOf(bracketType[1], textarea.selectionEnd);

  if (start !== -1 && end !== -1) {
    let count = 1;
    let i = start + 1;
    
    while (i < text.length && count !== 0) {
      if (text[i] === bracketType[0]) {
        count++;
      } else if (text[i] === bracketType[1]) {
        count--;
        if (count === 0) {
          end = i;
        }
      }
      i++;
    }

    if (count === 0) {
      textarea.setSelectionRange(start + 1, end);
    }
  }
}

// More from ChatGPT
function replaceSelectedText(textArea, newText) {
    let startPos = textArea.selectionStart;
    let endPos = textArea.selectionEnd;

    textArea.value = textArea.value.substring(0, startPos) + newText + textArea.value.substring(endPos);
}

function loadFile() {
    const filename = document.getElementById('filename').value;
    fetch(`/file/${filename}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('text').value = data;
        })
        .catch(error => {
            setStatus(error.message);
        });
}

function saveFile() {
    const filename = document.getElementById('filename').value;
    const content = document.getElementById('text').value;
    fetch(`/file/${filename}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: content
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save file');
            }
            return response.text();
        })
        .then(data => {
            setStatus(data);
        })
        .catch(error => {
            setStatus(error.message);
        });
}
