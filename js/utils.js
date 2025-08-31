// 游戏工具函数

// 计算两点之间的距离
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 计算两点之间的角度
function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// 限制数值在指定范围内
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// 线性插值
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// 随机数生成
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// 随机整数
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 检测圆形碰撞
function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dist = distance(x1, y1, x2, y2);
    return dist < (r1 + r2);
}

// 检测点是否在圆形内
function pointInCircle(px, py, cx, cy, radius) {
    return distance(px, py, cx, cy) <= radius;
}

// 向量归一化
function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

// 生成随机颜色
function randomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[randomInt(0, colors.length - 1)];
}

// 生成随机鱼类型
function randomFishType() {
    const types = ['normal', 'fast', 'big', 'small'];
    return types[randomInt(0, types.length - 1)];
}

// 屏幕坐标转换
function screenToWorld(screenX, screenY, camera) {
    return {
        x: screenX + camera.x,
        y: screenY + camera.y
    };
}

function worldToScreen(worldX, worldY, camera) {
    return {
        x: worldX - camera.x,
        y: worldY - camera.y
    };
}

// 检测是否在屏幕可见范围内
function isInViewport(x, y, radius, camera, canvas) {
    const screenPos = worldToScreen(x, y, camera);
    return screenPos.x + radius > -50 && 
           screenPos.x - radius < canvas.width + 50 &&
           screenPos.y + radius > -50 && 
           screenPos.y - radius < canvas.height + 50;
}

// 粒子效果类
class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alpha = 1;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= deltaTime;
        this.alpha = this.life / this.maxLife;
        
        // 添加重力效果（气泡向上浮）
        if (this.color === 'rgba(255,255,255,0.6)') {
            this.vy -= 50 * deltaTime; // 气泡向上
        }
    }

    draw(ctx, camera) {
        if (this.life <= 0) return;
        
        const screenPos = worldToScreen(this.x, this.y, camera);
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

// 粒子系统
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    addParticle(particle) {
        this.particles.push(particle);
    }

    // 创建气泡效果
    createBubbles(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const particle = new Particle(
                x + random(-10, 10),
                y + random(-10, 10),
                random(-20, 20),
                random(-30, -10),
                random(1, 3),
                'rgba(255,255,255,0.6)',
                random(2, 6)
            );
            this.addParticle(particle);
        }
    }

    // 创建爆炸效果
    createExplosion(x, y, color = '#FF6B6B') {
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const speed = random(50, 150);
            const particle = new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                random(0.5, 1.5),
                color,
                random(3, 8)
            );
            this.addParticle(particle);
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, camera) {
        this.particles.forEach(particle => particle.draw(ctx, camera));
    }

    clear() {
        this.particles = [];
    }
}

