const HACKING = false;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const winnerDiv = document.getElementById('winner');

// Global Constants
const GRAVITY = 0.5;
const ARROW_GRAVITY = 0.15;
const MAX_CHARGE = 150;
const CHARGE_SPEED = 3;
const arrowTypes = ['default', 'teleport', 'explode', 'build'];


// Game Global Variables
let gameStarted = false;
let gameMode = 'menu'; // 'menu', 'local', 'bot', 'multiplayer'
let characters = [];
let localPlayerSlot = 0; // Index of the local browser entity in characters array
let isAutorestart = false;
let killDelay = 10;
let currentMatchMaxLives = 5;
let hitFreeze = 0;
let shake = 0;
let countdownActive = false;

// PeerJS Networking Variables
let peer = null;
let conn = null;
let isHost = false;

// Keyboard input tracking
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);
const sharedControls = { left: 'a', right: 'd', jump: 'w', down: 's', sword: 'k', bow: 'o', teleport: '2', default: '1', explode: '3', build: '4'}

// Arena Structure
const levels = [
    // Level 1: Your Original Arena (Balanced Platforms)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        { x: 150, y: 400, width: 250, height: 20, downable: true },
        { x: 624, y: 400, width: 250, height: 20, downable: true },
        { x: 387, y: 290, width: 250, height: 20, downable: true },
        { x: 50, y: 250, width: 150, height: 20, downable: true },
        { x: 824, y: 250, width: 150, height: 20, downable: true },
    ],
    // Level 2: The Hourglass (Central Chokepoint)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        { x: 50, y: 420, width: 300, height: 20, downable: true },
        { x: 674, y: 420, width: 300, height: 20, downable: true },
        { x: 362, y: 300, width: 300, height: 20, downable: true },
        { x: 150, y: 180, width: 200, height: 20, downable: true },
        { x: 674, y: 180, width: 200, height: 20, downable: true },
    ],
    // Level 3: Vertical Spires (Sniper Towers on the flanks)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        { x: 100, y: 410, width: 120, height: 20, downable: true },
        { x: 100, y: 280, width: 120, height: 20, downable: true },
        { x: 804, y: 410, width: 120, height: 20, downable: true },
        { x: 804, y: 280, width: 120, height: 20, downable: true },
        { x: 362, y: 340, width: 300, height: 20, downable: true },
        { x: 462, y: 200, width: 100, height: 20, downable: true },
    ],
    // Level 4: The Colosseum (Stepped tiers on both sides)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        { x: 0, y: 430, width: 200, height: 20, downable: false },
        { x: 0, y: 320, width: 150, height: 20, downable: false },
        { x: 0, y: 210, width: 100, height: 20, downable: false },
        { x: 824, y: 430, width: 200, height: 20, downable: false },
        { x: 874, y: 320, width: 150, height: 20, downable: false },
        { x: 924, y: 210, width: 100, height: 20, downable: false },
        { x: 312, y: 260, width: 150, height: 20, downable: true },
        { x: 562, y: 260, width: 150, height: 20, downable: true },
    ],
    // Level 5: Grid Lockdown (An ordered matrix of platforms)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        { x: 80, y: 420, width: 180, height: 20, downable: true },
        { x: 422, y: 420, width: 180, height: 20, downable: true },
        { x: 764, y: 420, width: 180, height: 20, downable: true },
        { x: 251, y: 260, width: 180, height: 20, downable: true },
        { x: 593, y: 260, width: 180, height: 20, downable: true },
    ],
    // Level 6: The Pit (Large gap in the solid floor)
    [
        { x: 0, y: 536, width: 350, height: 40, downable: false },
        { x: 674, y: 536, width: 350, height: 40, downable: false },
        { x: 412, y: 430, width: 200, height: 20, downable: true },
        { x: 150, y: 310, width: 200, height: 20, downable: true },
        { x: 674, y: 310, width: 200, height: 20, downable: true },
        { x: 387, y: 190, width: 250, height: 20, downable: true },
    ],
    // Level 7: The Twin Cottages (Two hollow houses you can go inside or jump on top of)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Left House: Walls & Floor
        { x: 100, y: 360, width: 20, height: 190, downable: false }, // Left wall
        { x: 260, y: 360, width: 20, height: 190, downable: false }, // Right wall
        { x: 120, y: 450, width: 140, height: 15, downable: true },  // Second floor inside
        // Left House: Stepped Triangular Roof
        { x: 80, y: 360, width: 220, height: 20, downable: false },  // Roof Base
        { x: 110, y: 330, width: 160, height: 30, downable: false }, // Roof Mid
        { x: 150, y: 300, width: 80, height: 30, downable: false },  // Roof Peak

        // Right House: Walls & Floor
        { x: 744, y: 360, width: 20, height: 190, downable: false }, 
        { x: 904, y: 360, width: 20, height: 190, downable: false }, 
        { x: 764, y: 450, width: 140, height: 15, downable: true },  
        // Right House: Stepped Triangular Roof
        { x: 724, y: 360, width: 220, height: 20, downable: false }, 
        { x: 754, y: 330, width: 160, height: 30, downable: false }, 
        { x: 794, y: 300, width: 80, height: 30, downable: false },

        // Center connecting courtyard bridge
        { x: 387, y: 220, width: 250, height: 20, downable: true }
    ],
    // Level 8: Windmill Ridge (A tall central tower with offset platforms representing blades)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Main Windmill Tower body
        { x: 462, y: 220, width: 100, height: 320, downable: false }, // Heavy central block
        { x: 432, y: 200, width: 160, height: 20, downable: false },  // Windmill cap roof
        
        // Blade Platforms (Simulating cross sails at different angles/heights)
        { x: 262, y: 290, width: 200, height: 15, downable: true },  // Left horizontal blade
        { x: 562, y: 290, width: 200, height: 15, downable: true },  // Right horizontal blade
        { x: 392, y: 120, width: 70, height: 15, downable: true },   // Upper left angled blade perch
        { x: 562, y: 120, width: 70, height: 15, downable: true },   // Upper right angled blade perch

        // Side auxiliary hills to reach the blades
        { x: 50, y: 410, width: 160, height: 20, downable: true },
        { x: 814, y: 410, width: 160, height: 20, downable: true }
    ],
    // Level 9: Broken Clocktower (Ruins with a large high platform and crumbling inner steps)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Left Support Pier
        { x: 120, y: 250, width: 40, height: 290, downable: false },
        // Right Support Pier
        { x: 864, y: 250, width: 40, height: 290, downable: false },
        // Massive High Roof / Archway span
        { x: 120, y: 230, width: 784, height: 25, downable: false },
        
        // Crumbling interior steps (Hollow area inside the arch)
        { x: 220, y: 440, width: 100, height: 15, downable: true },
        { x: 360, y: 370, width: 100, height: 15, downable: true },
        { x: 564, y: 370, width: 100, height: 15, downable: true },
        { x: 704, y: 440, width: 100, height: 15, downable: true },
        
        // Top Spire platform on the very center of the roof
        { x: 462, y: 140, width: 100, height: 90, downable: false }
    ],
    // Level 10: The Multi-Story Apartment (A huge grid of nested rooms and walls)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Ground level interior partitions
        { x: 300, y: 410, width: 20, height: 130, downable: false },
        { x: 704, y: 410, width: 20, height: 130, downable: false },
        
        // Level 2 Floor
        { x: 150, y: 410, width: 724, height: 20, downable: false },
        // Level 2 partitions
        { x: 440, y: 280, width: 20, height: 130, downable: false },
        { x: 564, y: 280, width: 20, height: 130, downable: false },
        
        // Level 3 Floor
        { x: 250, y: 280, width: 524, height: 20, downable: false },
        // Outer balconies
        { x: 50, y: 320, width: 100, height: 15, downable: true },
        { x: 874, y: 320, width: 100, height: 15, downable: true }
    ],
    // Level 11: The Subterranean Lava Trench (Hazardous central pit with floating islands)
    [
        { x: 0, y: 536, width: 250, height: 40, downable: false },
        // Lava Hazard in the center floor
        { x: 250, y: 546, width: 524, height: 30, downable: false, kill: true }, 
        { x: 774, y: 536, width: 250, height: 40, downable: false },
        
        // Floating safety steps above the lava
        { x: 312, y: 420, width: 120, height: 20, downable: true },
        { x: 592, y: 420, width: 120, height: 20, downable: true },
        { x: 437, y: 300, width: 150, height: 20, downable: true },
        
        // Side escape ledges
        { x: 80, y: 330, width: 120, height: 20, downable: true },
        { x: 824, y: 330, width: 120, height: 20, downable: true }
    ],
    // Level 12: Electric Gridlock (Alternating floors and ceiling hazard)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Dangerous central electric barrier on the ground
        { x: 412, y: 506, width: 200, height: 30, downable: false, kill: true },
        
        // Tier 1 side platforms
        { x: 120, y: 400, width: 220, height: 20, downable: true },
        { x: 684, y: 400, width: 220, height: 20, downable: true },
        
        // Tier 2 Center safety bridge with hazard hot spots on its edges
        { x: 312, y: 280, width: 50, height: 20, downable: false, kill: true },
        { x: 362, y: 280, width: 300, height: 20, downable: true },
        { x: 662, y: 280, width: 50, height: 20, downable: false, kill: true },
        
        // Top sniper perches
        { x: 180, y: 160, width: 120, height: 20, downable: true },
        { x: 724, y: 160, width: 120, height: 20, downable: true }
    ],
    // Level 13: Spike-Drop Chamber (High drops with localized death zones)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Two localized spike pits flanking the center
        { x: 200, y: 521, width: 100, height: 15, downable: false, kill: true },
        { x: 724, y: 521, width: 100, height: 15, downable: false, kill: true },
        
        // Overhead shields protecting from straight falls into spikes
        { x: 150, y: 390, width: 200, height: 20, downable: true },
        { x: 674, y: 390, width: 200, height: 20, downable: true },
        
        // Main structural core in the center
        { x: 437, y: 270, width: 150, height: 20, downable: false },
        { x: 487, y: 150, width: 50, height: 120, downable: false }
    ],
    // Level 14: The Acid Factory (Divided chambers with toxic waste pipes)
    [
        { x: 0, y: 536, width: 1024, height: 40, downable: false },
        // Giant vertical dividing walls forming a central waste zone
        { x: 320, y: 250, width: 30, height: 286, downable: false },
        { x: 674, y: 250, width: 30, height: 286, downable: false },
        
        // Acid pool trapped between the two interior walls
        { x: 350, y: 521, width: 324, height: 15, downable: false, kill: true },
        
        // Left Chamber steps
        { x: 0, y: 400, width: 150, height: 20, downable: true },
        { x: 170, y: 290, width: 150, height: 20, downable: true },
        
        // Right Chamber steps
        { x: 874, y: 400, width: 150, height: 20, downable: true },
        { x: 704, y: 290, width: 150, height: 20, downable: true },
        
        // High risk catwalk directly over the acid pool
        { x: 412, y: 210, width: 200, height: 20, downable: true }
    ],
    // Level 15: Sky Gauntlet (No ground safety net, pure platforming hazard)
    [
        // The floor is completely covered in lasers/spikes—touching the bottom is death
        { x: 0, y: 536, width: 1024, height: 40, downable: false, kill: true },
        
        // Left and Right safe spawn bases
        { x: 0, y: 420, width: 150, height: 30, downable: false },
        { x: 874, y: 420, width: 150, height: 30, downable: false },
        
        // The climbing matrix
        { x: 220, y: 330, width: 140, height: 20, downable: true },
        { x: 664, y: 330, width: 140, height: 20, downable: true },
        
        // Dangerous central hot plate blocking the short path
        { x: 462, y: 260, width: 100, height: 20, downable: false, kill: true },
        
        // Upper escape routes
        { x: 312, y: 160, width: 120, height: 20, downable: true },
        { x: 592, y: 160, width: 120, height: 20, downable: true }
    ],
];

