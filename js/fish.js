// 鱼类对象系统

class Fish {
    constructor(x, y, size, type = 'normal', isPlayer = false) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size;
        this.type = type;
        this.isPlayer = isPlayer;
        
        // 移动相关
        this.vx = 0;
        this.vy = 0;
        this.speed = this.getSpeedByType();
        this.direction = 0; // 面向方向
        
        // 视觉相关
        this.color = this.getColorByType();
        this.tailOffset = 0; // 尾巴摆动偏移
        this.animationTime = 0;
        
        // 状态相关
        this.health = 100;
        this.isStunned = false;
        this.stunTime = 0;
        this.isAlive = true;
        
        // 传送后加速状态
        this.isTeleportBoosted = false;
        this.teleportBoostTime = 0;
        this.teleportBoostDuration = 3; // 3秒加速时间
        this.teleportBoostMultiplier = 1.5; // 1.5倍速度
        
        // AI相关（非玩家鱼）
        if (!isPlayer) {
            this.aiTarget = null;
            this.aiChangeTime = 0;
            this.aiDirection = random(0, Math.PI * 2);
        }
        
        // 成长相关
        this.growthPoints = 0;
        this.maxSize = this.getMaxSizeByType();
        
        // 气泡拖尾
        this.bubbleTimer = 0;
    }

    getSpeedByType() {
        const speeds = {
            'small': 120,
            'normal': 100,
            'fast': 140,
            'big': 80
        };
        const baseSpeed = speeds[this.type] || 100;
        
        // 如果处于传送加速状态，返回加速后的速度
        if (this.isTeleportBoosted) {
            return baseSpeed * this.teleportBoostMultiplier;
        }
        
        return baseSpeed;
    }

    getColorByType() {
        if (this.isPlayer) {
            return '#00D4FF'; // 玩家鱼特殊颜色
        }
        
        const colors = {
            'small': '#96CEB4',
            'normal': '#4ECDC4',
            'fast': '#FF6B6B',
            'big': '#45B7D1'
        };
        return colors[this.type] || randomColor();
    }

    getMaxSizeByType() {
        const maxSizes = {
            'small': 15,
            'normal': 25,
            'fast': 20,
            'big': 40
        };
        return maxSizes[this.type] || 25;
    }

    update(deltaTime, allFish, camera, canvas) {
        if (!this.isAlive) return;

        this.animationTime += deltaTime;
        
        // 处理眩晕状态
        if (this.isStunned) {
            this.stunTime -= deltaTime;
            if (this.stunTime <= 0) {
                this.isStunned = false;
            }
            return; // 眩晕时不能移动
        }

        // 处理传送后加速状态
        if (this.isTeleportBoosted) {
            this.teleportBoostTime -= deltaTime;
            if (this.teleportBoostTime <= 0) {
                this.isTeleportBoosted = false;
            }
        }

        // 玩家控制 vs AI控制
        if (this.isPlayer) {
            this.updatePlayerMovement(deltaTime);
        } else {
            this.updateAI(deltaTime, allFish);
        }

        // 更新当前速度（考虑传送加速）
        this.speed = this.getSpeedByType();

        // 更新位置
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // 更新面向方向
        if (this.vx !== 0 || this.vy !== 0) {
            this.direction = Math.atan2(this.vy, this.vx);
        }

        // 更新尾巴摆动
        this.tailOffset = Math.sin(this.animationTime * 8) * 0.3;

        // 边界检查（地图边界）
        this.checkMapBounds();

        // 生成气泡拖尾
        this.bubbleTimer += deltaTime;
        if (this.bubbleTimer > 0.3) {
            this.createBubbleTrail();
            this.bubbleTimer = 0;
        }
    }

    updatePlayerMovement(deltaTime) {
        // 玩家移动由输入系统控制，这里只处理阻力
        this.vx *= 0.9;
        this.vy *= 0.9;
    }

    updateAI(deltaTime, allFish) {
        this.aiChangeTime += deltaTime;
        
        // 每2秒改变一次AI行为
        if (this.aiChangeTime > 2) {
            this.chooseAIBehavior(allFish);
            this.aiChangeTime = 0;
        }

        // 执行AI行为
        this.executeAIBehavior(deltaTime, allFish);
    }

    chooseAIBehavior(allFish) {
        // 寻找最近的目标
        let nearestPrey = null;
        let nearestPredator = null;
        let minPreyDist = Infinity;
        let minPredatorDist = Infinity;

        for (let fish of allFish) {
            if (fish === this || !fish.isAlive) continue;
            
            const dist = distance(this.x, this.y, fish.x, fish.y);
            
            // 寻找猎物（比自己小的鱼）
            if (fish.size < this.size * 0.8 && dist < minPreyDist && dist < 200) {
                nearestPrey = fish;
                minPreyDist = dist;
            }
            
            // 寻找威胁（比自己大的鱼）
            if (fish.size > this.size * 1.2 && dist < minPredatorDist && dist < 150) {
                nearestPredator = fish;
                minPredatorDist = dist;
            }
        }

        // 优先级：逃避 > 追捕 > 随机游动
        if (nearestPredator) {
            this.aiTarget = nearestPredator;
            this.aiBehavior = 'flee';
        } else if (nearestPrey) {
            this.aiTarget = nearestPrey;
            this.aiBehavior = 'hunt';
        } else {
            this.aiTarget = null;
            this.aiBehavior = 'wander';
            this.aiDirection = random(0, Math.PI * 2);
        }
    }

    executeAIBehavior(deltaTime, allFish) {
        const maxSpeed = this.speed;
        
        switch (this.aiBehavior) {
            case 'flee':
                if (this.aiTarget && this.aiTarget.isAlive) {
                    // 远离威胁
                    const fleeAngle = angle(this.aiTarget.x, this.aiTarget.y, this.x, this.y);
                    this.vx = Math.cos(fleeAngle) * maxSpeed;
                    this.vy = Math.sin(fleeAngle) * maxSpeed;
                }
                break;
                
            case 'hunt':
                if (this.aiTarget && this.aiTarget.isAlive) {
                    // 追捕猎物
                    const huntAngle = angle(this.x, this.y, this.aiTarget.x, this.aiTarget.y);
                    this.vx = Math.cos(huntAngle) * maxSpeed;
                    this.vy = Math.sin(huntAngle) * maxSpeed;
                }
                break;
                
            case 'wander':
            default:
                // 随机游动
                this.vx = Math.cos(this.aiDirection) * maxSpeed * 0.5;
                this.vy = Math.sin(this.aiDirection) * maxSpeed * 0.5;
                
                // 偶尔改变方向
                if (Math.random() < 0.02) {
                    this.aiDirection += random(-0.5, 0.5);
                }
                break;
        }
    }

    checkMapBounds() {
        // 这里暂时设置一个大的边界，后续会根据地图系统调整
        const mapSize = 2000;
        
        if (this.x < 0) this.x = 0;
        if (this.x > mapSize) this.x = mapSize;
        if (this.y < 0) this.y = 0;
        if (this.y > mapSize) this.y = mapSize;
    }

    createBubbleTrail() {
        if (window.game && window.game.particleSystem) {
            // 在鱼的后方创建气泡
            const bubbleX = this.x - Math.cos(this.direction) * this.radius;
            const bubbleY = this.y - Math.sin(this.direction) * this.radius;
            window.game.particleSystem.createBubbles(bubbleX, bubbleY, 2);
        }
    }

    // 吃掉其他鱼
    eat(otherFish) {
        if (!this.canEat(otherFish)) return false;
        
        // 增加成长点数
        this.growthPoints += otherFish.size;
        
        // 检查是否可以成长
        if (this.growthPoints >= this.size * 2) {
            this.grow();
            this.growthPoints = 0;
        }
        
        // 创建吃掉的特效
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createExplosion(otherFish.x, otherFish.y, otherFish.color);
        }
        
        return true;
    }

    canEat(otherFish) {
        return otherFish.isAlive && 
               otherFish.size < this.size * 0.8 && 
               circleCollision(this.x, this.y, this.radius, otherFish.x, otherFish.y, otherFish.radius);
    }

    grow() {
        const oldSize = this.size;
        this.size = Math.min(this.size + 2, this.maxSize);
        this.radius = this.size;
        
        // 如果是玩家，更新UI
        if (this.isPlayer && window.game) {
            window.game.updateSizeUI();
        }
        
        console.log(`鱼成长了！从 ${oldSize} 到 ${this.size}`);
    }

    // 被眩晕
    stun(duration = 0.5) {
        this.isStunned = true;
        this.stunTime = duration;
        this.vx = 0;
        this.vy = 0;
    }

    // 死亡
    die() {
        this.isAlive = false;
        
        // 创建死亡特效
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createExplosion(this.x, this.y, this.color);
        }
    }

    // 绘制鱼
    draw(ctx, camera) {
        if (!this.isAlive) return;
        
        const screenPos = worldToScreen(this.x, this.y, camera);
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.direction);
        
        // 眩晕效果
        if (this.isStunned) {
            ctx.globalAlpha = 0.5;
            // 绘制眩晕星星
            this.drawStunStars(ctx);
        }
        
        // 绘制鱼身体
        this.drawBody(ctx);
        
        // 绘制鱼鳍
        this.drawFins(ctx);
        
        // 绘制鱼尾
        this.drawTail(ctx);
        
        // 绘制眼睛和嘴巴
        this.drawFace(ctx);
        
        // 绘制鱼鳞
        this.drawScales(ctx);
        
        ctx.restore();
        
        // 绘制玩家指示器
        if (this.isPlayer) {
            this.drawPlayerIndicator(ctx, screenPos);
            
            // 绘制传送加速效果
            if (this.isTeleportBoosted) {
                this.drawTeleportBoostEffect(ctx, screenPos);
            }
        }
    }

    drawBody(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 身体轮廓
        ctx.strokeStyle = this.darkenColor(this.color);
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawFins(ctx) {
        ctx.fillStyle = this.darkenColor(this.color);
        
        // 上鳍
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.2, -this.radius * 0.8, this.radius * 0.3, this.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 下鳍
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.2, this.radius * 0.8, this.radius * 0.3, this.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 侧鳍
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.5, this.radius * 0.3, this.radius * 0.4, this.radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(this.radius * 0.5, -this.radius * 0.3, this.radius * 0.4, this.radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTail(ctx) {
        ctx.save();
        ctx.translate(-this.radius * 1.2, this.tailOffset * this.radius);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.6);
        ctx.lineTo(-this.radius * 0.6, 0);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = this.darkenColor(this.color);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }

    drawFace(ctx) {
        // 眼睛
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.radius * 0.35, -this.radius * 0.2, this.radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // 嘴巴
        ctx.strokeStyle = this.darkenColor(this.color);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.radius * 0.8, 0, this.radius * 0.2, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();
    }

    drawScales(ctx) {
        ctx.strokeStyle = this.lightenColor(this.color);
        ctx.lineWidth = 1;
        
        // 绘制鱼鳞纹理
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const x = -this.radius * 0.5 + i * this.radius * 0.3;
                const y = -this.radius * 0.3 + j * this.radius * 0.3;
                
                ctx.beginPath();
                ctx.arc(x, y, this.radius * 0.1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    drawStunStars(ctx) {
        const time = this.animationTime * 5;
        for (let i = 0; i < 3; i++) {
            const angle = (time + i * Math.PI * 2 / 3);
            const x = Math.cos(angle) * this.radius * 1.5;
            const y = Math.sin(angle) * this.radius * 1.5;
            
            ctx.fillStyle = '#FFD700';
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(time);
            
            // 绘制星星
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const starAngle = (j * Math.PI * 2) / 5;
                const radius = j % 2 === 0 ? 8 : 4;
                const sx = Math.cos(starAngle) * radius;
                const sy = Math.sin(starAngle) * radius;
                
                if (j === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }

    drawPlayerIndicator(ctx, screenPos) {
        ctx.save();
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawTeleportBoostEffect(ctx, screenPos) {
        ctx.save();
        
        // 计算加速效果的透明度（随时间衰减）
        const alpha = this.teleportBoostTime / this.teleportBoostDuration;
        
        // 绘制加速光环
        ctx.strokeStyle = `rgba(153, 102, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = this.animationTime * 100; // 旋转效果
        
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius + 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制内层光环
        ctx.strokeStyle = `rgba(204, 153, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.lineDashOffset = -this.animationTime * 80;
        
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius + 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制速度拖尾效果
        if (this.vx !== 0 || this.vy !== 0) {
            const trailLength = 30;
            const trailX = screenPos.x - Math.cos(this.direction) * trailLength;
            const trailY = screenPos.y - Math.sin(this.direction) * trailLength;
            
            const gradient = ctx.createLinearGradient(screenPos.x, screenPos.y, trailX, trailY);
            gradient.addColorStop(0, `rgba(153, 102, 255, ${alpha * 0.8})`);
            gradient.addColorStop(1, 'rgba(153, 102, 255, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6;
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y);
            ctx.lineTo(trailX, trailY);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    darkenColor(color) {
        // 简单的颜色变暗函数
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);
        return `rgb(${r}, ${g}, ${b})`;
    }

    lightenColor(color) {
        // 简单的颜色变亮函数
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 40);
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 40);
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 40);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // 激活传送后加速效果
    activateTeleportBoost() {
        this.isTeleportBoosted = true;
        this.teleportBoostTime = this.teleportBoostDuration;
        console.log('传送加速激活！');
    }

    // 获取鱼的信息
    getInfo() {
        return {
            size: this.size,
            type: this.type,
            isPlayer: this.isPlayer,
            isAlive: this.isAlive,
            position: { x: this.x, y: this.y }
        };
    }
}

