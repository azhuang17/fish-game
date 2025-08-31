// 技能系统

class SkillSystem {
    constructor() {
        this.skills = {};
        this.initializeSkills();
    }

    initializeSkills() {
        // 眩晕技能
        this.skills.stun = {
            name: '眩晕龙卷风',
            cooldown: 5, // 5秒冷却
            duration: 0.5, // 眩晕持续0.5秒
            radius: 80, // 技能范围
            description: '释放龙卷风，眩晕周围的鱼',
            particleCount: 20,
            particleColor: '#FFD700'
        };
    }

    getSkill(skillName) {
        return this.skills[skillName];
    }

    createStunEffect(x, y, particleSystem) {
        const skill = this.skills.stun;
        
        // 创建龙卷风粒子效果
        for (let i = 0; i < skill.particleCount; i++) {
            const angle = (i / skill.particleCount) * Math.PI * 2;
            const radius = random(20, skill.radius);
            const particleX = x + Math.cos(angle) * radius;
            const particleY = y + Math.sin(angle) * radius;
            
            const particle = new Particle(
                particleX, 
                particleY,
                Math.cos(angle + Math.PI / 2) * 100, // 切向速度
                Math.sin(angle + Math.PI / 2) * 100,
                1, // 生命周期
                skill.particleColor,
                random(3, 6)
            );
            
            particleSystem.addParticle(particle);
        }

        // 添加中心爆发效果
        for (let i = 0; i < 10; i++) {
            const angle = random(0, Math.PI * 2);
            const speed = random(50, 100);
            
            const particle = new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0.8,
                '#FFFFFF',
                random(2, 4)
            );
            
            particleSystem.addParticle(particle);
        }
    }

    // 应用眩晕效果到目标鱼群
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
}

