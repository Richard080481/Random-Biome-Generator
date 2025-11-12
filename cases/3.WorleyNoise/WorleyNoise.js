// Worley Noise (Voronoi/Cellular Noise) Class
class WorleyNoise {
    constructor(numPoints = 50) {
        this.numPoints = numPoints;
        this.points = [];
        this.generatePoints();
    }

    // Generate random feature points in 0-1 space
    generatePoints() {
        this.points = [];
        for (let i = 0; i < this.numPoints; i++) {
            this.points.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.001,
                vy: (Math.random() - 0.5) * 0.001
            });
        }
    }

    // Calculate Euclidean distance between two points
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Get noise value at normalized position (0-1 range)
    noise(x, y) {
        let minDist = Infinity;

        for (let i = 0; i < this.points.length; i++) {
            const dist = this.distance(x, y, this.points[i].x, this.points[i].y);
            if (dist < minDist) {
                minDist = dist;
            }
        }

        return Math.min(minDist * 3, 1);
    }

    // Get the two closest distances for edge detection
    noise2(x, y) {
        let minDist1 = Infinity;
        let minDist2 = Infinity;

        for (let i = 0; i < this.points.length; i++) {
            const dist = this.distance(x, y, this.points[i].x, this.points[i].y);

            if (dist < minDist1) {
                minDist2 = minDist1;
                minDist1 = dist;
            } else if (dist < minDist2) {
                minDist2 = dist;
            }
        }

        return Math.min((minDist2 - minDist1) * 10, 1);
    }

    // Update point positions with wrapping
    updatePoints() {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].x += this.points[i].vx;
            this.points[i].y += this.points[i].vy;

            // Wrap around edges
            if (this.points[i].x < 0) this.points[i].x += 1;
            if (this.points[i].x > 1) this.points[i].x -= 1;
            if (this.points[i].y < 0) this.points[i].y += 1;
            if (this.points[i].y > 1) this.points[i].y -= 1;
        }
    }
}

// Animation setup
const canvas = document.getElementById("noiseCanvas");
const ctx = canvas.getContext("2d");
const worley = new WorleyNoise(50);

// Animation modes
let animationMode = 0; // 0: drift, 1: circular, 2: pulsing, 3: edge detection
let time = 0;

// Switch animation mode every 5 seconds
setInterval(() => {
    animationMode = (animationMode + 1) % 4;
    console.log("Animation mode:", ["Drift", "Circular", "Pulsing", "Edge Detection"][animationMode]);
}, 5000);

function animate() {
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;

    time += 0.01;

    // Different animation modes
    switch(animationMode) {
        case 0: // Drift mode - smooth random movement
            worley.updatePoints();
            break;

        case 1: // Circular motion
            for (let i = 0; i < worley.points.length; i++) {
                const baseX = (i * 0.123) % 1;
                const baseY = (i * 0.456) % 1;
                const radius = 0.1;
                const angle = time * 0.1 + i * 2;

                worley.points[i].x = baseX + Math.cos(angle) * radius;
                worley.points[i].y = baseY + Math.sin(angle) * radius;
            }
            break;

        case 2: // Pulsing - points expand and contract
            for (let i = 0; i < worley.points.length; i++) {
                const baseX = (i * 0.123) % 1;
                const baseY = (i * 0.456) % 1;
                const pulse = Math.sin(time + i) * 0.15;
                const angle = i * 2;

                worley.points[i].x = baseX + Math.cos(angle) * pulse;
                worley.points[i].y = baseY + Math.sin(angle) * pulse;
            }
            break;

        case 3: // Edge detection mode (uses noise2)
            worley.updatePoints();
            break;
    }

    // Render noise to canvas
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const nx = x / canvas.width;
            const ny = y / canvas.height;

            // Use different noise function for edge detection mode
            let value;
            if (animationMode === 3) {
                value = worley.noise2(nx, ny);
            } else {
                value = worley.noise(nx, ny);
            }

            // Optional: Add some color variation based on mode
            let r, g, b;
            const color = Math.floor(value * 255);

            if (animationMode === 2) {
                // Pulsing mode - add red tint
                r = color * 1.1;
                g = color * 0.5;
                b = color * 0.5;
            } else if (animationMode === 3) {
                // Edge mode - add red tint
                r = color * 1.1;
                g = color * 0.5;
                b = color * 0.5;
            } else {
                // Standard grayscale
                r = g = b = color;
            }

            const index = (y * canvas.width + x) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw mode indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(['Drift Mode', 'Circular Mode', 'Pulsing Mode', 'Edge Detection'][animationMode], 10, 25);

    requestAnimationFrame(animate);
}

animate();