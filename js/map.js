// 地图系统

class MapSystem {
    constructor() {
        this.maps = [];
        this.currentMapIndex = 0;
        this.portals = [];
        this.initializeMaps();
    }

    initializeMaps() {
        // 地图1：浅海区域
        this.maps.push({
            id: 1,
            name: '浅海区域',
            backgroundColor: ['#001a2e', '#003d5c', '#005577'],
            size: 2000,
            fishTypes: ['small', 'normal'],
            fishCount: 20,
            bombCount: 3,
            decorations: [
                { type: 'seaweed', x: 200, y: 1800, width: 50, height: 200 },
                { type: 'seaweed', x: 800, y: 1700, width: 60, height: 250 },
                { type: 'rock', x: 1500, y: 1600, radius: 80 },
                { type: 'coral', x: 300, y: 400, radius: 60 }
            ]
        });

        // 地图2：深海区域
        this.maps.push({
            id: 2,
            name: '深海区域',
            backgroundColor: ['#000d1a', '#001a33', '#002244'],
            size: 2500,
            fishTypes: ['normal', 'big', 'fast'],
            fishCount: 25,
            bombCount: 5,
            decorations: [
                { type: 'cave', x: 500, y: 2000, width: 200, height: 150 },
                { type: 'rock', x: 1200, y: 1800, radius: 120 },
                { type: 'rock', x: 2000, y: 1000, radius: 100 },
                { type: 'seaweed', x: 1800, y: 2200, width: 80, height: 300 }
            ]
        });

        // 地图3：深渊区域
        this.maps.push({
            id: 3,
            name: '深渊区域',
            backgroundColor: ['#000000', '#0a0a1a', '#1a1a2e'],
            size: 3000,
            fishTypes: ['big', 'fast'],
            fishCount: 30,
            bombCount: 8,
            decorations: [
                { type: 'abyss_rock', x: 1000, y: 2500, radius: 200 },
                { type: 'abyss_rock', x: 2200, y: 1800, radius: 150 },
                { type: 'volcanic_vent', x: 1500, y: 2800, radius: 100 },
                { type: 'bone', x: 800, y: 1200, width: 150, height: 50 }
            ]
        });

        // 初始化传送门
        this.initializePortals();
    }

    initializePortals() {
        // 地图1到地图2的传送门 - 远离边缘
        this.portals.push({
            fromMap: 1,
            toMap: 2,
            x: 1600, // 从1800移动到更安全的位置
            y: 1600, // 从1800移动到更安全的位置
            radius: 60,
            toX: 300, // 传送到更安全的位置
            toY: 300
        });

        // 地图2到地图1的传送门 - 远离边缘
        this.portals.push({
            fromMap: 2,
            toMap: 1,
            x: 300, // 保持在安全位置
            y: 300,
            radius: 60,
            toX: 1600, // 对应调整
            toY: 1600
        });

        // 地图2到地图3的传送门 - 远离边缘
        this.portals.push({
            fromMap: 2,
            toMap: 3,
            x: 2000, // 从2200移动到更安全的位置
            y: 2000, // 从2200移动到更安全的位置
            radius: 60,
            toX: 400, // 传送到更安全的位置
            toY: 400
        });

        // 地图3到地图2的传送门 - 远离边缘
        this.portals.push({
            fromMap: 3,
            toMap: 2,
            x: 400, // 从300移动到更安全的位置
            y: 400, // 从300移动到更安全的位置
            radius: 60,
            toX: 2000, // 对应调整
            toY: 2000
        });
    }

    getCurrentMap() {
        return this.maps[this.currentMapIndex];
    }

    getCurrentPortals() {
        const currentMapId = this.getCurrentMap().id;
        return this.portals.filter(portal => portal.fromMap === currentMapId);
    }

    checkPortalCollision(player) {
        const portals = this.getCurrentPortals();
        
        for (let portal of portals) {
            if (circleCollision(player.x, player.y, player.radius, portal.x, portal.y, portal.radius)) {
                return portal;
            }
        }
        
        return null;
    }

