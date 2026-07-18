// Set up PDF.js worker (fixed trailing spaces in URL)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js  ';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropArea = document.getElementById('dropArea');
const fileInfo = document.getElementById('fileInfo');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const outputText = document.getElementById('outputText');
const statusDiv = document.getElementById('status');
const fileList = document.getElementById('fileList');
const clearBtn = document.getElementById('clearBtn');

// Set file input to accept PDF, TXT, and ZIP by default
fileInput.accept = '.pdf,.txt,.zip,application/pdf,text/plain,application/zip,application/x-zip-compressed';

let uploadedFiles = [];
let convertedText = '';

// Event Listeners
browseBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);
copyBtn.addEventListener('click', copyText);
saveBtn.addEventListener('click', saveText);
clearBtn.addEventListener('click', clearAll);

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
        handleFiles(files);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function isSupportedFile(file) {
    // Check by MIME type
    const type = file.type;
    if (type === 'application/pdf' || type === 'text/plain' ||
        type === 'application/zip' || type === 'application/x-zip-compressed') {
        return true;
    }
    // Fallback: check by extension for cases where MIME type is empty/incorrect
    const name = file.name.toLowerCase();
    return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.zip');
}

function getFileType(file) {
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
        return 'pdf';
    }
    if (file.type === 'text/plain' || name.endsWith('.txt')) {
        return 'txt';
    }
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || name.endsWith('.zip')) {
        return 'zip';
    }
    return null;
}

function handleFiles(files) {
    let newFilesCount = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isSupportedFile(file)) {
            uploadedFiles.push(file);
            addFileToList(file);
            newFilesCount++;
        }
    }
    
    if (newFilesCount > 0) {
        fileInfo.textContent = `${uploadedFiles.length} file(s) selected`;
        showStatus(`Processing ${newFilesCount} new file(s)...`, 'info');
        convertNewFiles(files);
    } else {
        showStatus('Please select valid PDF, TXT, or ZIP files', 'error');
    }
}

function addFileToList(file) {
    // Remove the "No files uploaded yet" message if it exists
    if (fileList.children.length === 1 && fileList.children[0].textContent === 'No files uploaded yet') {
        fileList.innerHTML = '';
    }
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    const fileType = getFileType(file);
    let typeLabel = '';
    switch (fileType) {
        case 'pdf': typeLabel = '[PDF]'; break;
        case 'txt': typeLabel = '[TXT]'; break;
        case 'zip': typeLabel = '[ZIP]'; break;
        default: typeLabel = '[?]';
    }
    fileItem.innerHTML = `
        <span>${typeLabel} ${file.name}</span>
        <span>${formatFileSize(file.size)}</span>
    `;
    fileList.appendChild(fileItem);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function convertNewFiles(newFiles) {
    if (newFiles.length === 0) {
        showStatus('No files to convert', 'error');
        return;
    }
    
    let completed = 0;
    const total = newFiles.length;
    
    for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileType = getFileType(file);
        
        if (!fileType) {
            console.error('Unsupported file type:', file.type);
            continue;
        }
        
        try {
            let text = '';
            if (fileType === 'pdf') {
                text = await convertSinglePDF(file);
            } else if (fileType === 'txt') {
                text = await convertSingleTXT(file);
            } else if (fileType === 'zip') {
                text = await convertZipFile(file);
            }
            
            // Add separator between documents (except for the first one ever)
            if (convertedText.length > 0) {
                convertedText += '\n\n----------------------------------------\n\n';
            }
            
            convertedText += text;
            
            completed++;
            updateProgress(completed, total);
        } catch (error) {
            console.error(`Error converting ${fileType.toUpperCase()}:`, error);
            showStatus(`Error converting ${file.name}. Please try another file.`, 'error');
        }
    }
    
    outputText.value = convertedText;
    copyBtn.disabled = false;
    saveBtn.disabled = false;
    showStatus(`Successfully converted ${completed} of ${total} new files!`, 'success');
}

