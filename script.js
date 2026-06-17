const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Global Constants
const GRAVITY = 0.5;
const ARROW_GRAVITY = 0.15;
const MAX_CHARGE = 100;
const CHARGE_SPEED = 2;
const MAX_LIVES = 5;

// Keyboard input tracking
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Arena Structure
const platforms = [
    { x: 0, y: 536, width: 1024, height: 40, downable: false },
    { x: 150, y: 400, width: 250, height: 20, downable: true },
    { x: 624, y: 400, width: 250, height: 20, downable: true },
    { x: 387, y: 290, width: 250, height: 20, downable: true },
    { x: 50, y: 250, width: 150, height: 20, downable: true }, 
    { x: 824, y: 250, width: 150, height: 20, downable: true },
];

const characters = [
    new Player(100, 300, '#3498db', { left: 'a', right: 'd', jump: 'w', down: 's', sword: 'k', bow: 'o' }, 1),
    new Bot(880, 300, '#e74c3c', 2),
];

// Projectiles array
let existingArrows = [];

class Arrow {
    constructor(x, y, vx, vy, ownerId, width, height, type = 'default') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ownerId = ownerId; // Track owner by unique ID
        this.width = width;
        this.height = height;
        this.type = type;
    }

    move(i) {
        this.vy += ARROW_GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        this.draw();

        // 1. Uniform Platform Collision Math
        let hitPlatform = false;
        for (let plat of platforms) {
            if (this.x < plat.x + plat.width && this.x + this.width > plat.x &&
                this.y < plat.y + plat.height && this.y + this.height > plat.y) {
                hitPlatform = true;
                break;
            }
        }

        // 2. Uniform Target Collision Math
        let hitTarget = false;
        for (let target of characters) {
            if (!target.isDead) {
                if (this.x < target.x + target.width &&
                    this.x + this.width > target.x &&
                    this.y < target.y + target.height &&
                    this.y + this.height > target.y) {
                
                    target.takeDamage();
                    hitTarget = true;
                    break;
                }
            }
        }

        if (hitPlatform || hitTarget || this.x < 0 || this.x > canvas.width || this.y > canvas.height) {
            if (this.type === 'teleport') {
                const owner = characters.find(c => c.id === this.ownerId);
                if (owner) {
                    // Start by centering the player on the arrow's impact point
                    let targetX = this.x - owner.width / 2;
                    let targetY = this.y - owner.height / 2;

                    // Bound checks: Don't teleport players out of the viewport boundaries
                    if (targetX < 0) targetX = 0;
                    if (targetX + owner.width > canvas.width) targetX = canvas.width - owner.width;
                    if (targetY < 0) targetY = 0;

                    // Platform Unclipping Phase: Check if the destination overlaps any platform
                    for (let plat of platforms) {
                        if (targetX < plat.x + plat.width &&
                            targetX + owner.width > plat.x &&
                            targetY < plat.y + plat.height &&
                            targetY + owner.height > plat.y) {
                            
                            // If colliding, prioritize pushing the character up onto the surface
                            if (targetY + owner.height / 2 < plat.y + plat.height / 2) {
                                targetY = plat.y - owner.height; 
                            } else {
                                // Otherwise, if it hits the bottom half of a platform, push them below it
                                targetY = plat.y + plat.height;
                            }
                        }
                    }

                    // Apply the safe, adjusted coordinates to the owner
                    owner.x = targetX;
                    owner.y = targetY;
                    owner.vx = 0;
                    owner.vy = 0;
                }
            }
            existingArrows.splice(i, 1);
        }
    }

    draw() {
        ctx.fillStyle = this.type === 'teleport' ? '#9b59b6' : '#ecf0f1'; // Teleport arrows get a cool purple color tint
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Player {
    constructor(x, y, color, controls, id) {
        this.id = id;
        this.startX = x; 
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        this.controls = controls;
        
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = 12;
        this.grounded = false;
        this.direction = x < canvas.width / 2 ? 1 : -1;

        this.lives = MAX_LIVES;
        this.isAttackingSword = false;
        this.swordTimer = 0;
        this.isChargingBow = false;
        this.bowCharge = 0;
        this.isDead = false;
        this.respawnTimer = 0;

        this.chosenArrow = 'default';

        this.isPressingDown = false;
    }

    update(characters) {
        if (this.isDead) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0 && this.lives > 0) {
                this.respawn();
            }
            return;
        }

        this.vy += GRAVITY;
        this.isPressingDown = false;
        this.vx = 0;

        if (keys[this.controls.left]) {
            this.vx = -this.speed;
            this.direction = -1;
        }
        if (keys[this.controls.right]) {
            this.vx = this.speed;
            this.direction = 1;
        }

        if (keys[this.controls.jump] && this.grounded) {
            this.vy = -this.jumpForce;
            this.grounded = false;
        }

        if (keys[this.controls.down]) {
            this.isPressingDown = true;
        }

        if (keys[this.controls.sword] && !this.isAttackingSword && !this.isChargingBow) {
            this.isAttackingSword = true;
            this.swordTimer = 15;
        }

        if (this.isAttackingSword) {
            this.swordTimer--;
            if (this.swordTimer <= 0) this.isAttackingSword = false;
        }

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

        if (keys['1']) {
            this.chosenArrow = 'default';
        } else if (keys['2']) {
            this.chosenArrow = 'teleport';
        }

        this.x += this.vx;
        this.y += this.vy;

        this.handleCollisions();
    }

    shootArrow() {
        let power = (this.bowCharge / MAX_CHARGE) * 15 + 5; 
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
    }

    handleCollisions() {
        this.grounded = false;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        for (let plat of platforms) {
            if (plat.downable && this.isPressingDown) continue;
            if (this.x < plat.x + plat.width &&
                this.x + this.width > plat.x &&
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
        this.lives--;
        this.isDead = true;
        this.respawnTimer = 90;
        updateUI();
    }

    respawn() {
        this.isDead = false;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 200) + 50;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        if (this.isDead) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#fff';
        let eyeX = this.direction === 1 ? this.x + this.width - 8 : this.x + 3;
        ctx.fillRect(eyeX, this.y + 8, 5, 5);

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
    }
}

