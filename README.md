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

| command                   | description                      |
|---------------------------|----------------------------------|
| Language Javascript       | Set programming language, can be anything since it's just part of the prompt.         |
| Sam, write a function that calculates the fibonacci sequence. | Request a rewrite from Sam (Altman) for the entire document or selection |
| On this line, multiply the sequence variable times 3. | Request a rewrite for the current line |
| Down 12 lines. Up 7 lines. | Adjust the cursor position |
| Find next/previous (search term) | Jump to the next instance of the search term |
| Select inside (curly/parentheses/single quotes/double quotes/carrots) | Select text within specific delimiters `{}`, `()`, `''`, `""`, `<>` |
| Expand selection | Expand the selected text to fill the full lines of any existing selection, or the current line if no selection |
| cut selection/copy selection/grapefruit | Perform internal clipboard operations (grapefruit is picked up easier than paste) |
| beginning/end of selection | Move the cursor position |
| Undo | Revert the last action |
| banana | Replay the last transcription as a prompt to rewrite the selection or entire document |
| avocado | Replay the last transcription as a prompt to rewrite the current line |
| *anything else* | Transcribed with some helpers to convert words to programming characters |

### Undo/Redo

* Press `F1` to undo your last voice command
* Press `F2` to redo
