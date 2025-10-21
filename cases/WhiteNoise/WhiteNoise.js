const canvas = document.getElementById("noiseCanvas");
const ctx = canvas.getContext("2d");

// When the window is resized, adjust the canvas size
function resizeCanvas()
{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function generateWhiteNoise()
{
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  // Generate random grayscale color for each pixel
  for (let i = 0; i < data.length; i += 4)
  {
    const color = Math.random() * 255;
    data[i] = color;     // R
    data[i + 1] = color; // G
    data[i + 2] = color; // B
    data[i + 3] = 255;   // alpha
  }
  ctx.putImageData(imgData, 0, 0);
}

// Repaint the canvas every frame
function animate()
{
  generateWhiteNoise();
  requestAnimationFrame(animate);
}

animate();
