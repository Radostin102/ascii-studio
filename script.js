const root = document.documentElement;

// Elements
const imgUpload = document.getElementById('img-upload');
const traceImage = document.getElementById('trace-image');
const asciiLayer = document.getElementById('ascii-layer');
const container = document.getElementById('canvas-container');
const scrollShim = document.getElementById('scroll-shim');

const placeholder = document.getElementById('placeholder');
const charCounter = document.getElementById('char-counter');

function updateCharCount() {
    const count = asciiLayer.value.length;
    charCounter.textContent = `${count} chars`;
}

// Contexts
const analysisCanvas = document.getElementById('analysis-canvas');
const renderCanvas = document.getElementById('render-canvas');
const actx = analysisCanvas.getContext('2d', { willReadFrequently: true });
const rctx = renderCanvas.getContext('2d', { willReadFrequently: true });

// Presets
const presets = {
    standard: "@%#*+=-:. ",
    standard_extended: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    super_extended: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 `¬!\"£$%^&*()_+-=[];'#:@~,./<>?\\|¯…†‡‰™¥©§¦®°±µ¶»¼½¿¡─━│┃┄┅┆┇┈┉┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╌╍╎╏═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬╭╮╯╰╱╲╳▀ ▂▃▄▅▆▇█▉▊▋▌▍▎▏▖▗▘▙▚▛▜▝▞▟░▒▓",
    blocks: "█▓▒░ ",
    threshold: "█ ",
    binary: "01 "
};

// Inputs Map
const inputs = {
    opacity: document.getElementById('input-opacity'),
    zoom: document.getElementById('input-zoom'),

    font: document.getElementById('input-font'),
    size: document.getElementById('input-size'),
    line: document.getElementById('input-line'),
    spacing: document.getElementById('input-spacing'),
    color: document.getElementById('input-color'),
    bg: document.getElementById('input-bg'),

    bright: document.getElementById('in-bright'),
    contrast: document.getElementById('in-contrast'),
    blur: document.getElementById('in-blur'),

    preset: document.getElementById('char-preset'),
    customChars: document.getElementById('input-custom-chars'),
    dither: document.getElementById('dither-mode')
};

// --- UI Bindings ---
function bindDisplay(inputId, displayId, unit = '', cssVar = null) {
    const el = document.getElementById(inputId);
    const disp = document.getElementById(displayId);
    el.addEventListener('input', () => {
        disp.textContent = el.value + unit;
        if (cssVar) {
            const val = unit === 'x' ? el.value : el.value + unit;
            root.style.setProperty(cssVar, val);
        }
    });
}

bindDisplay('in-bright', 'val-bright', '%', '--f-brightness');
bindDisplay('in-contrast', 'val-contrast', '%', '--f-contrast');
bindDisplay('in-blur', 'val-blur', 'px', '--f-blur');
bindDisplay('input-size', 'val-size', 'px', '--font-size');
bindDisplay('input-line', 'val-line', '', '--line-height');
bindDisplay('input-spacing', 'val-spacing', 'px', '--char-spacing');
bindDisplay('input-opacity', 'val-opacity', '', '--img-opacity');
bindDisplay('input-zoom', 'val-zoom', 'x', '--zoom-level');

// --- 1. Zoom Logic (Fixed Positioning) ---
function updateZoomDimensions() {
    if (!traceImage.src) return;

    const zoom = parseFloat(inputs.zoom.value);
    const naturalW = traceImage.naturalWidth;
    const naturalH = traceImage.naturalHeight;

    scrollShim.style.width = (naturalW * zoom) + 'px';
    scrollShim.style.height = (naturalH * zoom + 30) + 'px';

    container.style.width = naturalW + 'px';
    container.style.height = naturalH + 'px';
}

inputs.zoom.addEventListener('input', updateZoomDimensions);
window.addEventListener('resize', updateZoomDimensions);

// --- 2. Image Loading ---
imgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        traceImage.src = ev.target.result;
        traceImage.onload = () => {
            // Show UI elements
            placeholder.style.display = 'none';
            container.style.display = 'block';
            asciiLayer.style.display = 'block';
            charCounter.style.display = 'block';

            updateZoomDimensions();
        }
    };
    reader.readAsDataURL(file);
});

// --- 3. Style Updates ---
inputs.font.addEventListener('input', (e) => {
    const family = e.target.value ? `"${e.target.value}", monospace` : 'monospace';
    root.style.setProperty('--font-family', family);
    inputPattern.style.fontFamily = family;
});
inputs.color.addEventListener('input', (e) => root.style.setProperty('--text-color', e.target.value));
inputs.bg.addEventListener('input', (e) => root.style.setProperty('--bg-color', e.target.value));

inputs.preset.addEventListener('change', (e) => {
    document.getElementById('custom-char-group').style.display = e.target.value === 'custom' ? 'block' : 'none';
});

inputs.customChars.addEventListener('input', (e) => {
    const val = e.target.value;
    const selectionStart = e.target.selectionStart;

    // Deduplicate while preserving order
    const unique = [...new Set(val)].join('');

    if (unique !== val) {
        e.target.value = unique;

        // Adjust cursor position: if we removed characters before the cursor, it should move back
        // But since we only ever remove duplicates, if the character just typed was a duplicate,
        // it disappears, and the cursor should stay where it was relative to the existing text.
        // A simple way is to find how many characters were removed BEFORE the selectionStart.
        let newPos = 0;
        const seen = new Set();
        for (let i = 0; i < selectionStart; i++) {
            if (!seen.has(val[i])) {
                seen.add(val[i]);
                newPos++;
            }
        }
        e.target.setSelectionRange(newPos, newPos);
    }
});

// --- 4. Character Analysis ---
function analyzeCharacters(charStr) {
    const style = window.getComputedStyle(asciiLayer);
    const font = style.font;
    const fontSize = parseFloat(style.fontSize);
    const size = Math.ceil(fontSize * 1.5);

    analysisCanvas.width = size;
    analysisCanvas.height = size;

    const results = [];
    const chars = Array.from(charStr);

    chars.forEach(char => {
        actx.fillStyle = inputs.bg.value;
        actx.fillRect(0, 0, size, size);
        actx.fillStyle = inputs.color.value;
        actx.font = font;
        actx.textAlign = 'center';
        actx.textBaseline = 'middle';
        actx.fillText(char, size / 2, size / 2);

        const data = actx.getImageData(0, 0, size, size).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
        }
        results.push({ char, density: total / (size * size) });
    });
    return results.sort((a, b) => a.density - b.density);
}

// --- 5. Dithering Helper ---
function addError(data, width, x, y, err, factor) {
    if (x < 0 || x >= width || y >= data.length / (4 * width)) return;
    const idx = (y * width + x) * 4;
    data[idx] += err * factor;
    data[idx + 1] += err * factor;
    data[idx + 2] += err * factor;
}

// --- 6. Magic Wand ---
function generateAscii() {
    const charSet = inputs.preset.value === 'custom' ? inputs.customChars.value : presets[inputs.preset.value];
    const sortedChars = analyzeCharacters(charSet || "@# ");

    // Native Dimensions
    const width = traceImage.naturalWidth;
    const height = traceImage.naturalHeight;

    renderCanvas.width = width;
    renderCanvas.height = height;

    const filters = `brightness(${document.getElementById('in-bright').value}%) contrast(${document.getElementById('in-contrast').value}%) blur(${document.getElementById('in-blur').value}px)`;
    rctx.filter = filters;
    rctx.drawImage(traceImage, 0, 0, width, height);

    const imageData = rctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const style = window.getComputedStyle(asciiLayer);
    actx.font = style.font;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize);
    const letterSpacing = parseFloat(inputs.spacing.value);

    const ditherType = inputs.dither.value;
    let result = "";

    for (let y = 0; y < height; y += lineHeight) {
        if (y + lineHeight > height) break;
        let currentX = 0;

        while (currentX < width) {
            const xInt = Math.floor(currentX);
            const yInt = Math.floor(y);
            const idx = (yInt * width + xInt) * 4;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            const targetIdx = (gray / 255) * (sortedChars.length - 1);
            const charObj = sortedChars[Math.max(0, Math.min(sortedChars.length - 1, Math.round(targetIdx)))];

            if (ditherType !== 'none') {
                const minD = sortedChars[0].density;
                const maxD = sortedChars[sortedChars.length - 1].density;
                const charVal = ((charObj.density - minD) / (maxD - minD || 1)) * 255;
                const quantError = gray - charVal;

                if (ditherType === 'floyd') {
                    addError(data, width, xInt + 1, yInt, quantError, 7 / 16);
                    addError(data, width, xInt - 1, yInt + lineHeight, quantError, 3 / 16);
                    addError(data, width, xInt, yInt + lineHeight, quantError, 5 / 16);
                    addError(data, width, xInt + 1, yInt + lineHeight, quantError, 1 / 16);
                } else if (ditherType === 'stucki') {
                    const d = 42;
                    addError(data, width, xInt + 1, yInt, quantError, 8 / d);
                    addError(data, width, xInt + 2, yInt, quantError, 4 / d);
                    addError(data, width, xInt - 2, yInt + lineHeight, quantError, 2 / d);
                    addError(data, width, xInt - 1, yInt + lineHeight, quantError, 4 / d);
                    addError(data, width, xInt, yInt + lineHeight, quantError, 8 / d);
                    addError(data, width, xInt + 1, yInt + lineHeight, quantError, 4 / d);
                    addError(data, width, xInt + 2, yInt + lineHeight, quantError, 2 / d);
                }
            }

            result += charObj.char;

            const charWidth = actx.measureText(charObj.char).width;
            const step = Math.max(1, charWidth + letterSpacing);
            currentX += step;
        }
        result += "\n";
    }
    asciiLayer.value = result;
    updateCharCount();
}

const modalOverlay = document.getElementById('modal-overlay');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalConfirm = document.getElementById('btn-modal-confirm');

btnModalCancel.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
});
const btnFill = document.getElementById('btn-fill');
const inputPattern = document.getElementById('input-pattern');
let pendingAction = null;

function fillPattern() {
    const pattern = inputPattern.value || "-#";
    const width = traceImage.naturalWidth || 800;
    const height = traceImage.naturalHeight || 600;

    renderCanvas.width = width;
    renderCanvas.height = height;

    const style = window.getComputedStyle(asciiLayer);
    actx.font = style.font;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize);

    let result = "";

    const patternWidth = actx.measureText(pattern).width;
    if (patternWidth === 0) return;

    let currentX = 0;
    let lineStr = "";
    let pIdx = 0;

    while (true) {
        const char = pattern[pIdx % pattern.length];
        const charW = actx.measureText(char).width;

        if (currentX + charW > width) {
            break;
        }

        lineStr += char;
        currentX += charW;
        pIdx++;
    }

    for (let y = 0; y < height; y += lineHeight) {
        if (y + lineHeight > height) break;
        result += lineStr + "\n";
    }

    asciiLayer.value = result;
    updateCharCount();
}

document.getElementById('btn-magic').addEventListener('click', () => {
    if (!traceImage.src) { alert("Upload an image first!"); return; }

    if (isoOverWriteNeeded()) {
        pendingAction = 'generate';
        modalOverlay.style.display = 'flex';
    } else {
        generateAscii();
    }
});

btnFill.addEventListener('click', () => {
    if (!traceImage.src) { alert("Upload an image first to set dimensions!"); return; }

    if (isoOverWriteNeeded()) {
        pendingAction = 'fill';
        modalOverlay.style.display = 'flex';
    } else {
        fillPattern();
    }
});

function isoOverWriteNeeded() {
    return asciiLayer.value && asciiLayer.value.trim().length > 0;
}

btnModalConfirm.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
    if (pendingAction === 'generate') {
        generateAscii();
    } else if (pendingAction === 'fill') {
        fillPattern();
    }
    pendingAction = null;
});

// --- Utils ---
document.getElementById('btn-copy').addEventListener('click', () => {
    const text = asciiLayer.value;
    if (!text || text.trim().length === 0) return;

    asciiLayer.select();
    navigator.clipboard.writeText(text);

    // Visual feedback
    const btn = document.getElementById('btn-copy');
    const originalHtml = btn.innerHTML;

    btn.classList.add('btn-success');
    // Change icon to check
    btn.innerHTML = `<i data-lucide="check" style="width:16px; height:16px; vertical-align:middle; margin-right:5px;"></i> Copied`;
    lucide.createIcons();

    setTimeout(() => {
        btn.classList.remove('btn-success');
        btn.innerHTML = originalHtml;
        lucide.createIcons();
    }, 1000);
});
document.getElementById('btn-download').addEventListener('click', () => {
    const blob = new Blob([asciiLayer.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascii_art.txt";
    a.click();
});
document.getElementById('btn-clear').addEventListener('click', () => {
    asciiLayer.value = "";
    updateCharCount();
});

asciiLayer.addEventListener('input', updateCharCount);

// --- Insert key support ---
let isOverwriteMode = false;
asciiLayer.addEventListener('keydown', (e) => {
    if (e.key === 'Insert') {
        isOverwriteMode = !isOverwriteMode;
    } else if (isOverwriteMode && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        const start = asciiLayer.selectionStart;
        const end = asciiLayer.selectionEnd;
        const val = asciiLayer.value;

        if (start === end && start < val.length && val[start] !== '\n') {
            e.preventDefault();
            asciiLayer.setRangeText(e.key, start, start + 1, 'end');
        }
    }
});

let imgVisible = true;
let lastOpacityValue = inputs.opacity.value;
const toggleBtn = document.getElementById('btn-toggle-img');

toggleBtn.addEventListener('click', () => {
    imgVisible = !imgVisible;

    const iconName = imgVisible ? 'eye' : 'eye-off';

    if (!imgVisible) {
        // Hiding: Save current value, then set to 0
        lastOpacityValue = inputs.opacity.value;
        inputs.opacity.value = 0;

        toggleBtn.classList.add('btn-toggled-off');
        document.getElementById('val-opacity').textContent = '0';
    } else {
        // Showing: Restore last value
        inputs.opacity.value = lastOpacityValue;

        toggleBtn.classList.remove('btn-toggled-off');
        document.getElementById('val-opacity').textContent = inputs.opacity.value;
    }

    traceImage.style.opacity = inputs.opacity.value;

    toggleBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    lucide.createIcons();
});

inputs.opacity.addEventListener('input', () => {
    if (!imgVisible) {
        imgVisible = true;
        toggleBtn.classList.remove('btn-toggled-off');
        toggleBtn.innerHTML = `<i data-lucide="eye"></i>`;
        lucide.createIcons();
    }
    traceImage.style.opacity = inputs.opacity.value;
});

// --- Smooth scroll ---
class SmoothScroller {
    constructor(element) {
        this.element = element;
        this.targetX = element.scrollLeft;
        this.targetY = element.scrollTop;
        this.currentX = element.scrollLeft;
        this.currentY = element.scrollTop;
        this.isAnimating = false;

        // Configuration
        this.lerpFactor = 0.2;  // lower = slower/smoother, higher = snappier
        this.precision = 0.5;   // stop animation when delta is below this

        element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    }

    onWheel(e) {
        e.preventDefault();

        // Normalize delta
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 40;
        else if (e.deltaMode === 2) delta *= this.element.clientHeight;

        if (!this.isAnimating) {
            this.targetX = this.element.scrollLeft;
            this.targetY = this.element.scrollTop;
        }

        // Horizontal scrolling with Shift key
        if (e.shiftKey) {
            this.targetX += delta;
        } else {
            this.targetY += delta;
        }

        // Clamp targets
        const maxScrollY = this.element.scrollHeight - this.element.clientHeight;
        const maxScrollX = this.element.scrollWidth - this.element.clientWidth;

        this.targetY = Math.max(0, Math.min(this.targetY, maxScrollY));
        this.targetX = Math.max(0, Math.min(this.targetX, maxScrollX));

        if (!this.isAnimating) {
            this.isAnimating = true;
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    animate() {
        this.currentX = this.lerp(this.element.scrollLeft, this.targetX, this.lerpFactor);
        this.currentY = this.lerp(this.element.scrollTop, this.targetY, this.lerpFactor);

        this.element.scrollLeft = this.currentX;
        this.element.scrollTop = this.currentY;

        const dist = Math.abs(this.targetX - this.currentX) + Math.abs(this.targetY - this.currentY);

        if (dist > this.precision) {
            requestAnimationFrame(this.animate.bind(this));
        } else {
            this.isAnimating = false;
            this.element.scrollLeft = this.targetX;
            this.element.scrollTop = this.targetY;
        }
    }

    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) new SmoothScroller(sidebar);

    const workspace = document.getElementById('workspace');
    if (workspace) new SmoothScroller(workspace);
});
