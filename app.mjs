import { colorValue, compareColors, hsbText, parseHex, rgbText, signedText } from "./color-utils.mjs";

const $ = (selector) => document.querySelector(selector);
const selected = { color: parseHex("#3366FF") };
const points = { a: null, b: null };
let activePoint = "a";
let image = null;
let cameraStream = null;
let cameraFrame = null;
let lastRenderedCameraHex = null;
let toastTimer = null;

const elements = {
  preview: $("#color-preview"),
  previewHex: $("#preview-hex"),
  picker: $("#color-picker"),
  hexInput: $("#hex-input"),
  hexError: $("#hex-error"),
  hexValue: $("#hex-value"),
  rgbValue: $("#rgb-value"),
  hsbValue: $("#hsb-value"),
  recent: $("#recent-colors"),
  toast: $("#toast"),
  imageInput: $("#image-input"),
  imageCanvas: $("#image-canvas"),
  imagePlaceholder: $("#image-placeholder"),
  imageComparison: $("#image-comparison"),
  cameraToggle: $("#camera-toggle"),
  cameraVideo: $("#camera-video"),
  cameraCanvas: $("#camera-canvas"),
  cameraStage: $(".camera-stage"),
  cameraMessage: $("#camera-message"),
  cameraError: $("#camera-error"),
  cameraComparison: $("#camera-comparison"),
};

const imageContext = elements.imageCanvas.getContext("2d", { willReadFrequently: true });
const cameraContext = elements.cameraCanvas.getContext("2d", { willReadFrequently: true });

function setSelectedColor(color, { updateInput = true, addRecent = true } = {}) {
  selected.color = color;
  elements.preview.style.backgroundColor = color.hex;
  elements.previewHex.textContent = color.hex;
  elements.picker.value = color.hex.toLowerCase();
  elements.hexValue.textContent = color.hex;
  elements.rgbValue.textContent = rgbText(color);
  elements.hsbValue.textContent = hsbText(color);
  if (updateInput) elements.hexInput.value = color.hex;
  setHexValidity(true);
  if (addRecent) addRecentColor(color.hex);
  renderCameraComparison(true);
}

function setHexValidity(valid) {
  elements.hexInput.classList.toggle("invalid", !valid);
  elements.hexInput.setAttribute("aria-invalid", String(!valid));
  elements.hexError.hidden = valid;
}

function recentColors() {
  try {
    const stored = JSON.parse(localStorage.getItem("colorHelper.recent") || "[]");
    return Array.isArray(stored) ? stored.filter((hex) => parseHex(hex)).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function addRecentColor(hex) {
  const colors = [hex, ...recentColors().filter((item) => item !== hex)].slice(0, 10);
  localStorage.setItem("colorHelper.recent", JSON.stringify(colors));
  renderRecent(colors);
}

function renderRecent(colors = recentColors()) {
  elements.recent.replaceChildren(...colors.map((hex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-color";
    button.style.backgroundColor = hex;
    button.title = hex;
    button.setAttribute("aria-label", `最近使った色 ${hex} を選択`);
    button.addEventListener("click", () => setSelectedColor(parseHex(hex)));
    return button;
  }));
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1500);
}

function comparisonMarkup(comparison, labels, action = "") {
  return `
    <div class="comparison">
      <div class="comparison-title"><strong>${labels.title}</strong><span class="match-badge">${comparison.match}</span></div>
      <div class="comparison-swatches">
        <div class="comparison-swatch" style="background:${comparison.base.hex}"><span>${labels.base}: ${comparison.base.hex}</span></div>
        <div class="comparison-swatch" style="background:${comparison.sample.hex}"><span>${labels.sample}: ${comparison.sample.hex}</span></div>
      </div>
      <dl class="comparison-list">
        <div><dt>一致率</dt><dd>${comparison.similarity.toFixed(1)}%</dd></div>
        <div><dt>距離</dt><dd>${comparison.distance.toFixed(1)}</dd></div>
        <div><dt>差分</dt><dd>R ${signedText(comparison.redDelta)}&nbsp; G ${signedText(comparison.greenDelta)}&nbsp; B ${signedText(comparison.blueDelta)}</dd></div>
      </dl>
      ${action}
    </div>`;
}

function renderPoint(name) {
  const card = $(`#sample-${name}`);
  const point = points[name];
  card.classList.toggle("empty", !point);
  card.querySelector(".sample-swatch").style.background = point?.color.hex || "";
  card.querySelector("strong").textContent = point ? `${point.color.hex} · RGB ${rgbText(point.color)}` : "未選択";
  const button = card.querySelector("button");
  button.disabled = !point;
  button.onclick = point ? () => setSelectedColor(point.color) : null;
}

function renderImageComparison() {
  if (!points.a || !points.b) {
    elements.imageComparison.innerHTML = "";
    return;
  }
  elements.imageComparison.innerHTML = comparisonMarkup(compareColors(points.a.color, points.b.color), {
    title: "画像上の2点比較",
    base: "点 A",
    sample: "点 B",
  });
}

function drawImage() {
  if (!image) return;
  const maxWidth = 1000;
  const maxHeight = 700;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  elements.imageCanvas.width = Math.round(image.naturalWidth * scale);
  elements.imageCanvas.height = Math.round(image.naturalHeight * scale);
  imageContext.drawImage(image, 0, 0, elements.imageCanvas.width, elements.imageCanvas.height);

  for (const [name, point] of Object.entries(points)) {
    if (!point) continue;
    imageContext.beginPath();
    imageContext.arc(point.x, point.y, 10, 0, Math.PI * 2);
    imageContext.lineWidth = 4;
    imageContext.strokeStyle = name === "a" ? "#FFFFFF" : "#111827";
    imageContext.stroke();
    imageContext.fillStyle = name === "a" ? "#111827" : "#FFFFFF";
    imageContext.font = "bold 13px sans-serif";
    imageContext.textAlign = "center";
    imageContext.textBaseline = "middle";
    imageContext.fillText(name.toUpperCase(), point.x, point.y);
  }
}

function sampleImage(event) {
  if (!image) return;
  const rect = elements.imageCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(elements.imageCanvas.width - 1, Math.round((event.clientX - rect.left) * elements.imageCanvas.width / rect.width)));
  const y = Math.max(0, Math.min(elements.imageCanvas.height - 1, Math.round((event.clientY - rect.top) * elements.imageCanvas.height / rect.height)));
  drawImage();
  const pixel = imageContext.getImageData(x, y, 1, 1).data;
  points[activePoint] = { x, y, color: colorValue(pixel[0], pixel[1], pixel[2]) };
  drawImage();
  renderPoint(activePoint);
  renderImageComparison();
}

