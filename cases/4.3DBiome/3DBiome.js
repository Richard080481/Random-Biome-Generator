// Perlin Noise Implementation
class PerlinNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.p = this.generatePermutation();
    }

    generatePermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;

        let rng = this.seed;
        for (let i = 255; i > 0; i--) {
            rng = (rng * 9301 + 49297) % 233280;
            const j = Math.floor((rng / 233280) * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }

        return [...p, ...p];
    }

    fade(t) {
        // Improved smoothstep (Perlin's improved fade function)
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z))),
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }
}

// WebGL Setup
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
    alert('WebGL not supported');
    throw new Error('WebGL not supported');
}

// Vertex Shader with Phong Shading
const vsSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform mat4 uLightSpaceMatrix;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vColor;
    varying vec4 vPositionLightSpace;

    void main() {
        vec4 worldPosition = uModelViewMatrix * vec4(aPosition, 1.0);
        vPosition = worldPosition.xyz;
        vNormal = mat3(uNormalMatrix) * aNormal;
        vColor = aColor;
        vPositionLightSpace = uLightSpaceMatrix * worldPosition;
        gl_Position = uProjectionMatrix * worldPosition;
    }
`;

// Fragment Shader with Phong Shading and Shadows
const fsSource = `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vColor;
    varying vec4 vPositionLightSpace;

    uniform vec3 uLightPos;
    uniform vec3 uViewPos;
    uniform vec3 uLightColor;

    float shadowCalculation(vec4 fragPosLightSpace) {
        vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
        projCoords = projCoords * 0.5 + 0.5;

        if(projCoords.z > 1.0) return 0.0;

        float currentDepth = projCoords.z;
        float bias = 0.005;
        float shadow = currentDepth - bias > projCoords.z ? 1.0 : 0.0;

        return shadow * 0.5;
    }

    void main() {
        // Ambient
        float ambientStrength = 0.3;
        vec3 ambient = ambientStrength * uLightColor;

        // Diffuse
        vec3 norm = normalize(vNormal);
        vec3 lightDir = normalize(uLightPos - vPosition);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor;

        // Specular
        float specularStrength = 0.5;
        vec3 viewDir = normalize(uViewPos - vPosition);
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = specularStrength * spec * uLightColor;

        // Shadow
        float shadow = shadowCalculation(vPositionLightSpace);

        vec3 result = (ambient + (1.0 - shadow) * (diffuse + specular)) * vColor;
        gl_FragColor = vec4(result, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}

// Get attribute and uniform locations
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aNormal = gl.getAttribLocation(program, 'aNormal');
const aColor = gl.getAttribLocation(program, 'aColor');
const uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
const uLightSpaceMatrix = gl.getUniformLocation(program, 'uLightSpaceMatrix');
const uLightPos = gl.getUniformLocation(program, 'uLightPos');
const uViewPos = gl.getUniformLocation(program, 'uViewPos');
const uLightColor = gl.getUniformLocation(program, 'uLightColor');

// Matrix operations
function perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ];
}