let level;

function chooseRandomLevel(forcedIndex = null) {
    let index = forcedIndex !== null ? forcedIndex : Math.floor(Math.random() * levels.length);
    level = levels[index];

    return index;
}

chooseRandomLevel();

let existingArrows = [];

class Arrow {
    constructor(x, y, vx, vy, ownerId, width, height, type = 'default') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ownerId = ownerId;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    move(i) {
        this.vy += ARROW_GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        this.draw();

        let hitPlatform = false;
        for (let plat of level) {
            if (this.x < plat.x + plat.width && this.x + this.width > plat.x &&
                this.y < plat.y + plat.height && this.y + this.height > plat.y) {
                hitPlatform = true;
                break;
            }
        }

        let hitTarget = false;
        for (let target of characters) {
            if (this.type !== 'build') {
                if (!target.isDead) {
                    if (this.x < target.x + target.width &&
                        this.x + this.width > target.x &&
                        this.y < target.y + target.height &&
                        this.y + this.height > target.y) {
                
                        // In multiplayer mode, only the host registers target damage to maintain consistency
                        if (gameMode !== 'multiplayer' || isHost) {
                            target.takeDamage();
                        }
                        hitTarget = true;
                    
                        const owner = characters.find(c => c.id === this.ownerId);
                        if (owner) owner.kills++;

                        updateUI();

                        break;
                    }
                }
            }
        }

        if (hitPlatform || hitTarget || this.x < 0 || this.x > canvas.width || this.y > canvas.height) {
            if (this.type === 'teleport') {
                const owner = characters.find(c => c.id === this.ownerId);
                if (owner) {
                    let targetX = this.x - owner.width / 2;
                    let targetY = this.y - owner.height / 2;

                    if (targetX < 0) targetX = 0;
                    if (targetX + owner.width > canvas.width) targetX = canvas.width - owner.width;
                    if (targetY < 0) targetY = 0;

                    for (let plat of level) {
                        if (targetX < plat.x + plat.width &&
                            targetX + owner.width > plat.x &&
                            targetY < plat.y + plat.height &&
                            targetY + owner.height > plat.y) {
                            targetY = plat.y - owner.height;
                        }
                    }

                    owner.x = targetX;
                    owner.y = targetY;
                    owner.vx = 0;
                    owner.vy = 0;
                }
            }

            else if (this.type === 'explode') {
                let new_platform = {
                    x: this.x - 30,
                    y: this.y - 30,
                    width: 60,
                    height: 60,
                    downable: false,
                    kill: true,
                    removeDelay: 200,
                    owner: characters.find(c => c.id === this.ownerId),
                };

                level.push(new_platform);
            }

            else if (this.type === 'build') {
                let new_platform = {
                    x: this.x - 40,
                    y: this.y - 55,
                    width: 80,
                    height: 60,
                    downable: true,
                    removeDelay: 150
                };

                level.push(new_platform);
            }

            existingArrows.splice(i, 1);
        }
    }

