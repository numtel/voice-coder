

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