function lookAt(eye, center, up) {
    const z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    return [
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ];
}

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function transpose(m) {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    ];
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Generate terrain mesh with combined biomes
function generateTerrain(waterLevel, mountainFreq, smoothness) {
    const size = 50;
    const resolution = 100;
    const vertices = [];
    const colors = [];
    const normals = [];
    const indices = [];

    const seedInput = document.getElementById('seedInput').value;
    const seed = seedInput ? parseFloat(seedInput) || hashCode(seedInput) : Math.random();

    const perlin = new PerlinNoise(seed);
    const biomeNoise = new PerlinNoise(seed * 1.5);

    // Color definitions
    const deepOcean = [0.05, 0.15, 0.4];
    const shallowOcean = [0.1, 0.3, 0.6];
    const beach = [0.9, 0.85, 0.6];
    const plains = [0.3, 0.7, 0.2];
    const hills = [0.35, 0.55, 0.25];
    const mountains = [0.5, 0.5, 0.5];
    const snowPeaks = [0.9, 0.9, 0.95];

    // Generate vertices
    for (let z = 0; z <= resolution; z++) {
        for (let x = 0; x <= resolution; x++) {
            const xPos = (x / resolution - 0.5) * size;
            const zPos = (z / resolution - 0.5) * size;

            // Multi-octave noise for terrain height
            let height = 0;
            let amplitude = 1;
            let freq = 0.03;

            for (let o = 0; o < 6; o++) {
                height += perlin.noise(xPos * freq, zPos * freq, 0) * amplitude;
                amplitude *= 0.5;
                freq *= 2;
            }

            // Biome noise for variation (smoother)
            let biomeValue = 0;
            amplitude = 1;
            freq = 0.02;

            for (let o = 0; o < smoothness; o++) {
                biomeValue += biomeNoise.noise(xPos * freq, zPos * freq, 10) * amplitude;
                amplitude *= 0.5;
                freq *= 2;
            }

            biomeValue = (biomeValue + 1) / 2; // Normalize to 0-1

            // Adjust biome thresholds based on mountain frequency
            const mountainThreshold = 1 - mountainFreq;
            const hillThreshold = mountainThreshold - 0.2;
            const beachThreshold = waterLevel + 0.05;

            // Calculate final height based on biome
            let finalHeight = height;
            let color;

            if (biomeValue < waterLevel) {
                // Ocean
                finalHeight = height * 0.3 - 2;
                const depth = (waterLevel - biomeValue) / waterLevel;
                color = [
                    lerp(shallowOcean[0], deepOcean[0], depth),
                    lerp(shallowOcean[1], deepOcean[1], depth),
                    lerp(shallowOcean[2], deepOcean[2], depth)
                ];
            } else if (biomeValue < beachThreshold) {
                // Beach
                finalHeight = height * 0.5 - 0.5;
                const beachBlend = smoothstep(waterLevel, beachThreshold, biomeValue);
                color = [
                    lerp(shallowOcean[0], beach[0], beachBlend),
                    lerp(shallowOcean[1], beach[1], beachBlend),
                    lerp(shallowOcean[2], beach[2], beachBlend)
                ];
            } else if (biomeValue < hillThreshold) {
                // Plains
                finalHeight = height * 2;
                const plainsBlend = smoothstep(beachThreshold, hillThreshold, biomeValue);
                color = [
                    lerp(beach[0], plains[0], plainsBlend),
                    lerp(beach[1], plains[1], plainsBlend),
                    lerp(beach[2], plains[2], plainsBlend)
                ];
            } else if (biomeValue < mountainThreshold) {
                // Hills
                finalHeight = height * 6;
                const hillBlend = smoothstep(hillThreshold, mountainThreshold, biomeValue);
                color = [
                    lerp(plains[0], hills[0], hillBlend),
                    lerp(plains[1], hills[1], hillBlend),
                    lerp(plains[2], hills[2], hillBlend)
                ];
            } else {
                // Mountains
                finalHeight = height * 12;
                const mountainBlend = smoothstep(mountainThreshold, 1, biomeValue);

                // Add snow on peaks
                if (finalHeight > 8) {
                    const snowBlend = smoothstep(8, 12, finalHeight);
                    color = [
                        lerp(mountains[0], snowPeaks[0], snowBlend),
                        lerp(mountains[1], snowPeaks[1], snowBlend),
                        lerp(mountains[2], snowPeaks[2], snowBlend)
                    ];
                } else {
                    color = [
                        lerp(hills[0], mountains[0], mountainBlend),
                        lerp(hills[1], mountains[1], mountainBlend),
                        lerp(hills[2], mountains[2], mountainBlend)
                    ];
                }
            }

            vertices.push(xPos, finalHeight, zPos);
            colors.push(color[0], color[1], color[2]);
            normals.push(0, 1, 0); // Temporary
        }
    }

    // Generate indices
    for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
            const topLeft = z * (resolution + 1) + x;
            const topRight = topLeft + 1;
            const bottomLeft = (z + 1) * (resolution + 1) + x;
            const bottomRight = bottomLeft + 1;

            indices.push(topLeft, bottomLeft, topRight);
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }

    // Recalculate normals
    const normalArray = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
        const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
        const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        const normal = cross(edge1, edge2);

        for (let j = 0; j < 3; j++) {
            normalArray[i0 + j] += normal[j];
            normalArray[i1 + j] += normal[j];
            normalArray[i2 + j] += normal[j];
        }
    }

    // Normalize
    for (let i = 0; i < normalArray.length; i += 3) {
        const n = normalize([normalArray[i], normalArray[i + 1], normalArray[i + 2]]);
        normalArray[i] = n[0];
        normalArray[i + 1] = n[1];
        normalArray[i + 2] = n[2];
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normalArray),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
}

let currentMesh = null;

function setupBuffers(mesh) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    return { positionBuffer, normalBuffer, colorBuffer, indexBuffer, indexCount: mesh.indices.length };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let rotation = 0;

function render() {
    if (!currentMesh) return;

    rotation += 0.005;

    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(program);

    // Setup camera
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = perspective(45 * Math.PI / 180, aspect, 0.1, 1000);

    const cameraPos = [
        Math.sin(rotation) * 60,
        40,
        Math.cos(rotation) * 60
    ];

    const modelViewMatrix = lookAt(cameraPos, [0, 0, 0], [0, 1, 0]);
    const normalMatrix = transpose(modelViewMatrix);

    const lightPos = [30, 50, 30];
    const lightSpaceMatrix = lookAt(lightPos, [0, 0, 0], [0, 1, 0]);

    // Set uniforms
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(uLightSpaceMatrix, false, lightSpaceMatrix);
    gl.uniform3fv(uLightPos, lightPos);
    gl.uniform3fv(uViewPos, cameraPos);
    gl.uniform3fv(uLightColor, [1.0, 1.0, 1.0]);

    // Bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, currentMesh.positionBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, currentMesh.normalBuffer);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, currentMesh.colorBuffer);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentMesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, currentMesh.indexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

// Generate initial terrain
function generateNewBiome() {
    const waterLevel = parseFloat(document.getElementById('waterLevel').value);
    const mountainFreq = parseFloat(document.getElementById('mountainFreq').value);
    const smoothness = parseInt(document.getElementById('smoothness').value);

    const mesh = generateTerrain(waterLevel, mountainFreq, smoothness);
    currentMesh = setupBuffers(mesh);

    document.getElementById('info').textContent =
        `Terrain generated! Water: ${(waterLevel * 100).toFixed(0)}%, Mountains: ${(mountainFreq * 100).toFixed(0)}%`;
}

// UI event listeners
document.getElementById('generateBtn').addEventListener('click', generateNewBiome);

document.getElementById('waterLevel').addEventListener('input', (e) => {
    document.getElementById('waterValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('mountainFreq').addEventListener('input', (e) => {
    document.getElementById('mountainValue').textContent = parseFloat(e.target.value).toFixed(2);
});

document.getElementById('smoothness').addEventListener('input', (e) => {
    document.getElementById('smoothValue').textContent = e.target.value;
});

generateNewBiome();
render();