async function convertSinglePDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                const text = await convertPDFArrayBuffer(typedArray, file.name);
                resolve(text);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error reading PDF file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Helper to convert PDF from ArrayBuffer
async function convertPDFArrayBuffer(arrayBuffer, filename) {
    const typedArray = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument(typedArray);
    const pdf = await loadingTask.promise;
    
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        const pageText = text.items.map(item => item.str).join(' ');
        textContent += pageText + '\n\n';
    }
    
    return textContent.trim();
}

async function convertSingleTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function() {
            try {
                resolve(this.result.trim());
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error reading TXT file'));
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

// New function to handle ZIP files
async function convertZipFile(zipFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const arrayBuffer = this.result;
                const zip = await JSZip.loadAsync(arrayBuffer);
                const entries = Object.values(zip.files);
                
                let combinedText = '';
                let processedCount = 0;
                
                // Define supported text-based extensions (case-insensitive)
                const textExtensions = ['.txt', '.html', '.htm', '.css', '.js', '.json', '.xml', '.md'];
                const isTextFile = (name) => textExtensions.some(ext => name.toLowerCase().endsWith(ext));
                const isPdfFile = (name) => name.toLowerCase().endsWith('.pdf');
                
                const supportedEntries = entries.filter(entry => 
                    !entry.dir && (isTextFile(entry.name) || isPdfFile(entry.name))
                );
                const totalSupported = supportedEntries.length;
                
                for (const entry of entries) {
                    if (entry.dir) continue; // skip folders
                    
                    const name = entry.name;
                    if (isTextFile(name)) {
                        // Extract text file
                        const content = await entry.async('string');
                        const text = content.trim();
                        if (text) {
                            if (combinedText.length > 0) combinedText += '\n\n--- ' + name + ' ---\n\n';
                            combinedText += text;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        }
                    } else if (isPdfFile(name)) {
                        // Extract PDF and convert
                        const pdfData = await entry.async('arraybuffer');
                        try {
                            const pdfText = await convertPDFArrayBuffer(pdfData, name);
                            if (pdfText) {
                                if (combinedText.length > 0) combinedText += '\n\n--- ' + name + ' ---\n\n';
                                combinedText += pdfText;
                                processedCount++;
                                showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                            }
                        } catch (pdfErr) {
                            console.error(`Error converting PDF inside ZIP: ${name}`, pdfErr);
                            if (combinedText.length > 0) combinedText += '\n\n--- ' + name + ' (ERROR) ---\n\n';
                            combinedText += `[Error converting PDF: ${pdfErr.message}]`;
                            processedCount++;
                        }
                    }
                }
                
                if (combinedText.trim() === '') {
                    resolve('[No supported files found inside ZIP (supported: .txt, .pdf, .html, .css, .js, .json, .xml, .md)]');
                } else {
                    resolve(combinedText);
                }
            } catch (error) {
                reject(new Error('Failed to read ZIP file: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error reading ZIP file'));
        };
        
        reader.readAsArrayBuffer(zipFile);
    });
}

function updateProgress(completed, total) {
    const progress = Math.round((completed / total) * 100);
    showStatus(`Converting files: ${completed}/${total} (${progress}%)`, 'info');
}

function copyText() {
    outputText.select();
    document.execCommand('copy');
    showStatus('Text copied to clipboard!', 'success');
}

function saveText() {
    const text = outputText.value;
    if (!text) {
        showStatus('No text to save', 'error');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Text file saved successfully!', 'success');
}

function clearAll() {
    uploadedFiles = [];
    convertedText = '';
    outputText.value = '';
    fileList.innerHTML = '<div class="file-item">No files uploaded yet</div>';
    fileInfo.textContent = 'No files selected';
    copyBtn.disabled = true;
    saveBtn.disabled = true;
    showStatus('All data cleared', 'info');
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}
