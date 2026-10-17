
"use strict";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const elements = {
    compressMode: document.getElementById("compressMode"),
    decompressMode: document.getElementById("decompressMode"),
    dropZone: document.getElementById("dropZone"),
    fileInput: document.getElementById("fileInput"),
    uploadHeading: document.getElementById("uploadHeading"),
    uploadDescription: document.getElementById("uploadDescription"),
    selectedFile: document.getElementById("selectedFile"),
    fileIcon: document.getElementById("fileIcon"),
    fileName: document.getElementById("fileName"),
    fileDetails: document.getElementById("fileDetails"),
    removeFile: document.getElementById("removeFile"),
    processButton: document.getElementById("processButton"),
    processButtonText: document.getElementById("processButtonText"),
    errorBanner: document.getElementById("errorBanner"),
    errorMessage: document.getElementById("errorMessage"),
    progressPanel: document.getElementById("progressPanel"),
    progressTitle: document.getElementById("progressTitle"),
    progressDescription: document.getElementById("progressDescription"),
    resultsSection: document.getElementById("resultsSection"),
    originalSize: document.getElementById("originalSize"),
    outputSize: document.getElementById("outputSize"),
    savingLabel: document.getElementById("savingLabel"),
    savingValue: document.getElementById("savingValue"),
    savingFoot: document.getElementById("savingFoot"),
    comparisonCard: document.getElementById("comparisonCard"),
    comparisonCaption: document.getElementById("comparisonCaption"),
    originalBar: document.getElementById("originalBar"),
    outputBar: document.getElementById("outputBar"),
    originalBarLabel: document.getElementById("originalBarLabel"),
    outputBarLabel: document.getElementById("outputBarLabel"),
    comparisonNote: document.getElementById("comparisonNote"),
    outputFileName: document.getElementById("outputFileName"),
    downloadDescription: document.getElementById("downloadDescription"),
    downloadButton: document.getElementById("downloadButton"),
    resetButton: document.getElementById("resetButton")
};

let mode = "compress";
let selectedFile = null;
let outputBlob = null;
let outputName = "";
let isProcessing = false;
let downloadUrl = null;

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatPercent(value) {
    return `${value.toFixed(2)}%`;
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorBanner.classList.remove("hidden");
}

function clearError() {
    elements.errorBanner.classList.add("hidden");
    elements.errorMessage.textContent = "";
}

function clearPreviousOutput() {
    outputBlob = null;
    outputName = "";
    elements.resultsSection.classList.add("hidden");

    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        downloadUrl = null;
    }
}

function setMode(newMode) {
    if (isProcessing) return;

    mode = newMode;

    const compressing = mode === "compress";

    elements.compressMode.classList.toggle("selected", compressing);
    elements.decompressMode.classList.toggle("selected", !compressing);

    elements.compressMode.setAttribute(
        "aria-pressed", String(compressing)
    );
    elements.decompressMode.setAttribute(
        "aria-pressed", String(!compressing)
    );

    elements.uploadHeading.textContent = compressing
        ? "Select a file to compress"
        : "Select a .huff file to decompress";

    elements.uploadDescription.textContent = compressing
        ? "Your original file will not be modified."
        : "Choose a file previously created by HuffLab.";

    elements.processButtonText.textContent = compressing
        ? "Compress file"
        : "Decompress file";

    elements.fileInput.accept = compressing ? "" : ".huff";

    elements.dropZone.setAttribute(
        "aria-label",
        compressing ? "Choose a file to compress"
            : "Choose a Huffman compressed file"
    );

    clearError();
    clearPreviousOutput();

    // Keep a selected file only if it matches the new mode.
    if (selectedFile &&
        (!compressing &&
            !selectedFile.name.toLowerCase().endsWith(".huff"))) {
        clearSelectedFile();
    } else {
        updateSelectedFileUI();
    }
}

function clearSelectedFile() {
    selectedFile = null;
    elements.fileInput.value = "";
    elements.selectedFile.classList.add("hidden");
    elements.dropZone.classList.remove("hidden");
    elements.processButton.disabled = true;
    clearPreviousOutput();
}

