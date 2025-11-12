// Utility functions
function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

// Perlin Noise Class
class PerlinNoise {
    constructor() {
        this.p = new Uint8Array(512);
        for (let i = 0; i < 256; i++) this.p[i] = i;

        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }

        // Duplicate
        for (let i = 0; i < 256; i++) this.p[i + 256] = this.p[i];
    }

    grad(hash, x, y, z = 0) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = fade(x);
        const v = fade(y);
        const w = fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return lerp(
            lerp(
                lerp(this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z), u),
                lerp(this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z), u),
                v
            ),
            lerp(
                lerp(this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1), u),
                lerp(this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1), u),
                v
            ),
            w
        );
    }
}

// Animation setup
const canvas = document.getElementById("noiseCanvas");
const ctx = canvas.getContext("2d");
const perlin = new PerlinNoise();

const scale = 0.05; // Noise detail
let time = 0; // Animation time offset

function animate() {
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;

    // Increment time for animation
    time += 0.01;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            // Use time as the z-axis to create animated 3D Perlin noise
            const value = (perlin.noise(x * scale, y * scale, time) + 1) * 0.5; // Convert to 0~1
            const color = Math.floor(value * 255);

            const index = (y * canvas.width + x) * 4;
            data[index] = color;     // Red
            data[index + 1] = color; // Green
            data[index + 2] = color; // Blue
            data[index + 3] = 255;   // Alpha
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Continue animation
    requestAnimationFrame(animate);
}

// Start the animation
animate();