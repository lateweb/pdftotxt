// script.js
// Requires: PDF.js, JSZip, SheetJS (XLSX), and Font Awesome (icons) loaded via CDN in HTML

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js  ';

// Comprehensive list of text-based file extensions (Notepad‑compatible)
const TEXT_EXTENSIONS = [
    // General text
    'txt', 'log',
    // Web
    'html', 'htm', 'css', 'scss', 'less', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'svg',
    // Markdown / documentation
    'md', 'markdown',
    // C / C++
    'c', 'h', 'cpp', 'hpp', 'cxx', 'cc', 'c++',
    // C#
    'cs', 'csx',
    // Java / Kotlin
    'java', 'kt', 'kts',
    // Python
    'py', 'pyw',
    // R
    'r', 'R', 'rmd', 'Rmd',
    // Go
    'go',
    // Rust
    'rs',
    // Swift
    'swift',
    // Dart
    'dart',
    // Ruby
    'rb',
    // PHP
    'php',
    // Perl
    'pl', 'pm',
    // Lua
    'lua',
    // Shell scripts
    'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
    // Config / data
    'ini', 'cfg', 'conf', 'yaml', 'yml', 'toml', 'env', 'gitignore', 'dockerfile', 'makefile',
    // TeX
    'tex', 'bib',
    // SQL
    'sql',
    // Other
    'vim', 'vimrc', 'editorconfig', 'htaccess'
];

// Build accept string dynamically for the file input
const ACCEPT_STRING = [
    '.pdf',
    '.txt',
    '.zip',
    '.xlsx',
    '.csv',
    // MIME types for known formats
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    // All text extensions prefixed with dot
    ...TEXT_EXTENSIONS.map(ext => '.' + ext)
].join(',');

// DOM Elements
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropArea = document.getElementById('dropArea');
const fileInfo = document.getElementById('fileInfo');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const outputText = document.getElementById('outputText');
const statusSpan = document.getElementById('status');   // now an inline span
const fileList = document.getElementById('fileList');
const clearBtn = document.getElementById('clearBtn');

fileInput.accept = ACCEPT_STRING;

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

function isSheetJSAvailable() {
    return typeof XLSX !== 'undefined';
}

function isSupportedFile(file) {
    const type = file.type;
    // Known binary/structured types
    if (type === 'application/pdf' ||
        type === 'application/zip' ||
        type === 'application/x-zip-compressed' ||
        type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        type === 'text/plain' ||
        type === 'text/csv') {
        return true;
    }
    const name = file.name.toLowerCase();
    // PDF, ZIP, XLSX, CSV
    if (name.endsWith('.pdf') || name.endsWith('.zip') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
        return true;
    }
    // Any text extension from our comprehensive list
    return TEXT_EXTENSIONS.some(ext => name.endsWith('.' + ext));
}

function getFileType(file) {
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || name.endsWith('.zip')) return 'zip';
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || name.endsWith('.xlsx')) return 'xlsx';
    if (file.type === 'text/csv' || name.endsWith('.csv')) return 'csv';
    // For any file with a text extension (or .txt), treat as plain text
    if (file.type === 'text/plain' || name.endsWith('.txt') || TEXT_EXTENSIONS.some(ext => name.endsWith('.' + ext))) {
        return 'txt';
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
        showStatus('Please select valid files (PDF, TXT, ZIP, XLSX, CSV, or text-based source files)', 'error');
    }
}

function addFileToList(file) {
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
        case 'xlsx': typeLabel = '[XLSX]'; break;
        case 'csv': typeLabel = '[CSV]'; break;
        default: typeLabel = '[TXT]'; // fallback for any text type
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
            } else if (fileType === 'xlsx') {
                text = await convertSingleXLSX(file);
            } else if (fileType === 'csv') {
                text = await convertSingleCSV(file);
            }
            
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
            reject(new Error('Error reading file as text'));
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

async function convertSingleXLSX(file) {
    if (!isSheetJSAvailable()) {
        return `--- ${file.name} ---\n[Error: SheetJS library not loaded. Please include xlsx.full.min.js in your HTML.]`;
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
            try {
                const data = new Uint8Array(this.result);
                const text = convertSpreadsheetFromArrayBuffer(data, file.name, 'xlsx');
                resolve(text);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error reading XLSX file'));
        reader.readAsArrayBuffer(file);
    });
}

async function convertSingleCSV(file) {
    if (!isSheetJSAvailable()) {
        return `--- ${file.name} ---\n[Error: SheetJS library not loaded. Please include xlsx.full.min.js in your HTML.]`;
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
            try {
                const text = convertSpreadsheetFromString(this.result, file.name, 'csv');
                resolve(text);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error reading CSV file'));
        reader.readAsText(file, 'UTF-8');
    });
}