    draw() {
        
        switch (this.type) {
            case 'teleport':
                ctx.fillStyle = '#9b59b6';
                break;
            case 'explode':
                ctx.fillStyle = '#ffb039';
                break;
            default:
                ctx.fillStyle = '#ecf0f1';
                break;
        }

        ctx.globalAlpha = 0.2;
        ctx.fillRect(
            this.x - this.vx * 2,
            this.y - this.vy * 2,
            this.width,
            this.height
        );

        ctx.globalAlpha = 1;

        ctx.fillRect(
            this.x,
            this.y,
            this.width,
            this.height
        );
    }
}

class Character {
    constructor(x, y, color, id) {
        this.id = id;
        this.startX = x; 
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        this.kills = 0;
        
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = 12;
        this.grounded = false;
        this.direction = x < canvas.width / 2 ? 1 : -1;

        this.lives = currentMatchMaxLives;
        this.isAttackingSword = false;
        this.currentSwordDelay = 0;
        this.swordTimer = 0;
        this.isChargingBow = false;
        this.bowCharge = 0;
        this.isDead = false;
        this.respawnTimer = 0;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;
        this.invuln = 0;
    } 

    shootArrow() {
        let power = (this.bowCharge / MAX_CHARGE) * 15 + 5;
        const arrowData = {
            x: this.direction === 1 ? this.x + this.width : this.x - 15,
            y: this.y + this.height / 2 - 2,
            vx: this.direction * power,
            vy: -power * 0.15,
            ownerId: this.id,
            width: 15,
            height:4,
            type:this.chosenArrow,
        }
        existingArrows.push(new Arrow(
            this.direction === 1 ? this.x + this.width : this.x - 15,
            this.y + this.height / 2 - 2,
            this.direction * power,
            -power * 0.15,
            this.id,
            15,
            4,
            this.chosenArrow,
        ));

        if (gameMode === 'multiplayer' && conn && conn.open) {
            conn.send({ type: 'projectile', data: arrowData });
        }
    }

