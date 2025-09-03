// 技能系统

class SkillSystem {
    constructor() {
        this.skills = {};
        this.initializeSkills();
        this.walls = []; // 存储石墙
    }

    initializeSkills() {
        // 眩晕技能
        this.skills.stun = {
            name: '眩晕龙卷风',
            cooldown: 5, // 5秒冷却
            duration: 3.5, // 眩晕持续3.5秒
            radius: 80, // 技能范围
            description: '释放龙卷风，眩晕周围的鱼',
            particleCount: 15, // 减少粒子数量避免闪动
            particleColor: '#FFD700'
        };

        // 加速技能
        this.skills.speed = {
            name: '急速冲刺',
            cooldown: 6, // 6秒冷却
            duration: 5, // 加速持续5秒
            speedMultiplier: 2.0, // 速度倍数
            description: '获得极速移动能力',
            particleColor: '#00FFFF'
        };

        // 石墙技能
        this.skills.wall = {
            name: '石墙阻挡',
            cooldown: 5, // 5秒冷却
            duration: 8, // 石墙持续8秒
            width: 120, // 石墙宽度
            height: 20, // 石墙厚度
            description: '召唤石墙阻挡敌人',
            wallColor: '#8B4513'
        };
    }

    getSkill(skillName) {
        return this.skills[skillName];
    }