function updateSelectedFileUI() {
    if (!selectedFile) {
        elements.selectedFile.classList.add("hidden");
        elements.dropZone.classList.remove("hidden");
        elements.processButton.disabled = true;
        return;
    }

    elements.fileName.textContent = selectedFile.name;
    elements.fileDetails.textContent = formatBytes(selectedFile.size);
    elements.fileIcon.textContent = getFileExtension(selectedFile.name);

    elements.selectedFile.classList.remove("hidden");
    elements.dropZone.classList.add("hidden");
    elements.processButton.disabled = isProcessing;
}

function getFileExtension(name) {
    const parts = name.split(".");
    const extension = parts.length > 1 ? parts.pop() : "FILE";

    return extension.slice(0, 5).toUpperCase() || "FILE";
}

function selectFile(file) {
    if (isProcessing) return;

    clearError();
    clearPreviousOutput();

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        showError("This file exceeds the 50 MB request limit.");
        return;
    }

    if (mode === "decompress" &&
        !file.name.toLowerCase().endsWith(".huff")) {
        showError("Please select a file with the .huff extension.");
        return;
    }

    selectedFile = file;
    updateSelectedFileUI();
}

function setProcessing(processing) {
    isProcessing = processing;

    elements.compressMode.disabled = processing;
    elements.decompressMode.disabled = processing;
    elements.removeFile.disabled = processing;
    elements.processButton.disabled = processing || !selectedFile;

    elements.progressPanel.classList.toggle("hidden", !processing);

    elements.processButtonText.textContent = processing
        ? "Processing..."
        : mode === "compress" ? "Compress file" : "Decompress file";
}

function getOutputName(file) {
    if (mode === "compress") {
        return `${file.name}.huff`;
    }

    const name = file.name.replace(/\.huff$/i, "");

    return name && name !== file.name
        ? name
        : `restored-${file.name}`;
}

async function processFile() {
    if (!selectedFile || isProcessing) return;

    clearError();
    clearPreviousOutput();
    setProcessing(true);

    const currentFile = selectedFile;
    const currentMode = mode;

    elements.progressTitle.textContent = currentMode === "compress"
        ? "Compressing your file..."
        : "Restoring your file...";

    elements.progressDescription.textContent =
        "Your file is being processed by the local Java engine.";

    try {
        const endpoint = currentMode === "compress"
            ? `/api/compress?name=${encodeURIComponent(currentFile.name)}`
            : "/api/decompress";
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream"
            },
            body: currentFile
        });

        if (!response.ok) {
            let message = `The server returned HTTP ${response.status}.`;

            try {
                const body = await response.text();

                if (body) {
                    message = body;
                }
            } catch (_) {
                // Keep the HTTP status message.
            }

            throw new Error(message);
        }

        const blob = await response.blob();

        if (currentMode === "decompress" &&
            blob.size === 0 && currentFile.size > 0) {
            // Empty original files are valid, so check the request's
            // success status rather than assuming an empty output is bad.
        }

        outputBlob = blob;
        const encodedFilename = response.headers.get("X-Output-Filename");

        outputName = encodedFilename
            ? decodeURIComponent(encodedFilename)
            : getOutputName(currentFile);

        displayResults(currentFile.size, blob.size, currentMode);

        elements.resultsSection.classList.remove("hidden");
        elements.resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {
        console.error("HuffLab processing error:", error);

        showError(
            error.message || "The operation failed. Check the browser console."
        );
    } finally {
        setProcessing(false);
    }

}