    handleCollisions() {
        this.grounded = false;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        for (let plat of level) {
            if (plat.kill) {
                let isInside = this.x < plat.x + plat.width &&
                            this.x + this.width > plat.x &&
                            this.y < plat.y + plat.height &&
                            this.y + this.height > plat.y;
                
                if (isInside) {
                    if (plat.owner) plat.owner.kills++;
                    this.takeDamage();
                    return; 
                }
            }

            if ((HACKING || plat.downable) && this.isPressingDown) continue;
            if (this.x <= plat.x + plat.width &&
                this.x + this.width >= plat.x &&
                this.y + this.height >= plat.y &&
                this.y + this.height - this.vy <= plat.y + 10 &&
                this.vy >= 0) {
            
                this.y = plat.y - this.height;
                this.vy = 0;
                this.grounded = true;
            }
        }

        if (this.y > canvas.height) {
            this.takeDamage();
        }
    }

    takeDamage() {
        if (this.invuln > 0) return;

        this.lives--;
        this.isDead = true;
        this.respawnTimer = 90;
        hitFreeze = 6;
        shake = 12;
        updateUI();

        if (gameMode === 'multiplayer' && conn && conn.open) {
            conn.send({ type: 'life_update', id: this.id, lives: this.lives });
        }
    }

    respawn() {
        this.isDead = false;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 200) + 50;
        this.vx = 0;
        this.vy = 0;
        this.invuln = 120;
    }

    draw() {
        if (this.isDead) return;

        let playerHidden = false;

        if (this.invuln > 0) {
            this.invuln--;

            if (Math.floor(this.invuln / 10) % 2 === 0) {
                playerHidden = true;
            }
        }

        if (!playerHidden) {
            
            if (gameMode === 'bot' && characters[localPlayerSlot] === this) {
                ctx.fillStyle = '#fffb00';
                ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
            }

            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        

            ctx.fillStyle = '#fff';
            let eyeX = this.direction === 1 ? this.x + this.width - 8 : this.x + 3;
            ctx.fillRect(eyeX, this.y + 8, 5, 5);

        }

        if (this.isAttackingSword) {
            ctx.fillStyle = '#f1c40f';
            let swordX = this.direction === 1 ? this.x + this.width : this.x - 20;
            ctx.fillRect(swordX, this.y + 15, 20, 10);
        }

        if (this.isChargingBow) {
            ctx.strokeStyle = '#e67e22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            let bowX = this.direction === 1 ? this.x + this.width + 5 : this.x - 5;
            ctx.arc(bowX, this.y + this.height/2, 12, -Math.PI/2, Math.PI/2, this.direction === -1);
            ctx.stroke();
        }

        ctx.textAlign = 'center';
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ff4757';
        let livesText = '❤'.repeat(Math.max(0, this.lives));
        
        ctx.fillText(livesText, this.x + this.width / 2, this.y - 30);

        ctx.font = '15px Arial';
        ctx.fillStyle = '#ff0015';
        let killsText = "Kills: " + this.kills;
        ctx.fillText(killsText, this.x + this.width / 2, this.y - 50);

        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffffff';
        let arrowText = `Arrow: ${this.chosenArrow}`;
        
        ctx.fillText(arrowText, this.x + this.width / 2, this.y - 18);

        if (this.isChargingBow && this.bowCharge > 0) {
            let barWidth = 30;
            let barHeight = 4;
            let barX = this.x + (this.width - barWidth) / 2;
            let barY = this.y - 8; // Placed 8 pixels above the player's head

            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = '#e67e22';
            let currentChargeWidth = (this.bowCharge / MAX_CHARGE) * barWidth;
            ctx.fillRect(barX, barY, currentChargeWidth, barHeight);
        }
    }
}