function convertSpreadsheetFromArrayBuffer(buffer, filename, type) {
    if (!isSheetJSAvailable()) {
        return `--- ${filename} ---\n[Error: SheetJS library not loaded. Please include xlsx.full.min.js in your HTML.]`;
    }
    try {
        const workbook = XLSX.read(buffer, {type: 'array'});
        return formatWorkbookAsText(workbook, filename);
    } catch (err) {
        return `--- ${filename} ---\n[Error reading spreadsheet: ${err.message}]`;
    }
}

function convertSpreadsheetFromString(str, filename, type) {
    if (!isSheetJSAvailable()) {
        return `--- ${filename} ---\n[Error: SheetJS library not loaded. Please include xlsx.full.min.js in your HTML.]`;
    }
    try {
        const workbook = XLSX.read(str, {type: 'string'});
        return formatWorkbookAsText(workbook, filename);
    } catch (err) {
        return `--- ${filename} ---\n[Error reading spreadsheet: ${err.message}]`;
    }
}

function formatWorkbookAsText(workbook, filename) {
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
        return `--- ${filename} ---\n[No sheets found]`;
    }
    
    let result = `--- ${filename} ---\n`;
    for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const sheet = workbook.Sheets[sheetName];
        const tsv = XLSX.utils.sheet_to_csv(sheet, {FS: '\t', RS: '\n'});
        result += `Sheet: ${sheetName}\n`;
        if (tsv.trim() === '') {
            result += '(empty)\n';
        } else {
            result += tsv + '\n';
        }
        if (i < sheetNames.length - 1) result += '\n';
    }
    return result.trimEnd();
}

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
                
                // Use the same comprehensive list inside ZIP
                const textExtensions = TEXT_EXTENSIONS;
                const spreadsheetExtensions = ['.xlsx'];
                const pdfExtension = '.pdf';
                // CSV is handled separately (via SheetJS) but we can still include it in text check;
                // we'll handle .csv with SheetJS below, but to avoid double processing we'll treat it as spreadsheet-like.
                const csvExtension = '.csv';
                
                const isTextFile = (name) => textExtensions.some(ext => name.toLowerCase().endsWith('.' + ext));
                const isSpreadsheetFile = (name) => spreadsheetExtensions.some(ext => name.toLowerCase().endsWith(ext));
                const isPdfFile = (name) => name.toLowerCase().endsWith(pdfExtension);
                const isCsvFile = (name) => name.toLowerCase().endsWith(csvExtension);
                
                // Filter supported entries: any text file, spreadsheet, pdf, or csv
                const supportedEntries = entries.filter(entry => 
                    !entry.dir && (isTextFile(entry.name) || isSpreadsheetFile(entry.name) || isPdfFile(entry.name) || isCsvFile(entry.name))
                );
                const totalSupported = supportedEntries.length;
                
                for (const entry of entries) {
                    if (entry.dir) continue;
                    
                    const name = entry.name;
                    if (isCsvFile(name)) {
                        // CSV via SheetJS if available, otherwise plain text
                        const csvStr = await entry.async('string');
                        if (!isSheetJSAvailable()) {
                            if (combinedText.length > 0) combinedText += '\n\n';
                            combinedText += `--- ${name} ---\n${csvStr.trim()}`;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        } else {
                            const text = convertSpreadsheetFromString(csvStr, name, 'csv');
                            if (combinedText.length > 0) combinedText += '\n\n';
                            combinedText += text;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        }
                    } else if (isTextFile(name)) {
                        const content = await entry.async('string');
                        const text = content.trim();
                        if (text) {
                            if (combinedText.length > 0) combinedText += '\n\n--- ' + name + ' ---\n\n';
                            combinedText += text;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        }
                    } else if (isSpreadsheetFile(name)) {
                        const data = await entry.async('arraybuffer');
                        if (!isSheetJSAvailable()) {
                            if (combinedText.length > 0) combinedText += '\n\n';
                            combinedText += `--- ${name} ---\n[Error: SheetJS library not loaded. Please include xlsx.full.min.js in your HTML.]`;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        } else {
                            const text = convertSpreadsheetFromArrayBuffer(data, name, 'xlsx');
                            if (combinedText.length > 0) combinedText += '\n\n';
                            combinedText += text;
                            processedCount++;
                            showStatus(`Processing ZIP: ${name} (${processedCount}/${totalSupported})`, 'info');
                        }
                    } else if (isPdfFile(name)) {
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
                    resolve('[No supported files found inside ZIP (supported: .pdf, .xlsx, .csv, and hundreds of text-based formats)]');
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

/* Updated showStatus to use inline span */
function showStatus(message, type) {
    statusSpan.textContent = message;
    statusSpan.className = 'status-badge visible ' + type; // type may be success/error/info
    if (type === 'success') {
        setTimeout(() => {
            if (statusSpan.textContent === message) {
                statusSpan.textContent = '';
                statusSpan.className = 'status-badge';
            }
        }, 3000);
    }
}