    teleportToMap(mapId, x, y, game) {
        // 找到目标地图索引
        const targetMapIndex = this.maps.findIndex(map => map.id === mapId);
        if (targetMapIndex === -1) return false;

        // 防止重复传送
        if (game.isTeleporting) return false;
        game.isTeleporting = true;

        // 保存玩家当前的移动速度
        const currentVx = game.player.vx;
        const currentVy = game.player.vy;

        // 切换地图
        this.currentMapIndex = targetMapIndex;
        const newMap = this.getCurrentMap();

        // 更新游戏状态
        game.currentMap = mapId;
        game.mapSize = newMap.size;

        // 移动玩家到新位置
        game.player.x = x;
        game.player.y = y;

        // 立即更新摄像头位置，避免视觉跳跃
        game.camera.x = x - game.canvas.width / 2;
        game.camera.y = y - game.canvas.height / 2;
        game.camera.targetX = game.camera.x;
        game.camera.targetY = game.camera.y;
        
        // 限制摄像头在地图边界内
        game.camera.x = Math.max(0, Math.min(game.camera.x, newMap.size - game.canvas.width));
        game.camera.y = Math.max(0, Math.min(game.camera.y, newMap.size - game.canvas.height));
        game.camera.targetX = game.camera.x;
        game.camera.targetY = game.camera.y;

        // 恢复玩家的移动速度（保持传送前的速度）
        game.player.vx = currentVx;
        game.player.vy = currentVy;

        // 激活传送后加速效果
        game.player.activateTeleportBoost();

        // 变换玩家鱼的外观
        this.transformPlayerFish(game.player, mapId);

        // 清除当前鱼群和炸弹
        game.fishes = [game.player];
        game.bombs = [];

        // 生成新地图的鱼群和炸弹
        this.generateMapContent(game);

        // 更新UI
        game.updateMapUI();

        // 创建传送特效
        if (game.particleSystem) {
            game.particleSystem.createExplosion(x, y, '#9966FF');
        }

        // 重置传送状态（延迟重置，防止立即再次传送）
        setTimeout(() => {
            game.isTeleporting = false;
        }, 1000); // 增加到1秒冷却时间，确保稳定

        // 额外保护：传送后短暂内无法再次传送
        game.lastTeleportTime = Date.now();

        console.log(`传送到地图 ${mapId}: ${newMap.name}`);
        return true;
    }

    transformPlayerFish(player, mapId) {
        // 根据地图改变玩家鱼的外观
        const transformations = {
            1: { color: '#00D4FF', type: 'normal' },    // 浅海：蓝色
            2: { color: '#FF6B6B', type: 'fast' },      // 深海：红色
            3: { color: '#9966FF', type: 'big' }        // 深渊：紫色
        };

        const transform = transformations[mapId];
        if (transform) {
            player.color = transform.color;
            player.type = transform.type;
            // 保持当前大小，只改变外观
        }
    }

    generateMapContent(game) {
        const currentMap = this.getCurrentMap();
        
        // 生成鱼群，确保有足够的小鱼供玩家吃掉
        const totalFish = currentMap.fishCount;
        const smallFishCount = Math.floor(totalFish * 0.6); // 60%的小鱼
        const normalFishCount = Math.floor(totalFish * 0.3); // 30%的普通鱼
        const bigFishCount = totalFish - smallFishCount - normalFishCount; // 剩余的大鱼
        
        // 生成小鱼（比玩家小）
        for (let i = 0; i < smallFishCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = random(50, currentMap.size - 50);
                y = random(50, currentMap.size - 50);
                attempts++;
            } while (distance(x, y, game.player.x, game.player.y) < 300 && attempts < 50);
            
            // 确保生成的鱼比玩家小
            const size = random(6, Math.max(8, game.player.size * 0.7));
            const fish = new Fish(x, y, size, 'small', false);
            game.fishes.push(fish);
        }
        
        // 生成普通大小的鱼
        for (let i = 0; i < normalFishCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = random(50, currentMap.size - 50);
                y = random(50, currentMap.size - 50);
                attempts++;
            } while (distance(x, y, game.player.x, game.player.y) < 300 && attempts < 50);
            
