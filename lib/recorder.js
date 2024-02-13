function LastHundredAverage() {
  this.values = [];
  
  this.set = function(value) {
    this.values.push(value);
    if (this.values.length > 100) {
      this.values.shift();
    }
  };
  
  this.getAverage = function() {
    let total = this.values.reduce((acc, curr) => acc + curr, 0);
    return total / this.values.length;
  };
}

const averageVolume = new LastHundredAverage;

async function startRecording(callback) {try {
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
        volume = Math.sqrt(sum / input.length);
        averageVolume.set(volume);
        soundlevel.value = volume;

        if (pauseRecording) return;

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
        callback(audioBlob);
    };
} catch (error) {
    console.error('Error accessing the microphone', error);
}}