function displayResults(inputSize, resultSize, currentMode) {
    const compressing = currentMode === "compress";

    elements.originalSize.textContent = formatBytes(inputSize);
    elements.outputSize.textContent = formatBytes(resultSize);

    if (compressing) {
        const savedPercent = inputSize === 0
            ? 0
            : ((inputSize - resultSize) / inputSize) * 100;

        const ratio = inputSize === 0
            ? 0
            : (resultSize / inputSize) * 100;

        elements.savingLabel.textContent = "SPACE SAVED";
        elements.savingValue.textContent = formatPercent(savedPercent);

        elements.savingFoot.textContent = savedPercent >= 0
            ? "Compared with original"
            : "Output is larger than original";

        elements.comparisonCaption.textContent =
            "Original vs. compressed";

        elements.comparisonNote.textContent = savedPercent > 0
            ? `Your file is ${formatPercent(savedPercent)} smaller.`
            : savedPercent < 0
                ? `The compressed file is ${formatPercent(Math.abs(savedPercent))} larger. This can happen with already-compressed files.`
                : "The output size is equal to the original size.";

        elements.downloadDescription.textContent =
            `Compressed output · ${formatBytes(resultSize)}`;

    } else {
        const expansion = inputSize === 0
            ? 0
            : (resultSize / inputSize) * 100;

        elements.savingLabel.textContent = "RESTORED SIZE";
        elements.savingValue.textContent = formatBytes(resultSize);
        elements.savingFoot.textContent = "Original file recovered";

        elements.comparisonCaption.textContent =
            "Compressed input vs. restored output";

        elements.comparisonNote.textContent =
            `Restoration complete. The output is ${formatPercent(expansion)} of the compressed input size.`;

        elements.downloadDescription.textContent =
            `Restored output · ${formatBytes(resultSize)}`;
    }

    const maximum = Math.max(inputSize, resultSize, 1);

    elements.originalBar.style.width =
        `${(inputSize / maximum) * 100}%`;

    elements.outputBar.style.width =
        `${(resultSize / maximum) * 100}%`;

    elements.originalBarLabel.textContent = formatBytes(inputSize);
    elements.outputBarLabel.textContent = formatBytes(resultSize);

    elements.outputFileName.textContent = outputName;


    const barLabels = elements.comparisonCard.querySelectorAll(".bar-row > span");

    if (barLabels.length >= 2) {
        barLabels[0].textContent = compressing ? "Original" : "Compressed";
        barLabels[1].textContent = compressing ? "Output" : "Restored";
    }

}

function downloadOutput() {
    if (!outputBlob) return;

    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
    }

    downloadUrl = URL.createObjectURL(outputBlob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = outputName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Keep the object URL available briefly for the browser's download.
    const urlToRevoke = downloadUrl;
    setTimeout(() => {
        URL.revokeObjectURL(urlToRevoke);

        if (downloadUrl === urlToRevoke) {
            downloadUrl = null;
        }
    }, 60000);
}

function resetApplication() {
    if (isProcessing) return;

    clearSelectedFile();
    clearError();
    clearPreviousOutput();

    elements.progressPanel.classList.add("hidden");
    elements.fileInput.value = "";

    elements.dropZone.focus();
}

elements.compressMode.addEventListener(
    "click", () => setMode("compress")
);

elements.decompressMode.addEventListener(
    "click", () => setMode("decompress")
);

elements.dropZone.addEventListener("click", () => {
    if (!isProcessing) elements.fileInput.click();
});

elements.dropZone.addEventListener("keydown", event => {
    if (isProcessing) return;

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        elements.fileInput.click();
    }
});

elements.fileInput.addEventListener("change", event => {
    selectFile(event.target.files[0]);
});

elements.removeFile.addEventListener("click", () => {
    clearSelectedFile();
    clearError();
});

elements.processButton.addEventListener("click", processFile);
elements.downloadButton.addEventListener("click", downloadOutput);
elements.resetButton.addEventListener("click", resetApplication);

elements.dropZone.addEventListener("dragover", event => {
    event.preventDefault();

    if (!isProcessing) {
        elements.dropZone.classList.add("drag-over");
    }
});

elements.dropZone.addEventListener("dragleave", event => {
    if (!elements.dropZone.contains(event.relatedTarget)) {
        elements.dropZone.classList.remove("drag-over");
    }
});