            const size = random(game.player.size * 0.8, game.player.size * 1.2);
            const type = currentMap.fishTypes[randomInt(0, currentMap.fishTypes.length - 1)];
            const fish = new Fish(x, y, size, type, false);
            game.fishes.push(fish);
        }
        
        // 生成大鱼（威胁）
        for (let i = 0; i < bigFishCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = random(50, currentMap.size - 50);
                y = random(50, currentMap.size - 50);
                attempts++;
            } while (distance(x, y, game.player.x, game.player.y) < 400 && attempts < 50);
            
            const size = random(game.player.size * 1.3, 35);
            const type = currentMap.fishTypes[randomInt(0, currentMap.fishTypes.length - 1)];
            const fish = new Fish(x, y, size, type, false);
            game.fishes.push(fish);
        }

        // 生成炸弹
        for (let i = 0; i < currentMap.bombCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = random(100, currentMap.size - 100);
                y = random(100, currentMap.size - 100);
                attempts++;
            } while (distance(x, y, game.player.x, game.player.y) < 400 && attempts < 50);
            
            game.bombs.push({
                x: x,
                y: y,
                radius: 15,
                animationTime: random(0, Math.PI * 2)
            });
        }
    }

    drawBackground(ctx, canvas, camera, gameTime) {
        const currentMap = this.getCurrentMap();
        
        // 绘制渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, currentMap.backgroundColor[0]);
        gradient.addColorStop(0.5, currentMap.backgroundColor[1]);
        gradient.addColorStop(1, currentMap.backgroundColor[2]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制水波纹效果
        this.drawWaterEffects(ctx, canvas, gameTime);

        // 绘制地图装饰
        this.drawDecorations(ctx, camera);
    }

    drawWaterEffects(ctx, canvas, gameTime) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 5; i++) {
            const y = (gameTime * 20 + i * 100) % (canvas.height + 100);
            ctx.beginPath();
            ctx.moveTo(0, y);
            
            for (let x = 0; x <= canvas.width; x += 20) {
                // 使用确定性的正弦波，避免随机数导致的闪烁
                const waveY = y + Math.sin((x + gameTime * 50) * 0.01 + i * 0.5) * 10;
                ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
    }

    drawDecorations(ctx, camera) {
        const currentMap = this.getCurrentMap();
        
        currentMap.decorations.forEach(decoration => {
            if (isInViewport(decoration.x, decoration.y, 100, camera, ctx.canvas)) {
                this.drawDecoration(ctx, decoration, camera);
            }
        });
    }

    drawDecoration(ctx, decoration, camera) {
        const screenPos = worldToScreen(decoration.x, decoration.y, camera);
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        
        switch (decoration.type) {
            case 'seaweed':
                this.drawSeaweed(ctx, decoration);
                break;
            case 'rock':
                this.drawRock(ctx, decoration);
                break;
            case 'coral':
                this.drawCoral(ctx, decoration);
                break;
            case 'cave':
                this.drawCave(ctx, decoration);
                break;
            case 'abyss_rock':
                this.drawAbyssRock(ctx, decoration);
                break;
            case 'volcanic_vent':
                this.drawVolcanicVent(ctx, decoration);
                break;
            case 'bone':
                this.drawBone(ctx, decoration);
                break;
        }
        
        ctx.restore();
    }

    drawSeaweed(ctx, decoration) {
        ctx.fillStyle = '#2E8B57';
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        
        // 绘制海草 - 使用确定性的波浪效果避免闪烁
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * decoration.width / 4;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            
            for (let y = 0; y <= decoration.height; y += 10) {
                // 使用装饰品位置创建确定性的波浪
                const waveX = x + Math.sin(y * 0.1 + decoration.x * 0.01 + i) * 10;
                ctx.lineTo(waveX, -y);
            }
            ctx.stroke();
        }
    }

    drawRock(ctx, decoration) {
        ctx.fillStyle = '#696969';
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(0, 0, decoration.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 添加纹理
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.arc(-decoration.radius * 0.3, -decoration.radius * 0.3, decoration.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCoral(ctx, decoration) {
        ctx.fillStyle = '#FF7F50';
        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 2;
        
        // 绘制珊瑚分支
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const length = decoration.radius * 0.8;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.stroke();
            
            // 分支
            const branchX = Math.cos(angle) * length * 0.7;
            const branchY = Math.sin(angle) * length * 0.7;
            ctx.beginPath();
            ctx.moveTo(branchX, branchY);
            ctx.lineTo(branchX + Math.cos(angle + 0.5) * 20, branchY + Math.sin(angle + 0.5) * 20);
            ctx.stroke();
        }
    }

    drawCave(ctx, decoration) {
        ctx.fillStyle = '#1C1C1C';
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.ellipse(0, 0, decoration.width / 2, decoration.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    drawAbyssRock(ctx, decoration) {
        ctx.fillStyle = '#2F2F2F';
        ctx.strokeStyle = '#1C1C1C';
        ctx.lineWidth = 4;
        
        // 绘制不规则岩石 - 使用确定性的形状避免闪烁
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            // 使用装饰品位置创建确定性的半径变化
            const radiusVariation = 0.8 + Math.sin(decoration.x * 0.01 + i) * 0.2;
            const radius = decoration.radius * radiusVariation;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    drawVolcanicVent(ctx, decoration) {
        ctx.fillStyle = '#8B0000';
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(0, 0, decoration.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 绘制火花效果 - 使用确定性的动画避免闪烁
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 5; i++) {
            // 使用装饰品的位置和索引创建确定性的火花位置
            const angle = (decoration.x + decoration.y + i) * 0.1;
            const distance = decoration.radius + 15 + (i * 3);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawBone(ctx, decoration) {
        ctx.fillStyle = '#F5F5DC';
        ctx.strokeStyle = '#D3D3D3';
        ctx.lineWidth = 2;
        
        // 绘制骨头
        ctx.beginPath();
        ctx.ellipse(0, 0, decoration.width / 2, decoration.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 骨头两端
        ctx.beginPath();
        ctx.arc(-decoration.width / 2, 0, decoration.height / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(decoration.width / 2, 0, decoration.height / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    drawPortals(ctx, camera) {
        const portals = this.getCurrentPortals();
        
        portals.forEach(portal => {
            if (isInViewport(portal.x, portal.y, portal.radius, camera, ctx.canvas)) {
                this.drawPortal(ctx, portal, camera);
            }
        });
    }

    drawPortal(ctx, portal, camera) {
        const screenPos = worldToScreen(portal.x, portal.y, camera);
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        
        // 绘制石头围成的圆圈
        ctx.fillStyle = '#696969';
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 4;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * portal.radius;
            const y = Math.sin(angle) * portal.radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // 绘制紫色光效
        const time = performance.now() * 0.003;
        const alpha = 0.5 + Math.sin(time) * 0.3;
        
        ctx.fillStyle = `rgba(153, 102, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制旋转的光圈
        ctx.strokeStyle = `rgba(204, 153, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = time * 50;
        
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.restore();
    }
}

