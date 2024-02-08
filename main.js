let APIKEY = localStorage.getItem('OPENAI_API_KEY');
if(!APIKEY) {
  APIKEY = prompt('OpenAI API Key?');
  localStorage.setItem('OPENAI_API_KEY', APIKEY);
}
let mediaRecorder;
let audioChunks = [];
let prevValue = '';

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
    textarea.value = prevValue;
  }
}, false);

function setStatus(value) {
  statusEl.innerHTML = value;
}

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
        // Save the current text in case of F1 undo
        prevValue = textarea.value;
        // Do things with the text
        if(parsed.text.startsWith('Sam,')) {
          // Send it to out for a completion, if you're asking Sam (Altman)
          const prompt = parsed.text.slice(4);
          setStatus('Asking about:' + prompt);
          const result = await getCompletion(prompt);
          console.log(result);
          textarea.value = result.choices[0].message.content;
          setStatus('Ready.');
        } else {
          insertTextAtCursor(textarea, parsed.text);
        }

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

async function getCompletion(prompt) {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${APIKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-0125", //Faster
//         model: "gpt-4-0125-preview",
        messages: [
          {
            "role": "system",
            "content": "You are an expert programmer. Return only the source code specified without any extra markup. Do not wrap the code in backticks for markdown. Always return the entire source input with the changes."
          },
          {
            // Submit the whole textarea content as context
            "role": "user",
            "content": textarea.value,
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
