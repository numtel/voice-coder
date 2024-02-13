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
  const openingBracket = bracketType[0];
  const closingBracket = bracketType[1] || bracketType[0];
  const start = text.lastIndexOf(openingBracket, textarea.selectionStart);
  let end = text.indexOf(closingBracket, textarea.selectionEnd);

  if (start !== -1 && end !== -1) {
    let count = 1;
    let i = start + 1;
    
    while (bracketType.length > 1 && i < text.length && count !== 0) {
      if (text[i] === openingBracket) {
        count++;
      } else if (text[i] === closingBracket) {
        count--;
        if (count === 0) {
          end = i;
        }
      }
      i++;
    }

    if (bracketType.length === 1 || count === 0) {
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


function moveCursor(textarea, direction, lines) {
  var currentPosition = textarea.selectionStart;
  var newPosition;

  if (direction === 'up') {
    newPosition = currentPosition;
    for (var i = 0; i < lines; i++) {
      newPosition = textarea.value.lastIndexOf('\n', newPosition - 1);
      if (newPosition === -1) {
        break;
      }
    }
  } else if (direction === 'down') {
    newPosition = currentPosition;
    for (var i = 0; i < lines; i++) {
      newPosition = textarea.value.indexOf('\n', newPosition + 1);
      if (newPosition === -1) {
        break;
      }
    }
  }
  
  if (newPosition !== -1) {
    textarea.selectionStart = newPosition + 1;
    textarea.selectionEnd = newPosition + 1;
    textarea.focus();
  }
}
function findNext(textarea, str, direction) {
    const text = textarea.value;
    const startPos = textarea.selectionStart + (direction === 'forward' ? 1 : -1);
    let nextIndex;
    
    if (direction === 'forward') {
        nextIndex = text.toLowerCase().indexOf(str.toLowerCase(), startPos);
    } else {
        nextIndex = text.toLowerCase().lastIndexOf(str.toLowerCase(), startPos);
    }

    if (nextIndex === -1) {
        if (direction === 'forward') {
            nextIndex = text.toLowerCase().indexOf(str.toLowerCase(), 0);
        } else {
            nextIndex = text.toLowerCase().lastIndexOf(str.toLowerCase(), text.length);
        }
    }

    if (nextIndex !== -1) {
        textarea.selectionStart = nextIndex;
        textarea.selectionEnd = nextIndex + str.length;
    }
}

function expandSelection(textarea) {
  let { selectionStart, selectionEnd } = textarea;
  
  // Move selection start to the beginning of the current line
  while (selectionStart > 0 && textarea.value[selectionStart - 1] !== '\n') {
    selectionStart--;
  }
  
  // Move selection end to the end of the current line
  while (selectionEnd < textarea.value.length && textarea.value[selectionEnd] !== '\n') {
    selectionEnd++;
  }
  
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
}

function deleteSelectedText(textarea) {
    var startPosition = textarea.selectionStart;
    var endPosition = textarea.selectionEnd;
    var textBeforeSelection = textarea.value.substring(0, startPosition);
    var textAfterSelection = textarea.value.substring(endPosition);
    textarea.value = textBeforeSelection + textAfterSelection;

    // Set the selection/cursor position to the starting position
    textarea.selectionStart = startPosition;
    textarea.selectionEnd = startPosition;
}
function insertOrReplaceText(textarea, newText) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const text = textarea.value;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    textarea.value = beforeText + newText + afterText;
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;
}
function scrollCursorIntoView(textarea) {
    const cursorLineNumber = textarea.value.substr(0, textarea.selectionStart).split('\n').length;
    const firstVisibleLine = textarea.scrollTop / textarea.scrollHeight * textarea.value.split('\n').length;
    const lastVisibleLine = firstVisibleLine + textarea.clientHeight / textarea.scrollHeight * textarea.value.split('\n').length;

    if (cursorLineNumber < firstVisibleLine || cursorLineNumber > lastVisibleLine) {
        const lineHeight = textarea.scrollHeight / textarea.value.split('\n').length;
        const targetScrollTop = (cursorLineNumber * lineHeight) - (textarea.clientHeight / 2);
        textarea.scrollTop = targetScrollTop;
    }
}