async function toggleCamera() {
  if (cameraStream) {
    stopCamera();
    return;
  }

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    elements.cameraError.textContent = "カメラにはHTTPS接続が必要です。READMEの「iPhoneでカメラを使う」を参照してください。";
    elements.cameraError.hidden = false;
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    elements.cameraVideo.srcObject = cameraStream;
    await elements.cameraVideo.play();
    elements.cameraCanvas.width = elements.cameraVideo.videoWidth || 640;
    elements.cameraCanvas.height = elements.cameraVideo.videoHeight || 480;
    elements.cameraStage.classList.add("running");
    elements.cameraToggle.textContent = "停止";
    elements.cameraError.hidden = true;
    cameraFrame = requestAnimationFrame(sampleCameraFrame);
  } catch {
    elements.cameraError.textContent = "カメラを使用できません。権限とブラウザ設定を確認してください。";
    elements.cameraError.hidden = false;
  }
}

function sampleCameraFrame() {
  cameraContext.drawImage(elements.cameraVideo, 0, 0, elements.cameraCanvas.width, elements.cameraCanvas.height);
  const x = Math.floor(elements.cameraCanvas.width / 2);
  const y = Math.floor(elements.cameraCanvas.height / 2);
  const pixel = cameraContext.getImageData(x, y, 1, 1).data;
  elements.cameraCanvas.dataset.sample = JSON.stringify(colorValue(pixel[0], pixel[1], pixel[2]));
  renderCameraComparison();
  cameraFrame = requestAnimationFrame(sampleCameraFrame);
}

function stopCamera() {
  cancelAnimationFrame(cameraFrame);
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  elements.cameraStage.classList.remove("running");
  elements.cameraToggle.textContent = "開始";
  elements.cameraComparison.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderCameraComparison(force = false) {
  const sample = elements.cameraCanvas.dataset.sample ? JSON.parse(elements.cameraCanvas.dataset.sample) : null;
  if (!sample) return;
  if (!force && sample.hex === lastRenderedCameraHex) return;
  lastRenderedCameraHex = sample.hex;
  elements.cameraComparison.innerHTML = comparisonMarkup(compareColors(selected.color, sample), {
    title: "選択中の色との比較",
    base: "選択中",
    sample: "カメラ",
  }, '<button id="use-camera-color" class="button secondary" type="button">カメラの色を使う</button>');
  $("#use-camera-color").addEventListener("click", () => setSelectedColor(sample));
}

elements.picker.addEventListener("input", (event) => setSelectedColor(parseHex(event.target.value)));
elements.hexInput.addEventListener("input", (event) => {
  const color = parseHex(event.target.value);
  setHexValidity(Boolean(color));
  if (color) setSelectedColor(color, { updateInput: false });
});
$("#copy-button").addEventListener("click", async () => {
  await navigator.clipboard.writeText(selected.color.hex);
  showToast(`${selected.color.hex} をコピーしました`);
});
document.querySelectorAll(".point-mode").forEach((button) => button.addEventListener("click", () => {
  activePoint = button.dataset.point;
  document.querySelectorAll(".point-mode").forEach((item) => item.classList.toggle("active", item === button));
}));
elements.imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  const nextImage = new Image();
  nextImage.onload = () => {
    if (image?.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
    image = nextImage;
    points.a = null;
    points.b = null;
    elements.imageCanvas.style.display = "block";
    elements.imagePlaceholder.hidden = true;
    drawImage();
    renderPoint("a");
    renderPoint("b");
    renderImageComparison();
  };
  nextImage.src = objectUrl;
});
elements.imageCanvas.addEventListener("pointerdown", sampleImage);
elements.cameraToggle.addEventListener("click", toggleCamera);
window.addEventListener("pagehide", stopCamera);

setSelectedColor(selected.color);
renderPoint("a");
renderPoint("b");
