# voice-coder 

> Look ma, no hands!

*Turn on the sound*

https://github.com/numtel/voice-coder/assets/518698/073ac4ff-8110-4249-9c14-c2c8efb91512


## Installation

Will ask for your OpenAI API Key on first launch. (Saved in localStorage)

```
$ git clone git@github.com:numtel/voice-coder.git
$ cd voice-coder
# Serve this current directory at http://localhost:3000/
$ npm start
```

## Commands

### Voice

Press `Escape` to begin recording and again to stop. Transcription will proceed automatically.

> Language Javascript

Set programming language

> Sam, write a function that calculates the fibonacci sequence.

Ask same for a rewrite of your entire document or rewrite selection if there is one.

> On this line, multiply the sequence variable times 3.

Ask for a rewrite of the current line.

> Down 12 lines. Up 7 lines.

Up/down a number of lines. Some numbers cause non digit character responses. Avoid those.

> Find next|previous <search term>

Jump to the next instance of the search term

> Select inside curly

Selects the text inside the closest curly `{}` braces, can then ask Sam to rewrite that selection

> Anything else

Transcript is typed into the document

> banana

Last transcription was actually meant for Sam to do full rewrite

> avocado

Last transcription was actually meant for a line rewrite

### Undo/Redo

Press F1 to undo your last voice command

Press F2 to redo