class Bot {
    constructor(x, y, color, id) {
        this.id = id;
        this.startX = x; 
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = 12;
        this.grounded = false;
        this.direction = x < canvas.width / 2 ? 1 : -1;

        this.lives = MAX_LIVES;
        this.isAttackingSword = false;
        this.currentSwordDelay = 0;
        this.swordTimer = 0;
        this.isChargingBow = false;
        this.bowCharge = 0;
        this.isDead = false;
        this.respawnTimer = 0;

        this.currentMoveDelay = 0;
        this.moveDelay = 20;
        this.simulataneousMoves = 2;
        this.swordDelay = 5;

        this.moves = [];
        for (let i = 0; i < this.simulataneousMoves; i++) {
            this.moves.push(0);
        }
        this.targetCharacter = undefined;
    }

    update(characters) {
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
                case 5:
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

    shootArrow() {
        let power = (this.bowCharge / MAX_CHARGE) * 15 + 5; 
        existingArrows.push(new Arrow(
            this.direction === 1 ? this.x + this.width : this.x - 15,
            this.y + this.height / 2 - 2,
            this.direction * power,
            -power * 0.15,
            this.id,
            15,
            4,
            Math.random() >= 0.5 ? 'teleport' : 'default',
        ));
    }

    handleCollisions() {
        this.grounded = false;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        for (let plat of platforms) {
            if (plat.downable && this.isPressingDown) continue;
            
            if (this.x < plat.x + plat.width &&
                this.x + this.width > plat.x &&
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
        this.lives--;
        this.isDead = true;
        this.respawnTimer = 90;
        updateUI();
    }

    respawn() {
        this.isDead = false;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 200) + 50;
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        if (this.isDead) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#fff';
        let eyeX = this.direction === 1 ? this.x + this.width - 8 : this.x + 3;
        ctx.fillRect(eyeX, this.y + 8, 5, 5);

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
    }
}

function updateUI() {
    characters.forEach(p => {
        const livesEl = document.getElementById(`p${p.id}-lives`);
        const chargeEl = document.getElementById(`p${p.id}-charge`);
        
        if (livesEl) livesEl.innerText = '❤'.repeat(Math.max(0, p.lives)) || 'DEAD';
        if (chargeEl) chargeEl.style.width = p.bowCharge + '%';
    });

    const activePlayers = characters.filter(p => p.lives > 0);
    if (activePlayers.length === 1) {
        document.getElementById('game-status').innerText = `PLAYER ${activePlayers[0].id} WINS!`;
    } else if (activePlayers.length === 0) {
        document.getElementById('game-status').innerText = "MUTUAL DESTRUCTION!";
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
                target.takeDamage();
                attacker.isAttackingSword = false; 
                break; 
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7f8c8d';
    for (let plat of platforms) {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    }

    if (running()) {
        characters.forEach(p => p.update(characters));
        characters.forEach(p => p.draw());

        processArrows();
        checkSwordCollisions();

        characters.forEach(p => {
            const chargeEl = document.getElementById(`p${p.id}-charge`);
            if (chargeEl) chargeEl.style.width = p.bowCharge + '%';
        });
        
        const menu = document.getElementById("menu");
        if (menu && !menu.classList.contains("hidden")) {
            menu.classList.add("hidden");
        }
    } else {
        const menu = document.getElementById("menu");
        if (menu && menu.classList.contains("hidden")) {
            menu.classList.remove("hidden");
        }
        characters.forEach(p => p.draw());
    }

    requestAnimationFrame(gameLoop);
}

function running() {
    const aliveCount = characters.filter(p => p.lives > 0).length;
    return aliveCount > 1;
}

function resetGame() {
    characters.forEach(p => {
        p.lives = MAX_LIVES;
        p.isDead = false;
        p.x = Math.random() * (canvas.width - 100) + 50;
        p.y = Math.random() * (canvas.height - 200) + 50;
        p.vx = 0;
        p.vy = 0;
    });

    existingArrows = [];
    document.getElementById('game-status').innerText = "BATTLE!";
    updateUI();
}

updateUI();
gameLoop();