// 游戏主逻辑系统

class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.lastTime = 0;
        
        // 游戏状态
        this.gameState = 'start'; // 'start', 'playing', 'end'
        this.isTeleporting = false; // 添加传送状态管理
        
        // 游戏对象
        this.player = null;
        this.fishes = [];
        this.bombs = [];
        this.portals = [];
        
        // 摄像头系统
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0
        };
        
        // 粒子系统
        this.particleSystem = new ParticleSystem();
        
        // 地图系统
        this.mapSystem = new MapSystem();
        
        // 技能系统
        this.skillSystem = new SkillSystem();
        
        // 输入系统
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        // 地图系统
        this.currentMap = 1;
        this.mapSize = 2000;
        
        // 技能系统
        this.skillCooldowns = {
            stun: 0,
            speed: 0,
            wall: 0
        };
        this.currentSkill = 'stun'; // 当前选中的技能
        
        // UI元素
        this.sizeProgress = 0;
        
        // 游戏计时
        this.gameTime = 0;
        this.fishSpawnTimer = 0;
        this.bombSpawnTimer = 0;
        
        // 胜利条件
        this.winSize = 50;
    }

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 设置输入监听
        this.setupInput();
        
        // 设置UI事件
        this.setupUI();
        
        // 将游戏实例设为全局变量，供其他模块使用
        window.game = this;
        
        console.log('游戏初始化完成');
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInput() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 技能释放
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.useSkill();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // 技能切换
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Digit1') {
                this.currentSkill = 'stun';
                this.updateSkillUI();
            } else if (e.code === 'Digit2') {
                this.currentSkill = 'speed';
                this.updateSkillUI();
            } else if (e.code === 'Digit3') {
                this.currentSkill = 'wall';
                this.updateSkillUI();
            }
        });

        // 鼠标事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        // 触摸事件（移动端支持）
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = touch.clientX - rect.left;
            this.mousePos.y = touch.clientY - rect.top;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = touch.clientX - rect.left;
            this.mousePos.y = touch.clientY - rect.top;
        });
    }

    setupUI() {
        // 开始按钮
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });

        // 重新开始按钮
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });

        // 移动端技能按钮
        const skillButton = document.getElementById('skillButton');
        if (skillButton) {
            // 点击事件
            skillButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.useSkill();
                }
            });

            // 触摸事件（防止双重触发）
            skillButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.useSkill();
                }
            });
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        
        // 初始化游戏对象
        this.initGameObjects();
        
        // 开始游戏循环
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('游戏开始');
    }

    initGameObjects() {
        // 重置地图系统到第一张地图
        this.mapSystem.currentMapIndex = 0;
        const currentMap = this.mapSystem.getCurrentMap();
        this.currentMap = currentMap.id;
        this.mapSize = currentMap.size;
        
        // 创建玩家鱼
        this.player = new Fish(this.mapSize / 2, this.mapSize / 2, 12, 'normal', true);
        
        // 初始化摄像头位置
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
        this.camera.targetX = this.camera.x;
        this.camera.targetY = this.camera.y;
        
        // 清空游戏对象
        this.fishes = [this.player];
        this.bombs = [];
        
        // 使用地图系统生成内容
        this.mapSystem.generateMapContent(this);
        
        // 重置游戏状态
        this.gameTime = 0;
        this.skillCooldowns = { stun: 0, speed: 0, wall: 0 };
        this.skillSystem.clearWalls(); // 清理所有石墙
        this.updateSizeUI();
        this.updateSkillUI();
        this.updateMapUI();
    }

    generateFishes(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            let attempts = 0;
            
            // 确保鱼不会生成在玩家附近
            do {
                x = random(50, this.mapSize - 50);
                y = random(50, this.mapSize - 50);
                attempts++;
            } while (distance(x, y, this.player.x, this.player.y) < 200 && attempts < 50);
            
            const size = random(8, 30);
            const type = randomFishType();
            const fish = new Fish(x, y, size, type, false);
            this.fishes.push(fish);
        }
    }

    generateBombs(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            let attempts = 0;
            
            // 确保炸弹不会生成在玩家附近
            do {
                x = random(100, this.mapSize - 100);
                y = random(100, this.mapSize - 100);
                attempts++;
            } while (distance(x, y, this.player.x, this.player.y) < 300 && attempts < 50);
            
            this.bombs.push({
                x: x,
                y: y,
                radius: 15,
                animationTime: random(0, Math.PI * 2)
            });
        }
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // 更新游戏
        this.update(deltaTime);
        
        // 渲染游戏
        this.render();
        
        // 继续循环
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // 更新玩家输入
        this.updatePlayerInput(deltaTime);
        
        // 更新所有鱼
        this.fishes.forEach(fish => {
            fish.update(deltaTime, this.fishes, this.camera, this.canvas);
            
            // 检查鱼与石墙的碰撞
            this.skillSystem.checkWallCollision(fish);
        });
        
        // 更新石墙
        this.skillSystem.updateWalls(deltaTime);
        
        // 更新炸弹动画
        this.bombs.forEach(bomb => {
            bomb.animationTime += deltaTime * 3;
        });
        
        // 更新粒子系统
        this.particleSystem.update(deltaTime);
        
        // 更新摄像头
        this.updateCamera(deltaTime);
        
        // 检测碰撞
        this.checkCollisions();
        
        // 检测传送门碰撞
        this.checkPortalCollisions();
        
        // 更新技能冷却
        this.updateSkillCooldown(deltaTime);
        
        // 定期生成新鱼和炸弹
        this.updateSpawning(deltaTime);
        
        // 检查胜利条件
        this.checkWinCondition();
        
        // 清理死亡的鱼
        this.cleanupDeadFishes();
    }

    updatePlayerInput(deltaTime) {
        if (!this.player || !this.player.isAlive) return;
        
        const speed = this.player.speed;
        let moveX = 0;
        let moveY = 0;
        
        // 键盘控制
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
        
        // 鼠标控制（可选）
        if (moveX === 0 && moveY === 0) {
            const playerScreenPos = worldToScreen(this.player.x, this.player.y, this.camera);
            const dx = this.mousePos.x - playerScreenPos.x;
            const dy = this.mousePos.y - playerScreenPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 50) { // 死区
                moveX = dx / dist;
                moveY = dy / dist;
            }
        }
        
        // 归一化移动向量
        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
            
            this.player.vx += moveX * speed * deltaTime * 3;
            this.player.vy += moveY * speed * deltaTime * 3;
        }
    }

    updateCamera(deltaTime) {
        if (!this.player) return;
        
        // 摄像头跟随玩家
        this.camera.targetX = this.player.x - this.canvas.width / 2;
        this.camera.targetY = this.player.y - this.canvas.height / 2;
        
        // 平滑跟随
        this.camera.x = lerp(this.camera.x, this.camera.targetX, deltaTime * 5);
        this.camera.y = lerp(this.camera.y, this.camera.targetY, deltaTime * 5);
        
        // 限制摄像头在地图边界内
        this.camera.x = clamp(this.camera.x, 0, this.mapSize - this.canvas.width);
        this.camera.y = clamp(this.camera.y, 0, this.mapSize - this.canvas.height);
    }

    checkCollisions() {
        if (!this.player || !this.player.isAlive) return;
        
        // 检查玩家与其他鱼的碰撞
        for (let i = 1; i < this.fishes.length; i++) {
            const fish = this.fishes[i];
            if (!fish.isAlive) continue;
            
            if (circleCollision(this.player.x, this.player.y, this.player.radius,
                              fish.x, fish.y, fish.radius)) {
                
                // 判断谁吃谁
                if (this.player.canEat(fish)) {
                    this.player.eat(fish);
                    fish.die();
                } else if (fish.canEat(this.player)) {
                    this.player.die();
                    this.gameOver();
                    return;
                }
            }
        }
        
        // 检查玩家与炸弹的碰撞
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            
            if (circleCollision(this.player.x, this.player.y, this.player.radius,
                              bomb.x, bomb.y, bomb.radius)) {
                
                // 炸弹爆炸
                this.explodeBomb(bomb, i);
                
                // 玩家死亡
                this.player.die();
                this.gameOver();
                return;
            }
        }
        
        // 检查AI鱼之间的碰撞
        for (let i = 1; i < this.fishes.length; i++) {
            const fish1 = this.fishes[i];
            if (!fish1.isAlive) continue;
            
            for (let j = i + 1; j < this.fishes.length; j++) {
                const fish2 = this.fishes[j];
                if (!fish2.isAlive) continue;
                
                if (circleCollision(fish1.x, fish1.y, fish1.radius,
                                  fish2.x, fish2.y, fish2.radius)) {
                    
                    if (fish1.canEat(fish2)) {
                        fish1.eat(fish2);
                        fish2.die();
                    } else if (fish2.canEat(fish1)) {
                        fish2.eat(fish1);
                        fish1.die();
                    }
                }
            }
        }
    }

    explodeBomb(bomb, index) {
        // 创建爆炸特效
        this.particleSystem.createExplosion(bomb.x, bomb.y, '#FF4444');
        
        // 对周围的鱼造成伤害
        const explosionRadius = 100;
        this.fishes.forEach(fish => {
            if (fish.isAlive && distance(fish.x, fish.y, bomb.x, bomb.y) < explosionRadius) {
                fish.die();
            }
        });
        
        // 移除炸弹
        this.bombs.splice(index, 1);
    }

    checkPortalCollisions() {
        if (!this.player || !this.player.isAlive || this.isTeleporting) return;
        
        const portal = this.mapSystem.checkPortalCollision(this.player);
        if (portal) {
            // 传送到目标地图
            this.mapSystem.teleportToMap(portal.toMap, portal.toX, portal.toY, this);
        }
    }

    useSkill() {
        if (this.skillCooldowns[this.currentSkill] > 0 || !this.player || !this.player.isAlive) return;
        
        const skill = this.skillSystem.getSkill(this.currentSkill);
        if (!skill) return;
        
        // 设置技能冷却
        this.skillCooldowns[this.currentSkill] = skill.cooldown;
        
        // 根据技能类型执行不同逻辑
        switch (this.currentSkill) {
            case 'stun':
                this.skillSystem.createStunEffect(this.player.x, this.player.y, this.particleSystem);
                const affectedCount = this.skillSystem.applyStunToFishes(this.player.x, this.player.y, this.fishes);
                console.log(`使用眩晕技能，影响了 ${affectedCount} 条鱼`);
                break;
                
            case 'speed':
                this.skillSystem.createSpeedEffect(this.player, this.particleSystem);
                console.log('使用加速技能');
                break;
                
            case 'wall':
                this.skillSystem.createWall(this.player.x, this.player.y, this.player.direction);
                console.log('使用石墙技能');
                break;
        }
        
        this.updateSkillUI();
    }

    updateSkillCooldown(deltaTime) {
        // 更新所有技能冷却
        for (const skillName in this.skillCooldowns) {
            if (this.skillCooldowns[skillName] > 0) {
                this.skillCooldowns[skillName] -= deltaTime;
                if (this.skillCooldowns[skillName] < 0) {
                    this.skillCooldowns[skillName] = 0;
                }
            }
        }
        this.updateSkillUI();
    }

    updateSpawning(deltaTime) {
        this.fishSpawnTimer += deltaTime;
        this.bombSpawnTimer += deltaTime;
        
        // 每10秒生成新鱼
        if (this.fishSpawnTimer > 10) {
            this.generateFishes(3);
            this.fishSpawnTimer = 0;
        }
        
        // 每15秒生成新炸弹
        if (this.bombSpawnTimer > 15) {
            this.generateBombs(1);
            this.bombSpawnTimer = 0;
        }
    }

    checkWinCondition() {
        if (this.player && this.player.isAlive && this.player.size >= this.winSize) {
            this.gameWin();
        }
    }

    cleanupDeadFishes() {
        this.fishes = this.fishes.filter(fish => fish.isAlive);
    }

    gameOver() {
        this.gameState = 'end';
        this.isRunning = false;
        
        document.getElementById('endTitle').textContent = '游戏结束';
        document.getElementById('endMessage').textContent = '你被吃掉了！再试一次吧！';
        
        this.showScreen('endScreen');
        console.log('游戏结束');
    }

    gameWin() {
        this.gameState = 'end';
        this.isRunning = false;
        
        document.getElementById('endTitle').textContent = '恭喜胜利！';
        document.getElementById('endMessage').textContent = '你成为了海洋之王！';
        
        this.showScreen('endScreen');
        console.log('游戏胜利');
    }

    restartGame() {
        this.gameState = 'start';
        this.showScreen('startScreen');
        
        // 清理游戏状态
        this.fishes = [];
        this.bombs = [];
        this.particleSystem.clear();
        
        console.log('重新开始游戏');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    // UI更新方法
    updateSizeUI() {
        if (!this.player) return;
        
        this.sizeProgress = (this.player.size / this.winSize) * 100;
        const progressElement = document.getElementById('sizeProgress');
        if (progressElement) {
            progressElement.style.width = Math.min(this.sizeProgress, 100) + '%';
        }
    }

    updateSkillUI() {
        // 更新当前技能的冷却进度
        const skill = this.skillSystem.getSkill(this.currentSkill);
        if (!skill) return;
        
        const cooldownTime = this.skillCooldowns[this.currentSkill];
        const progress = Math.max(0, (skill.cooldown - cooldownTime) / skill.cooldown) * 100;
        
        const progressElement = document.getElementById('skillProgress');
        if (progressElement) {
            progressElement.style.width = progress + '%';
        }

        // 更新技能名称显示
        const skillNameElement = document.getElementById('skillName');
        if (skillNameElement) {
            skillNameElement.textContent = `${this.currentSkill.toUpperCase()}: ${skill.name}`;
        }

        // 更新技能描述
        const skillDescElement = document.getElementById('skillDescription');
        if (skillDescElement) {
            skillDescElement.textContent = skill.description;
        }

        // 更新移动端技能按钮状态
        const skillButton = document.getElementById('skillButton');
        if (skillButton) {
            if (cooldownTime > 0) {
                skillButton.classList.add('cooldown', 'disabled');
                skillButton.disabled = true;
                skillButton.textContent = `${skill.name} (${cooldownTime.toFixed(1)}s)`;
            } else {
                skillButton.classList.remove('cooldown', 'disabled');
                skillButton.disabled = false;
                skillButton.textContent = skill.name;
            }
        }

        // 更新技能快捷键提示
        const skillKeysElement = document.getElementById('skillKeys');
        if (skillKeysElement) {
            skillKeysElement.innerHTML = `
                <div class="skill-key ${this.currentSkill === 'stun' ? 'active' : ''}">1: 眩晕</div>
                <div class="skill-key ${this.currentSkill === 'speed' ? 'active' : ''}">2: 加速</div>
                <div class="skill-key ${this.currentSkill === 'wall' ? 'active' : ''}">3: 石墙</div>
            `;
        }
    }

    updateMapUI() {
        const mapElement = document.getElementById('currentMap');
        if (mapElement) {
            const currentMap = this.mapSystem.getCurrentMap();
            mapElement.textContent = `${currentMap.name}`;
        }
    }

    render() {
        // 使用地图系统绘制背景
        this.mapSystem.drawBackground(this.ctx, this.canvas, this.camera, this.gameTime);
        
        // 绘制传送门
        this.mapSystem.drawPortals(this.ctx, this.camera);
        
        // 绘制所有鱼
        this.fishes.forEach(fish => {
            if (isInViewport(fish.x, fish.y, fish.radius, this.camera, this.canvas)) {
                fish.draw(this.ctx, this.camera);
            }
        });
        
        // 绘制炸弹
        this.bombs.forEach(bomb => {
            if (isInViewport(bomb.x, bomb.y, bomb.radius, this.camera, this.canvas)) {
                this.drawBomb(bomb);
            }
        });
        
        // 绘制石墙
        this.skillSystem.renderWalls(this.ctx, this.camera);
        
        // 绘制粒子效果
        this.particleSystem.draw(this.ctx, this.camera);
        
        // 绘制地图边界
        this.drawMapBounds();
    }

    drawBomb(bomb) {
        const screenPos = worldToScreen(bomb.x, bomb.y, this.camera);
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // 炸弹主体
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 炸弹高光
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.arc(-bomb.radius * 0.3, -bomb.radius * 0.3, bomb.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 引线
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -bomb.radius);
        this.ctx.lineTo(0, -bomb.radius * 1.5);
        this.ctx.stroke();
        
        // 火花效果
        const sparkle = Math.sin(bomb.animationTime) * 0.5 + 0.5;
        this.ctx.fillStyle = `rgba(255, 165, 0, ${sparkle})`;
        this.ctx.beginPath();
        this.ctx.arc(0, -bomb.radius * 1.5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawMapBounds() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        
        const bounds = {
            left: worldToScreen(0, 0, this.camera).x,
            top: worldToScreen(0, 0, this.camera).y,
            right: worldToScreen(this.mapSize, 0, this.camera).x,
            bottom: worldToScreen(0, this.mapSize, this.camera).y
        };
        
        this.ctx.beginPath();
        this.ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
}

// 游戏启动
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});

