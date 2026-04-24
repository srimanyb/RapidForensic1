// ===== Animated Shader Background =====
// Professional cybersecurity particle network — Navy / Sky-Blue palette

class ShaderBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 90;
        this.mouseX = -9999;
        this.mouseY = -9999;

        this.resize();
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        document.addEventListener('mouseleave', () => {
            this.mouseX = -9999;
            this.mouseY = -9999;
        });
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x:       Math.random() * this.canvas.width,
                y:       Math.random() * this.canvas.height,
                vx:      (Math.random() - 0.5) * 0.35,
                vy:      (Math.random() - 0.5) * 0.35,
                radius:  Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.4 + 0.15,
                // 0 = sky-blue, 1 = cyan, 2 = faint white
                type:    Math.floor(Math.random() * 3),
                phase:   Math.random() * Math.PI * 2
            });
        }
    }

    // Returns [r, g, b] for a particle type
    particleColor(type) {
        if (type === 0) return [56,  189, 248]; // sky-blue  #38BDF8
        if (type === 1) return [34,  211, 238]; // cyan      #22D3EE
        return                 [148, 196, 220]; // soft steel
    }

    drawParticles() {
        this.particles.forEach(particle => {
            const [r, g, b] = this.particleColor(particle.type);
            const op = particle.opacity;

            // Soft glow halo
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.radius * 5
            );
            gradient.addColorStop(0,   `rgba(${r},${g},${b},${op})`);
            gradient.addColorStop(0.4, `rgba(${r},${g},${b},${op * 0.4})`);
            gradient.addColorStop(1,   `rgba(${r},${g},${b},0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius * 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Crisp core dot
            this.ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(op * 1.8, 0.85)})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawConnections() {
        const maxDist = 130;

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.18;

                    const grad = this.ctx.createLinearGradient(
                        this.particles[i].x, this.particles[i].y,
                        this.particles[j].x, this.particles[j].y
                    );
                    grad.addColorStop(0,   `rgba(56, 189, 248, ${alpha})`);
                    grad.addColorStop(0.5, `rgba(34, 211, 238, ${alpha * 1.4})`);
                    grad.addColorStop(1,   `rgba(56, 189, 248, ${alpha})`);

                    this.ctx.strokeStyle = grad;
                    this.ctx.lineWidth   = 0.8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    drawMouseConnections() {
        const maxDist = 160;

        this.particles.forEach(particle => {
            const dx   = this.mouseX - particle.x;
            const dy   = this.mouseY - particle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
                const alpha = (1 - dist / maxDist) * 0.4;

                const grad = this.ctx.createLinearGradient(
                    particle.x, particle.y, this.mouseX, this.mouseY
                );
                grad.addColorStop(0, `rgba(56, 189, 248, ${alpha})`);
                grad.addColorStop(1, `rgba(34, 211, 238, ${alpha * 0.5})`);

                this.ctx.strokeStyle = grad;
                this.ctx.lineWidth   = 1.2;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(this.mouseX, this.mouseY);
                this.ctx.stroke();
            }
        });
    }

    updateParticles() {
        const now = Date.now() * 0.001;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce edges
            if (particle.x < 0 || particle.x > this.canvas.width)  particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height)  particle.vy *= -1;
            particle.x = Math.max(0, Math.min(this.canvas.width,  particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));

            // Gentle opacity pulse
            particle.opacity = 0.18 + Math.sin(now * 0.8 + particle.phase) * 0.18;
        });
    }

    drawDataStreams() {
        // Subtle vertical data-stream lines — forensics / terminal aesthetic
        if (Math.random() > 0.965) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const chars  = ['0', '1', 'A', 'F', '>', '_'];
            const char   = chars[Math.floor(Math.random() * chars.length)];
            const alpha  = Math.random() * 0.045 + 0.015;
            const isCyan = Math.random() > 0.5;

            this.ctx.font      = '11px "JetBrains Mono", monospace';
            this.ctx.fillStyle = isCyan
                ? `rgba(34, 211, 238, ${alpha})`
                : `rgba(56, 189, 248, ${alpha})`;
            this.ctx.fillText(char, x, y);
        }
    }

    animate() {
        // Dark navy trail — keeps background clear
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.14)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawDataStreams();
        this.updateParticles();
        this.drawConnections();
        this.drawMouseConnections();
        this.drawParticles();

        requestAnimationFrame(() => this.animate());
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new ShaderBackground('shaderCanvas');
});
