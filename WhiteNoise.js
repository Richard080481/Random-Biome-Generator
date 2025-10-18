const canvas = document.getElementById("noiseCanvas");
const ctx = canvas.getContext("2d");

// 當視窗大小改變時，自動調整畫布大小
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function generateWhiteNoise() {
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  // 為每個像素生成隨機灰階顏色
  for (let i = 0; i < data.length; i += 4) {
    const color = Math.random() * 255;
    data[i] = color;     // R
    data[i + 1] = color; // G
    data[i + 2] = color; // B
    data[i + 3] = 255;   // alpha
  }

  ctx.putImageData(imgData, 0, 0);
}

// 每一幀都更新畫面
function animate() {
  generateWhiteNoise();
  requestAnimationFrame(animate);
}

animate();
