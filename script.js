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
    { x: 387, y: 260, width: 250, height: 20, downable: true },
    { x: 50, y: 200, width: 150, height: 20, downable: true }, 
    { x: 824, y: 200, width: 150, height: 20, downable: true },
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
        switch (this.type) {
            case 'default':
                this.vy += ARROW_GRAVITY;
                this.x += this.vx;
                this.y += this.vy;

                this.draw();

                // Platform collisions
                let hitPlatform = false;
                for (let plat of platforms) {
                    if (this.x < plat.x + this.width && this.x + this.width > plat.x &&
                        this.y < plat.y + plat.height && this.y + this.height > plat.y) {
                        hitPlatform = true;
                        break;
                    }
                }

                // Dynamic target collisions against all other players
                let hitTarget = false;
                for (let target of characters) {
                    if (target.id !== this.ownerId && !target.isDead) {
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
                    existingArrows.splice(i, 1);
                }
                break;
            default:
                console.error("Unknown arrow type " + this.type);
                break;
        }
    }

    draw() {
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Player {
    constructor(x, y, color, controls, id) {
        this.id = id;
        this.startX = x; // Keep track of starting positions for easy respawns
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

        this.x += this.vx;
        this.y += this.vy;

        this.handleCollisions();
    }

    shootArrow() {
        let power = (this.bowCharge / MAX_CHARGE) * 15 + 5; 
        existingArrows.push(new Arrow(
            this.direction === 1 ? this.x + this.width : this.x - 10,
            this.y + this.height / 2 - 3,
            this.direction * power,
            -power * 0.15,
            this.id,
            15,
            4,
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
        this.x = this.startX;
        this.y = 100;
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
        this.startX = x; // Keep track of starting positions for easy respawns
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

        this.moves = new Array();

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

            this.moves = new Array();

            this.targetCharacter = characters.filter(c => {
                    return this.id !== c.id;
                })[Math.floor(Math.random() * (characters.length - 1))];

            while (this.moves.length <= this.simulataneousMoves){

                const move = Math.floor(Math.random() * 6);

                let alreadyUsedMove = false;
                this.moves.forEach(m => {
                    if (m === move) alreadyUsedMove = true;
                    else {
                        if (move === 1) {
                            if (this.targetCharacter && (this.targetCharacter.x > this.x)) {
                                this.chosenDirection = 1
                            }
                            else {
                                this.chosenDirection = -1;
                            }
                        }
                    }
                })

                if (!alreadyUsedMove) this.moves.push(move);
            }

            
        }
        
        else {
            this.currentMoveDelay++;
        }

        for (let i = 0; i < this.simulataneousMoves; i++) {

            const move = this.moves[i];

            switch (move) {
                case 0:
                    if (this.chosenDirection === 1) {
                        this.vx = this.speed;
                        this.direction = 1;
                    }
                    else {
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
                    // DO NOTHING
                    break;
                default:
                    console.log("THIS SHOULD BE UNREACHABLE");
                    console.log(move);
                    console.log(i);
            }

            if (move !== 4) this.isPressingDown = false;
        }
            

        if (this.isAttackingSword) {
            if (this.currentSwordDelay < this.swordDelay) {
                this.currentSwordDelay++;
            }
            else {
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
            this.direction === 1 ? this.x + this.width : this.x - 10,
            this.y + this.height / 2 - 3,
            this.direction * power,
            -power * 0.15,
            this.id,
            15,
            4,
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
        this.x = this.startX;
        this.y = 100;
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


const characters = [
    new Player(100, 300, '#3498db', { left: 'a', right: 'd', jump: 'w', down: 's', sword: 'x', bow: 'c' }, 1),
    new Bot(880, 300, '#e74c3c', 2),
];

function updateUI() {
    // Dynamic HUD update handles any number of configured elements in HTML safely
    characters.forEach(p => {
        const livesEl = document.getElementById(`p${p.id}-lives`);
        const chargeEl = document.getElementById(`p${p.id}-charge`);
        
        if (livesEl) livesEl.innerText = '❤'.repeat(Math.max(0, p.lives)) || 'DEAD';
        if (chargeEl) chargeEl.style.width = p.bowCharge + '%';
    });

    // Determine how many players remain standing
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
    // Every player checks compatibility with every other player
    for (let attacker of characters) {
        if (!attacker.isAttackingSword || attacker.isDead) continue;

        let swordX = attacker.direction === 1 ? attacker.x + attacker.width : attacker.x - 20;

        for (let target of characters) {
            if (attacker.id === target.id || target.isDead) continue;

            if (swordX < target.x + target.width && swordX + 20 > target.x &&
                attacker.y + 15 < target.y + target.height && attacker.y + 25 > target.y) {
                target.takeDamage();
                attacker.isAttackingSword = false; // Break multi-hit frame
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
        // Handle logic & layout processing globally for all active configurations
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
    // The match continues until only 1 or 0 players remain alive
    const aliveCount = characters.filter(p => p.lives > 0).length;
    return aliveCount > 1;
}

function resetGame() {
    characters.forEach(p => {
        p.lives = MAX_LIVES;
        p.isDead = false;
        p.x = p.startX;
        p.y = p.startY;
        p.vx = 0;
        p.vy = 0;
    });

    existingArrows = [];
    document.getElementById('game-status').innerText = "BATTLE!";
    updateUI();
}

updateUI();
gameLoop();