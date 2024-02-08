# voice-coder 

## Installation

Will ask for your OpenAI API Key on first launch. (Saved in localStorage)

```
$ git clone git@github.com:numtel/voice-coder.git
$ cd voice-coder
# Serve this current directory at http://localhost:3000/
$ python3 -m http.server 3000
```

## Commands

### Voice

Press `Escape` to begin recording and again to stop. Transcription will proceed automatically.

> Language Javascript

Set programming language

> Sam, write a function that calculates the fibonacci sequence.

Ask same for a rewrite of your entire document.

> On this line, multiply the sequence variable times 3.

Ask for a rewrite of the current line.

> Anything else

Transcript is typed into the document

> banana

Last transcription was actually meant for Sam to do full rewrite

> avocado

Last transcription was actually meant for a line rewrite

### Undo/Redo

Press F1 to undo your last voice command

Press F2 to redo