    createStunEffect(x, y, particleSystem) {
        const skill = this.skills.stun;
        
        // 创建龙卷风粒子效果（减少粒子数量）
        for (let i = 0; i < skill.particleCount; i++) {
            const angle = (i / skill.particleCount) * Math.PI * 2;
            const radius = random(20, skill.radius);
            const particleX = x + Math.cos(angle) * radius;
            const particleY = y + Math.sin(angle) * radius;
            
            const particle = new Particle(
                particleX, 
                particleY,
                Math.cos(angle + Math.PI / 2) * 80, // 减少速度
                Math.sin(angle + Math.PI / 2) * 80,
                0.8, // 缩短生命周期
                skill.particleColor,
                random(2, 4) // 减少粒子大小
            );
            
            particleSystem.addParticle(particle);
        }

        // 添加中心爆发效果（减少数量）
        for (let i = 0; i < 6; i++) {
            const angle = random(0, Math.PI * 2);
            const speed = random(50, 120);
            const particle = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0.6,
                '#FFFFFF',
                random(1, 3)
            );
            
            particleSystem.addParticle(particle);
        }
    }

    // 眩晕周围的鱼
    applyStunToFishes(playerX, playerY, fishes) {
        const skill = this.skills.stun;
        let affectedCount = 0;
        
        fishes.forEach(fish => {
            if (fish.isPlayer || !fish.isAlive) return;
            
            const dist = distance(playerX, playerY, fish.x, fish.y);
            if (dist <= skill.radius) {
                fish.stun(skill.duration);
                affectedCount++;
            }
        });
        
        return affectedCount;
    }

    // 创建加速效果
    createSpeedEffect(player, particleSystem) {
        const skill = this.skills.speed;
        player.activateSpeedBoost(skill.duration, skill.speedMultiplier);
        
        // 创建加速特效
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = player.radius + 10;
            const particleX = player.x + Math.cos(angle) * radius;
            const particleY = player.y + Math.sin(angle) * radius;
            
            const particle = new Particle(
                particleX, 
                particleY,
                Math.cos(angle) * 60,
                Math.sin(angle) * 60,
                1.0,
                skill.particleColor,
                3
            );
            
            particleSystem.addParticle(particle);
        }
    }

    // 创建石墙
    createWall(playerX, playerY, playerDirection) {
        const skill = this.skills.wall;
        
        // 计算石墙位置（在玩家前方）
        const wallDistance = 60; // 石墙距离玩家的距离
        const wallX = playerX + Math.cos(playerDirection) * wallDistance;
        const wallY = playerY + Math.sin(playerDirection) * wallDistance;
        
        const wall = {
            x: wallX,
            y: wallY,
            width: skill.width,
            height: skill.height,
            angle: playerDirection + Math.PI / 2, // 垂直于玩家方向
            duration: skill.duration,
            timeLeft: skill.duration,
            color: skill.wallColor,
            creatorId: 'player' // 标记创建者
        };
        
        this.walls.push(wall);
        return wall;
    }

    // 更新石墙
    updateWalls(deltaTime) {
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const wall = this.walls[i];
            wall.timeLeft -= deltaTime;
            
            if (wall.timeLeft <= 0) {
                this.walls.splice(i, 1);
            }
        }
    }

    // 渲染石墙
    renderWalls(ctx, camera) {
        this.walls.forEach(wall => {
            const screenPos = worldToScreen(wall.x, wall.y, camera);
            
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(wall.angle);
            
            // 绘制石墙主体
            ctx.fillStyle = wall.color;
            ctx.fillRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
            
            // 绘制石墙边框
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
            
            // 绘制石块纹理
            ctx.fillStyle = '#A0522D';
            for (let i = 0; i < 6; i++) {
                const blockX = -wall.width / 2 + (i * wall.width / 6) + 5;
                const blockY = -wall.height / 4;
                ctx.fillRect(blockX, blockY, wall.width / 8, wall.height / 2);
            }
            
            ctx.restore();
        });
    }

    // 检查鱼与石墙的碰撞
    checkWallCollision(fish) {
        if (fish.isPlayer) return false; // 玩家不会被自己的石墙阻挡
        
        for (const wall of this.walls) {
            if (this.isCollisionWithWall(fish, wall)) {
                this.bounceOffWall(fish, wall);
                return true;
            }
        }
        return false;
    }

    // 检测与石墙的碰撞
    isCollisionWithWall(fish, wall) {
        // 将鱼的位置转换到石墙的局部坐标系
        const dx = fish.x - wall.x;
        const dy = fish.y - wall.y;
        
        // 旋转坐标
        const cos = Math.cos(-wall.angle);
        const sin = Math.sin(-wall.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        // 检查是否在石墙范围内
        return Math.abs(localX) <= wall.width / 2 + fish.radius &&
               Math.abs(localY) <= wall.height / 2 + fish.radius;
    }

    // 从石墙反弹
    bounceOffWall(fish, wall) {
        // 计算反弹方向
        const dx = fish.x - wall.x;
        const dy = fish.y - wall.y;
        
        // 计算石墙的法向量
        const wallNormalX = Math.cos(wall.angle);
        const wallNormalY = Math.sin(wall.angle);
        
        // 计算入射向量在法向量上的投影
        const dotProduct = fish.vx * wallNormalX + fish.vy * wallNormalY;
        
        // 反射速度
        fish.vx -= 2 * dotProduct * wallNormalX;
        fish.vy -= 2 * dotProduct * wallNormalY;
        
        // 添加一些随机性
        fish.vx += random(-20, 20);
        fish.vy += random(-20, 20);
        
        // 将鱼推离石墙
        const pushDistance = fish.radius + wall.height / 2 + 5;
        fish.x = wall.x + wallNormalX * pushDistance * (dotProduct > 0 ? 1 : -1);
        fish.y = wall.y + wallNormalY * pushDistance * (dotProduct > 0 ? 1 : -1);
    }

    // 检查技能是否可用
    isSkillAvailable(skillName, lastUsedTime, currentTime) {
        const skill = this.skills[skillName];
        if (!skill) return false;
        
        return (currentTime - lastUsedTime) >= skill.cooldown * 1000; // 转换为毫秒
    }

    // 获取技能冷却进度 (0-1)
    getSkillCooldownProgress(skillName, lastUsedTime, currentTime) {
        const skill = this.skills[skillName];
        if (!skill) return 1;
        
        const elapsed = (currentTime - lastUsedTime) / 1000; // 转换为秒
        return Math.min(elapsed / skill.cooldown, 1);
    }

    // 清理所有石墙
    clearWalls() {
        this.walls = [];
    }
}