elements.dropZone.addEventListener("drop", event => {
    event.preventDefault();
    elements.dropZone.classList.remove("drag-over");

    if (!isProcessing && event.dataTransfer.files.length > 0) {
        selectFile(event.dataTransfer.files[0]);
    }
});

// Prevent the browser from navigating to a dropped file.
document.addEventListener("dragover", event => event.preventDefault());

document.addEventListener("drop", event => {
    if (!elements.dropZone.contains(event.target)) {
        event.preventDefault();
    }
});

// Initial interface state.
setMode("compress");

// Huffman Tree Visualizer (client-side, offline). Uses the selected file's bytes.
const treeUI = {
    button: document.getElementById('visualizeTreeButton'),
    summary: document.getElementById('treeSummary'),
    stats: document.getElementById('treeStats'),
    error: document.getElementById('treeError'),
    panel: document.getElementById('treeVisualization'),
    svg: document.getElementById('treeSvgContainer'),
    prev: document.getElementById('treePrevButton'),
    next: document.getElementById('treeNextButton'),
    final: document.getElementById('treeShowFinalButton'),
    step: document.getElementById('treeStepLabel'),
    explanation: document.getElementById('treeExplanation')
};
let treeModel = null;
let treeStep = 0;
let treeObjectUrl = null;