class Player extends Character {
    constructor(x, y, color, controls, id) {
        super(x, y, color, id);

        this.controls = controls;

        this.chosenArrow = 'default';
        this.isPressingDown = false;
    }

    update() {
        if (!gameStarted) return;

        if (this.isDead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0 && this.lives > 0) {
                this.respawn();
            }
            return;
        }

        this.vy += GRAVITY;
        this.isPressingDown = false;
        
        this.accel = 2;
        this.friction = 0.85;

        if (keys[this.controls.left]) {
            this.vx -= this.accel;
            this.direction = -1;
        }

        if (keys[this.controls.right]) {
            this.vx += this.accel;
            this.direction = 1;
        }

        this.vx *= this.friction;

        if (Math.abs(this.vx) < 0.1) {
            this.vx = 0;
        }

        this.vx = Math.max(
            -this.speed,
            Math.min(this.speed, this.vx)
        );

        if (this.grounded) {
            this.coyoteTime = 8;
        } else {
            this.coyoteTime--;
        }

        if (keys[this.controls.jump]) {
            this.jumpBuffer = 8;
        } else {
            this.jumpBuffer--;
        }

        if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
            this.vy = -this.jumpForce;

            this.grounded = false;
            this.jumpBuffer = 0;
            this.coyoteTime = 0;
        }

        if (keys[this.controls.down]) {
            this.isPressingDown = true;
        }

        if (keys[this.controls.sword] && this.swordTimer <= 0 && !this.isChargingBow) {
            this.isAttackingSword = true;
            this.swordTimer = 72; // 0.5s active (30 frames) + 0.7s cooldown (42 frames) = 72 frames total
        }

        // Manage sword timer tracking
        if (this.swordTimer > 0) {
            this.swordTimer--;
            if (this.swordTimer <= 42) {
                this.isAttackingSword = false;
            }
        }
        // ----------------------------------

        if (keys[this.controls.bow] && !this.isAttackingSword) {
            this.isChargingBow = true;
            if (this.bowCharge < MAX_CHARGE) {
                this.bowCharge += CHARGE_SPEED;
            }
        } else if (this.isChargingBow) {
            this.shootArrow();
            this.isChargingBow = false;
            this.bowCharge = 0;
        }

        if (keys[this.controls.default]) {
            this.chosenArrow = 'default';
        } else if (keys[this.controls.teleport]) {
            this.chosenArrow = 'teleport';
        } else if (keys[this.controls.explode]) {
            this.chosenArrow = 'explode';
        } else if (keys[this.controls.build]) {
            this.chosenArrow = 'build';
        }

        const chosenArrowDiv = document.getElementById('chosen-arrow');
        if (chosenArrowDiv && this.id === characters[localPlayerSlot].id) {
            chosenArrowDiv.innerHTML = this.chosenArrow;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.handleCollisions();
    }
}

// Keep your original Bot logic perfectly intact
class Bot extends Character  {
    constructor(x, y, color, id) {
        super(x, y, color, id);

        this.currentMoveDelay = 0;
        this.moveDelay = 20;
        this.simulataneousMoves = 2;
        this.swordDelay = 5;

        this.moves = [];
        for (let i = 0; i < this.simulataneousMoves; i++) {
            this.moves.push(0);
        }
        this.targetCharacter = undefined;
        this.chosenArrow = 'default';
    }

    update(characters) {
        if (!gameStarted) return;

        if (this.isDead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0 && this.lives > 0) {
                this.respawn();
            }
            return;
        }
        
        this.vy += GRAVITY;
        this.vx = 0;
        
        if (this.currentMoveDelay > this.moveDelay) {
            this.currentMoveDelay = 0;
            this.moves = [];

            this.targetCharacter = characters.filter(c => this.id !== c.id)[Math.floor(Math.random() * (characters.length - 1))];

            while (this.moves.length <= this.simulataneousMoves){
                const move = Math.floor(Math.random() * 6);
                let alreadyUsedMove = false;
                
                this.moves.forEach(m => {
                    if (m === move) alreadyUsedMove = true;
                    else {
                        if (move === 1) {
                            if (this.targetCharacter && (this.targetCharacter.x > this.x)) {
                                this.chosenDirection = 1
                            } else {
                                this.chosenDirection = -1;
                            }
                        }

                        if (move === 3) {
                            this.chosenArrow = arrowTypes[Math.floor(Math.random() * arrowTypes.length)];
                        }
                    }
                });

                if (!alreadyUsedMove) this.moves.push(move);
            }
        } else {
            this.currentMoveDelay++;
        }

        for (let i = 0; i < this.simulataneousMoves; i++) {
            const move = this.moves[i];
            switch (move) {
                case 0:
                    if (this.chosenDirection === 1) {
                        this.vx = this.speed;
                        this.direction = 1;
                    } else {
                        this.vx = -this.speed;
                        this.direction = -1;
                    }
                    break;
                case 1:
                    if (this.grounded) {
                        this.vy = -this.jumpForce;
                        this.grounded = false;
                    }
                    break;
                case 2:
                    if (!this.isAttackingSword && !this.isChargingBow) {
                        this.isAttackingSword = true;
                        this.swordTimer = 15;
                    }
                    break;
                case 3:
                    if (!this.isAttackingSword) {
                        this.isChargingBow = true;
                    }
                    break;
                case 4:
                    this.isPressingDown = true;
                    break;
            }
            if (move !== 4) this.isPressingDown = false;
        }
            
        if (this.isAttackingSword) {
            if (this.currentSwordDelay < this.swordDelay) {
                this.currentSwordDelay++;
            } else {
                this.currentSwordDelay = 0;
                this.swordTimer--;
                if (this.swordTimer <= 0) this.isAttackingSword = false;
            }
        }

        if (this.isChargingBow) {
            if (this.bowCharge < MAX_CHARGE) {
                this.bowCharge += CHARGE_SPEED;
            } else {
                this.shootArrow();
                this.isChargingBow = false;
                this.bowCharge = 0;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        this.handleCollisions();
    }
}

// Game Mode Setup Options
function startBotGame() {
    gameMode = 'bot';
    localPlayerSlot = 0;
    gameStarted = false;

    startCountdown(() => {
        gameStarted = true;
    });
    
    // Grab the custom starting lives right as the game triggers
    const livesInput = document.getElementById('lives-picker');
    currentMatchMaxLives = livesInput ? parseInt(livesInput.value, 10) : 5;
    
    characters = [
        new Player(100, 300, '#3498db', sharedControls, 1),
        new Bot(880, 300, '#e74c3c', 2),
        new Bot(580, 300, '#3ce745', 3),
        new Bot(300, 300, '#dc3ce7', 4),
    ];
    
    // Override standard instance defaults with selected settings
    
    characters.forEach(c => {
        c.lives = currentMatchMaxLives;
    })
    
    updateUI();
}

function startLocalGame() {
    gameMode = 'local';
    localPlayerSlot = 0;
    gameStarted = false;

    startCountdown(() => {
        gameStarted = true;
    }); 
    
    // Grab the custom starting lives right as the game triggers
    const livesInput = document.getElementById('lives-picker');
    currentMatchMaxLives = livesInput ? parseInt(livesInput.value, 10) : 5;
    
    characters = [
        new Player(100, 300, '#3498db', { left: 'a', right: 'd', jump: 'w', down: 's', sword: 'x', bow: 'c', teleport: '2', default: '1', explode: '3', build: '4'}, 1),
        new Player(800, 300, '#c5db34', { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', sword: '.', bow: '/', teleport: '\'', default: '#', explode: ';', build: 'l'}, 2),
    ];
    
    // Override standard instance defaults with selected settings
    
    characters.forEach(c => {
        c.lives = currentMatchMaxLives;
    })
    
    updateUI();
}

function startMultiplayerGame(hostFlag) {
    gameMode = 'multiplayer';
    isHost = hostFlag;

    const statusEl = document.getElementById('multiplayer-status');
    if (statusEl) statusEl.innerText = "Connecting to matchmaking server...";

    // Get the room input value from your HTML interface
    const roomInput = document.getElementById('room-code-input');
    let roomName = roomInput ? roomInput.value.trim() : "";

    if (isHost) {
        if (!roomName) {
            roomName = "fihter-" + Math.floor(1000 + Math.random() * 9000);
        }
        
        peer = new Peer(roomName);

        
        peer.on('open', (id) => {
            if (statusEl) {
                statusEl.innerHTML = `Lobby created!<br><strong>Share this code to invite a friend: ${id}</strong><br>Waiting for player...`;
            }
        });

        
        peer.on('connection', (connection) => {
            const statusEl = document.getElementById('multiplayer-status');

            if (conn && conn.open) {
                connection.send({
                    type: 'room_full'
                });

                connection.close();

                if (statusEl) {
                    statusEl.innerText =
                        "Join attempt rejected (match already occupied).";
                }

                return;
            }

            conn = connection;

            conn.on('close', () => {
                conn = null;

                if (gameMode === 'multiplayer') {
                    gameStarted = false;

                    if (statusEl) {
                        statusEl.innerText =
                            "Opponent disconnected. Waiting for player...";
                    }
                }
            });

            setupNetworkEvents();
        });

    } else {
        // Clients need an exact room name to join
        if (!roomName) {
            if (statusEl) statusEl.innerText = "Error: Please enter a Room Code to join.";
            return;
        }

        peer = new Peer(); // Client gets a random session ID
        
        peer.on('open', (id) => {
            if (statusEl) statusEl.innerText = `Connecting to lobby: ${roomName}...`;
            conn = peer.connect(roomName);
            setupNetworkEvents();
        });
    }

    peer.on('error', (err) => {
        if (statusEl) {
            if (err.type === 'unavailable-id') {
                statusEl.innerText = "Lobby code is already taken! Try another code.";
            } else if (err.type === 'peer-not-found') {
                statusEl.innerText = "Room not found. Check the code and try again.";
            } else {
                statusEl.innerText = "Connection error: " + err.type;
            }
        }
        console.error(err);
    });
}

function setupNetworkEvents() {
    conn.on('open', () => {
        const statusEl = document.getElementById('multiplayer-status');
        if (statusEl) statusEl.innerText = "Connected! Starting game...";
        
        const livesInput = document.getElementById('lives-picker');
        currentMatchMaxLives = livesInput ? parseInt(livesInput.value, 10) : 5;
        
        if (isHost) {
            localPlayerSlot = 0;
            characters = [
                new Player(100, 300, '#3498db', sharedControls, 1),
                new Player(880, 300, '#e74c3c', {}, 2)
            ];
            
            const chosenIndex = chooseRandomLevel(); 
            conn.send({ 
                type: 'sync_match_settings', 
                lives: currentMatchMaxLives, 
                levelIndex: chosenIndex 
            });
        } else {
            localPlayerSlot = 1;
            characters = [
                new Player(100, 300, '#3498db', {}, 1),
                new Player(880, 300, '#e74c3c', sharedControls, 2)
            ];
        }
        
        characters[0].lives = currentMatchMaxLives;
        characters[1].lives = currentMatchMaxLives;
        
        gameStarted = false;

        startCountdown(() => {
            gameStarted = true;
        });

        updateUI();
    });

    conn.on('data', (payload) => {
        if (payload.type === 'sync_match_settings') {
            currentMatchMaxLives = payload.lives;

            chooseRandomLevel(payload.levelIndex);

            if (characters[0]) characters[0].lives = currentMatchMaxLives;
            if (characters[1]) characters[1].lives = currentMatchMaxLives;

            updateUI();
            return;
        }

        if (!gameStarted) return;
        
        const remoteSlot = localPlayerSlot === 0 ? 1 : 0;
        
        if (payload.type === 'state') {
            if (characters[remoteSlot]) {
                characters[remoteSlot].x = payload.x;
                characters[remoteSlot].y = payload.y;
                characters[remoteSlot].direction = payload.direction;
                characters[remoteSlot].isAttackingSword = payload.isAttackingSword;
                characters[remoteSlot].isChargingBow = payload.isChargingBow;
                characters[remoteSlot].bowCharge = payload.bowCharge;
                characters[remoteSlot].isDead = payload.isDead; 
                characters[remoteSlot].chosenArrow = payload.chosenArrow;
                characters[remoteSlot].kills = payload.kills;
            }
        } 
        else if (payload.type === 'projectile') {
            existingArrows.push(new Arrow(
                payload.data.x, payload.data.y, payload.data.vx, payload.data.vy,
                payload.data.ownerId, payload.data.width, payload.data.height, payload.data.type
            ));
        }
        else if (payload.type === 'life_update') {
            const targetChar = characters.find(c => c.id === payload.id);
            if (targetChar) {
                targetChar.lives = payload.lives;
                targetChar.isDead = true;
                targetChar.respawnTimer = 90;
                updateUI();
            }
        } else if (payload.type === 'restart') {
            existingArrows = [];

            currentMatchMaxLives = payload.lives;

            chooseRandomLevel(payload.levelIndex);

            characters.forEach((c, i) => {
                c.lives = currentMatchMaxLives;
                c.kills = 0;
                c.isDead = false;

                c.x = i === 0 ? 100 : 880;
                c.y = 300;

                c.vx = 0;
                c.vy = 0;
            });

            gameStarted = true;

            document.getElementById('game-status').innerText = "BATTLE!";

            updateUI();
        }
    });
}

function updateUI() {
    let p;

    if (gameMode === 'bot' || gameMode === 'local') {
        p = characters[0];
    } else if (gameMode === 'multiplayer') {
        p = characters[localPlayerSlot];
    }
    const livesEl = document.getElementById(`lives`);
    const chargeEl = document.getElementById(`charge`);
    const killEl = document.getElementById(`kill-counter`);
    const idEl = document.getElementById('player-id');
    
    if (livesEl) livesEl.innerText = '❤'.repeat(Math.max(0, p.lives)) || 'DEAD';
    if (chargeEl) chargeEl.style.width = p.bowCharge + '%';
    if (killEl) killEl.innerText = "Kills: " + p.kills;
    if (idEl) idEl.innerText = p.id;

    const activePlayers = characters.filter(p => p.lives > 0);
    if (gameStarted && activePlayers.length <= 1) {
        if (activePlayers.length === 1) {
            document.getElementById('game-status').innerText = `PLAYER ${activePlayers[0].id} WINS!`;
            winner = activePlayers[0];
        } else if (activePlayers.length === 0) {
            document.getElementById('game-status').innerText = "MUTUAL DESTRUCTION!";
        }
    }
}

function processArrows() {
    for (let i = existingArrows.length - 1; i >= 0; i--) {
        existingArrows[i].move(i);
    }
}

function checkSwordCollisions() {
    for (let attacker of characters) {
        if (!attacker.isAttackingSword || attacker.isDead) continue;

        let swordX = attacker.direction === 1 ? attacker.x + attacker.width : attacker.x - 20;

        for (let target of characters) {
            if (attacker.id === target.id || target.isDead) continue;

            if (swordX < target.x + target.width && swordX + 20 > target.x &&
                attacker.y + 15 < target.y + target.height && attacker.y + 25 > target.y) {
                
                if (gameMode !== 'multiplayer' || isHost) {
                    target.takeDamage();
                    if (attacker.kills) attacker.kills++;
                }
                attacker.isAttackingSword = false; 
                break; 
            }
        }
    }
}


function gameLoop() {
    if (hitFreeze > 0) {
        hitFreeze--;

        requestAnimationFrame(gameLoop);

        return;
    }

    ctx.save();

    if (shake > 0) {
        shake--;

        ctx.translate(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
        );
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the synchronized map layout
    for (let plat of level) {
        ctx.fillStyle = plat.downable ? '#ffb9b9' : plat.kill ? '#ff8746' : '#7f8c8d';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        if (plat.removeDelay !== undefined) {
            plat.removeDelay--;
        }
    }
    level = level.filter(plat => plat.removeDelay === undefined || plat.removeDelay > 0);

    if (running()) {
        // Run full physics/controls updates for the locally controlled entity slot
        characters[localPlayerSlot].update();

        if (gameMode === 'bot' || gameMode === 'local') {
            characters.slice(1).forEach(e => { e.update(characters); });
        }
        else if (gameMode === 'multiplayer') {
            const remoteSlot = localPlayerSlot === 0 ? 1 : 0;
            if (characters[remoteSlot] && characters[remoteSlot].isDead) {
                characters[remoteSlot].respawnTimer--;
                if (characters[remoteSlot].respawnTimer <= 0 && characters[remoteSlot].lives > 0) {
                    characters[remoteSlot].isDead = false; // Soft reset until next authoritative update
                }
            }
            
            // Broadcast your local data packet
            if (conn && conn.open) {
                const myState = characters[localPlayerSlot];
                conn.send({
                    type: 'state',
                    x: myState.x,
                    y: myState.y,
                    direction: myState.direction,
                    isAttackingSword: HACKING ? true : myState.isAttackingSword,
                    isChargingBow: HACKING ? false : myState.isChargingBow,
                    bowCharge: myState.bowCharge,
                    isDead: myState.isDead,
                    kills: HACKING ? 999 : myState.kills,
                    chosenArrow: HACKING ? 'default' : myState.chosenArrow,
                });
            }
        }

        // Render everything visually
        characters.forEach(p => p.draw());

        processArrows();
        checkSwordCollisions();
    }
    else if (!countdownActive) {
        if (winner)
            winnerDiv.innerText = `Player ${winner.id} wins!`;

        if (isAutorestart && !restartQueued) {
            resetGame();
        } else {
            const menu =
                document.getElementById("menu");

            if (
                menu &&
                menu.classList.contains("hidden")
            ) {
                menu.classList.remove("hidden");
                chooseRandomLevel();
            }
        }
    }
    
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function startCountdown(onFinish) {
    countdownActive = true;

    const menu = document.getElementById("menu");
    const status = document.getElementById("game-status");

    menu.classList.add("hidden");

    let count = 3;
    status.innerText = count;

    const timer = setInterval(() => {
        count--;

        if (count > 0) {
            status.innerText = count;
        } else {
            clearInterval(timer);

            countdownActive = false;

            status.innerText = "BATTLE!";
            onFinish();
        }
    }, 1000);
}

function running() {
    if (!gameStarted) return false;
    const aliveCount = characters.filter(p => {
        const alive = p.lives > 0;
        return alive;
    }).length;
    return aliveCount > 1;
}

let restartQueued = false;

function resetGame() {
    if (restartQueued) return;
    restartQueued = true;

    existingArrows = [];

    setTimeout(() => {
        restartQueued = false;

        document.getElementById('game-status').innerText = "BATTLE!";

        switch (gameMode) {
            case 'bot':
                startBotGame();
                break;

            case 'local':
                startLocalGame();
                break;

            case 'multiplayer':
                restartMultiplayerMatch();
                break;

            default:
                gameStarted = false;
                break;
        }
    }, 1200);
}

function toggleAutoRestart() {
    const button = document.getElementById('btn-auto-restart');
    const statusText = document.getElementById('restart-status');
    isAutorestart = !isAutorestart;
    
    // Update accessibility state
    button.setAttribute('aria-pressed', isAutorestart);
    
    // Update text and apply styles
    if (isAutorestart) {
        statusText.innerText = "ON";
        button.classList.add('active');
        
        // Put your code here for when Auto Restart is turned ON
        console.log("Auto Restart enabled.");
    } else {
        statusText.innerText = "OFF";
        button.classList.remove('active');
        
        // Put your code here for when Auto Restart is turned OFF
        console.log("Auto Restart disabled.");
    }
}

function restartMultiplayerMatch() {
    existingArrows = [];

    if (isHost) {
        const chosenIndex = chooseRandomLevel();

        characters.forEach((c, i) => {
            c.lives = currentMatchMaxLives;
            c.kills = 0;
            c.isDead = false;

            c.x = i === 0 ? 100 : 880;
            c.y = 300;

            c.vx = 0;
            c.vy = 0;
        });

        conn?.send({
            type: 'restart',
            lives: currentMatchMaxLives,
            levelIndex: chosenIndex
        });

        updateUI();
    }
}

let winner;

window.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('ctrl-btn')) {
        e.preventDefault();
    }
});

if (HACKING) {
    const hackingDiv = document.getElementById('hacking');
    hackingDiv.innerHTML = "HACKING";
}

gameLoop();