function treeEscape(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function treeSymbol(byte) {
    if (byte === 10) return '\\n';
    if (byte === 13) return '\\r';
    if (byte === 9) return '\\t';
    if (byte === 32) return '␠';
    if (byte >= 33 && byte <= 126) return String.fromCharCode(byte);
    return '0x' + byte.toString(16).padStart(2, '0').toUpperCase();
}
function buildTreeModel(bytes) {
    const frequencies = new Array(256).fill(0);
    for (const b of bytes) frequencies[b]++;
    let nextId = 0;
    const queue = [];
    for (let symbol = 0; symbol < 256; symbol++) {
        if (frequencies[symbol]) queue.push({id:nextId++, symbol, frequency:frequencies[symbol], minSymbol:symbol, left:null, right:null});
    }
    queue.sort((a,b) => a.frequency-b.frequency || a.minSymbol-b.minSymbol);
    const merges = [];
    while (queue.length > 1) {
        const left = queue.shift();
        const right = queue.shift();
        const parent = {id:nextId++, symbol:null, frequency:left.frequency+right.frequency,
            minSymbol:Math.min(left.minSymbol,right.minSymbol), left, right};
        merges.push({left, right, parent});
        queue.push(parent);
        queue.sort((a,b) => a.frequency-b.frequency || a.minSymbol-b.minSymbol);
    }
    const root = queue[0] || null;
    const codes = [];
    function walk(node, prefix) {
        if (!node) return;
        if (!node.left && !node.right) { codes.push({symbol:node.symbol, frequency:node.frequency, code:prefix || '0'}); return; }
        walk(node.left, prefix+'0'); walk(node.right, prefix+'1');
    }
    walk(root, '');
    codes.sort((a,b) => a.symbol-b.symbol);
    return {bytesLength:bytes.length, frequencies, root, merges, codes, distinct:codes.length,
        encodedBits:codes.reduce((sum,item)=>sum+item.frequency*item.code.length,0)};
}
function visibleTreeNodes(model, step) {
    const visible = new Set();
    if (!model.root) return visible;
    if (model.merges.length === 0) { visible.add(model.root.id); return visible; }
    const active = [];
    for (let i=0;i<step;i++) active.push(model.merges[i].parent);
    const mergedIds = new Set(active.map(n=>n.id));
    // The active forest consists of all leaves and already-created parents, except children absorbed by a merge.
    const absorbed = new Set();
    for (let i=0;i<step;i++) { absorbed.add(model.merges[i].left.id); absorbed.add(model.merges[i].right.id); }
    const forest = [];
    for (let s=0;s<256;s++) if (model.frequencies[s]) {
        const leaf = findNode(model.root, n=>n.symbol===s);
        if (leaf && !absorbed.has(leaf.id)) forest.push(leaf);
    }
    for (const p of active) if (!absorbed.has(p.id)) forest.push(p);
    function addSubtree(node) { visible.add(node.id); if(node.left) addSubtree(node.left); if(node.right) addSubtree(node.right); }
    forest.forEach(addSubtree);
    return visible;
}
function findNode(root, predicate) {
    if (!root) return null;
    if (predicate(root)) return root;
    return findNode(root.left,predicate) || findNode(root.right,predicate);
}
function renderTree() {
    const m = treeModel;
    if (!m || !m.root) {
        treeUI.svg.innerHTML = '<p>This file is empty, so there are no symbols to build into a tree.</p>';
        treeUI.step.textContent = 'No tree'; treeUI.explanation.textContent = 'Empty files have no Huffman tree.';
        return;
    }
    const final = treeStep >= m.merges.length;
    // For intermediate steps, show the full tree with not-yet-merged branches muted; final step shows all nodes.
    const width = Math.max(760, m.distinct * 100);
    const levels = [];
    function collect(node, depth, x0, x1) {
        if (!node) return;
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push({node, x:(x0+x1)/2, y:48+depth*105});
        if (node.left) collect(node.left,depth+1,x0,(x0+x1)/2);
        if (node.right) collect(node.right,depth+1,(x0+x1)/2,x1);
    }
    collect(m.root,0,20,width-20);
    const height = 80 + levels.length*105;
    const mergeIndex = Math.max(0, treeStep-1);
    const highlighted = new Set();
    if (!final && m.merges[mergeIndex]) {
        highlighted.add(m.merges[mergeIndex].left.id); highlighted.add(m.merges[mergeIndex].right.id); highlighted.add(m.merges[mergeIndex].parent.id);
    }
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Huffman binary tree">`;
    for (const row of levels) for (const item of row) {
        const n=item.node;
        for (const child of [n.left,n.right]) if(child) {
            const target=levels.flat().find(v=>v.node.id===child.id);
            if(target) svg += `<line x1="${item.x}" y1="${item.y+22}" x2="${target.x}" y2="${target.y-22}" stroke="#50617c" stroke-width="2"/>`;
            if(target) svg += `<text x="${(item.x+target.x)/2}" y="${(item.y+target.y)/2}" fill="#9db5ff" font-size="13" text-anchor="middle">${child===n.left?'0':'1'}</text>`;
        }
    }
    for (const row of levels) for (const item of row) {
        const n=item.node, leaf=!n.left&&!n.right, active=final||highlighted.has(n.id);
        const fill=leaf?'#193b50':(active?'#3b3479':'#17243a');
        const stroke=active?'#55d6b0':'#34445e';
        const label=leaf?treeSymbol(n.symbol):'Σ';
        svg += `<g><rect x="${item.x-34}" y="${item.y-22}" width="68" height="44" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`+
            `<text x="${item.x}" y="${item.y-2}" fill="#f4f7ff" font-size="14" font-weight="700" text-anchor="middle">${treeEscape(label)}</text>`+
            `<text x="${item.x}" y="${item.y+14}" fill="#b7c5dc" font-size="11" text-anchor="middle">${n.frequency}</text></g>`;
    }
    svg += '</svg>';
    treeUI.svg.innerHTML=svg;
    treeUI.step.textContent = `Merge ${treeStep} of ${m.merges.length}`;
    if (treeStep===0) treeUI.explanation.textContent = 'Start with one leaf per byte value. Each leaf is weighted by its frequency.';
    else if (!final) { const a=m.merges[treeStep-1]; treeUI.explanation.textContent=`Step ${treeStep}: combine the two lowest-frequency available nodes (${a.left.frequency} + ${a.right.frequency}) to create a parent of frequency ${a.parent.frequency}. The highlighted nodes show this merge.`; }
    else treeUI.explanation.textContent='Final Huffman tree. Left edges represent 0 and right edges represent 1. The table below lists each byte’s code.';
    treeUI.prev.disabled=treeStep===0; treeUI.next.disabled=treeStep>=m.merges.length; treeUI.final.disabled=treeStep>=m.merges.length;
}
function renderTreeStats() {
    const m=treeModel;
    treeUI.stats.innerHTML='';
    const items=[['INPUT BYTES',formatBytes(m.bytesLength)],['DISTINCT BYTES',String(m.distinct)],['MERGE STEPS',String(m.merges.length)],['HUFFMAN DATA BITS',m.encodedBits.toLocaleString()+' bits']];
    for(const [label,value] of items){const card=document.createElement('article');card.className='stat-card';const l=document.createElement('div');l.className='stat-label';l.textContent=label;const v=document.createElement('div');v.className='stat-value';v.textContent=value;card.append(l,v);treeUI.stats.append(card);}
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;margin-top:16px;color:var(--text,#eef3ff);font-size:.9rem';
    table.innerHTML='<thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #34445e">Byte / symbol</th><th style="text-align:right;padding:8px;border-bottom:1px solid #34445e">Frequency</th><th style="text-align:left;padding:8px;border-bottom:1px solid #34445e">Huffman code</th></tr></thead>';
    const tbody=document.createElement('tbody');
    for(const item of m.codes){const tr=document.createElement('tr');for(const val of [treeSymbol(item.symbol),item.frequency.toLocaleString(),item.code]){const td=document.createElement('td');td.textContent=val;td.style.cssText='padding:7px 8px;border-bottom:1px solid #263247;'+(typeof val==='number'||val===item.frequency.toLocaleString()?'text-align:right;':'');tr.appendChild(td);}tbody.appendChild(tr);}
    table.appendChild(tbody);treeUI.stats.appendChild(table);treeUI.stats.classList.remove('hidden');
}
async function makeHuffmanTree() {
    treeUI.error.classList.add('hidden');
    if(mode!=='compress'||!selectedFile){treeUI.summary.textContent='Select a file in Compress mode to begin.';return;}
    try {
        treeUI.button.disabled=true; treeUI.summary.textContent='Analyzing byte frequencies…';
        const bytes=new Uint8Array(await selectedFile.arrayBuffer());
        treeModel=buildTreeModel(bytes); treeStep=0;
        renderTreeStats(); treeUI.panel.classList.remove('hidden'); renderTree();
        treeUI.summary.textContent=`Tree built for ${selectedFile.name}`;
    } catch(error) {
        treeUI.error.textContent=error.message||'Could not build the Huffman tree.';
        treeUI.error.classList.remove('hidden');
    } finally { treeUI.button.disabled=!(mode==='compress'&&!!selectedFile); }
}
if (treeUI.button) {
    treeUI.button.addEventListener('click',makeHuffmanTree);
    treeUI.prev.addEventListener('click',()=>{treeStep=Math.max(0,treeStep-1);renderTree();});
    treeUI.next.addEventListener('click',()=>{treeStep=Math.min(treeModel.merges.length,treeStep+1);renderTree();});
    treeUI.final.addEventListener('click',()=>{treeStep=treeModel.merges.length;renderTree();});
}
const originalSelectFile = selectFile;
selectFile = function(file) {
    originalSelectFile(file);
    if (treeUI.button) {
        treeUI.button.disabled=!(mode==='compress'&&!!selectedFile);
        treeUI.summary.textContent=selectedFile&&mode==='compress'?'Ready to analyze '+selectedFile.name:'Select a file in Compress mode to begin.';
        treeUI.panel.classList.add('hidden'); treeUI.stats.classList.add('hidden'); treeModel=null;
    }
};
const originalSetMode = setMode;
setMode = function(newMode) {
    originalSetMode(newMode);
    if (treeUI.button) {
        treeUI.button.disabled=!(mode==='compress'&&!!selectedFile);
        treeUI.summary.textContent=selectedFile&&mode==='compress'?'Ready to analyze '+selectedFile.name:'Select a file in Compress mode to begin.';
        if(mode!=='compress'){treeUI.panel.classList.add('hidden');treeUI.stats.classList.add('hidden');}
    }
};
