const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 20;
let snake = [{ x: 10, y: 10 }];
let food = {};
let direction = 'right';
let score = 0;
let gameInterval;
const gameSpeed = 150;

const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
let highScore = parseInt(localStorage.getItem('yashwantSnakeHighScore') || '0');
highScoreDisplay.textContent = 'High Score: ' + highScore;

let lastFrameTime = 0;
let lastUpdateTime = 0;
let gameOver = false;

let specialFood = null;
let specialFoodTimer = 0;
const SPECIAL_FOOD_DURATION = 4000; // ms
const SPECIAL_FOOD_CHANCE = 0.15; // 15% chance after eating normal food

function generateFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / gridSize)),
        y: Math.floor(Math.random() * (canvas.height / gridSize))
    };
    // Maybe spawn special food
    if (!specialFood && Math.random() < SPECIAL_FOOD_CHANCE) {
        specialFood = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)),
            y: Math.floor(Math.random() * (canvas.height / gridSize)),
            created: Date.now()
        };
        specialFoodTimer = Date.now();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Funky animated background: moving colorful circles
    const time = Date.now() * 0.001;
    const funkyColors = ['#ff6a00', '#00c3ff', '#ff4d6d', '#ffe600', '#00ffb8', '#ff00e6'];
    for (let i = 0; i < 8; i++) {
        const angle = time * (0.7 + i * 0.1) + i * Math.PI / 4;
        const x = canvas.width / 2 + Math.cos(angle) * (180 + 40 * Math.sin(time + i));
        const y = canvas.height / 2 + Math.sin(angle) * (180 + 40 * Math.cos(time + i));
        ctx.beginPath();
        ctx.arc(x, y, 70 + 20 * Math.sin(time * 2 + i), 0, Math.PI * 2);
        ctx.fillStyle = funkyColors[i % funkyColors.length] + '22'; // semi-transparent
        ctx.fill();
    }

    // Premium background overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 230, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake as a glowing red neon line
    if (snake.length > 1) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 32;
        ctx.shadowColor = '#ff003c';
        ctx.beginPath();
        ctx.moveTo(
            snake[0].x * gridSize + gridSize / 2,
            snake[0].y * gridSize + gridSize / 2
        );
        for (let i = 1; i < snake.length; i++) {
            ctx.lineTo(
                snake[i].x * gridSize + gridSize / 2,
                snake[i].y * gridSize + gridSize / 2
            );
        }
        // Red neon gradient
        const grad = ctx.createLinearGradient(
            snake[0].x * gridSize, snake[0].y * gridSize,
            snake[snake.length-1].x * gridSize, snake[snake.length-1].y * gridSize
        );
        grad.addColorStop(0, '#ff003c');
        grad.addColorStop(0.5, '#fff');
        grad.addColorStop(1, '#ff6a00');
        ctx.strokeStyle = grad;
        ctx.lineWidth = gridSize * 0.8;
        ctx.stroke();
        ctx.restore();

        // Funky trailing glow effect
        for (let i = 1; i < Math.min(16, snake.length); i++) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(
                snake[i].x * gridSize + gridSize / 2,
                snake[i].y * gridSize + gridSize / 2,
                gridSize * (0.6 - i * 0.03), 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255,0,60,${0.18 - i * 0.01})`;
            ctx.shadowBlur = 16 - i;
            ctx.shadowColor = '#ff003c';
            ctx.fill();
            ctx.restore();
        }
    }

    // Draw snake head as a glowing orb
    ctx.save();
    ctx.beginPath();
    ctx.arc(
        snake[0].x * gridSize + gridSize / 2,
        snake[0].y * gridSize + gridSize / 2,
        gridSize * 0.5, 0, Math.PI * 2
    );
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff003c';
    ctx.fill();
    ctx.restore();

    // Draw special food if present (funky rainbow orb)
    if (specialFood) {
        ctx.save();
        ctx.shadowBlur = 50;
        ctx.shadowColor = funkyColors[Math.floor(time*2)%funkyColors.length];
        ctx.beginPath();
        ctx.arc(specialFood.x * gridSize + gridSize / 2, specialFood.y * gridSize + gridSize / 2, gridSize * 0.5, 0, Math.PI * 2);
        const funkyGrad = ctx.createRadialGradient(
            specialFood.x * gridSize + gridSize / 2,
            specialFood.y * gridSize + gridSize / 2,
            gridSize * 0.1,
            specialFood.x * gridSize + gridSize / 2,
            specialFood.y * gridSize + gridSize / 2,
            gridSize * 0.5
        );
        funkyGrad.addColorStop(0, '#fff');
        funkyGrad.addColorStop(0.5, '#ffe600');
        funkyGrad.addColorStop(1, funkyColors[Math.floor(time*2)%funkyColors.length]);
        ctx.fillStyle = funkyGrad;
        ctx.fill();
        ctx.restore();
    }

    // Draw normal food as a funky glowing orb
    ctx.save();
    ctx.shadowBlur = 32;
    ctx.shadowColor = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize * 0.42, 0, Math.PI * 2);
    const foodGrad = ctx.createRadialGradient(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize * 0.1,
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize * 0.42
    );
    foodGrad.addColorStop(0, '#fff');
    foodGrad.addColorStop(0.7, '#ff4d6d');
    foodGrad.addColorStop(1, '#ff6a00');
    ctx.fillStyle = foodGrad;
    ctx.fill();
    ctx.restore();
}

function gameLoop(currentTime) {
    if (gameOver) {
        return;
    }

    requestAnimationFrame(gameLoop);

    // Update game logic only after gameSpeed interval
    if (currentTime - lastUpdateTime > gameSpeed) {
        updateGameLogic();
        lastUpdateTime = currentTime;
    }

    draw();
}

function updateGameLogic() {
    const head = { x: snake[0].x, y: snake[0].y };

    switch (direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }

    // Game over conditions
    if (head.x < 0 || head.x >= canvas.width / gridSize ||
        head.y < 0 || head.y >= canvas.height / gridSize ||
        checkCollision(head)) {
        gameOver = true;
        scoreDisplay.textContent = 'Game Over! Final Score: ' + score + '. Press any arrow key to restart.';
        document.addEventListener('keydown', restartGame, { once: true });
        return;
    }

    snake.unshift(head);

    // Check for special food
    if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        score += 2;
        scoreDisplay.textContent = 'Score: ' + score;
        updateHighScore();
        // Golden flash effect
        ctx.save();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'gold';
        ctx.beginPath();
        ctx.arc(specialFood.x * gridSize + gridSize / 2, specialFood.y * gridSize + gridSize / 2, gridSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        setTimeout(() => {
            specialFood = null;
            generateFood();
        }, 100);
    } else if (head.x === food.x && head.y === food.y) {
        score++;
        scoreDisplay.textContent = 'Score: ' + score;
        updateHighScore();
        // Visual effect for eating food: brief expansion and fade
        const originalFillStyle = ctx.fillStyle;
        const originalShadowBlur = ctx.shadowBlur;
        const originalShadowColor = ctx.shadowColor;

        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'; // Yellowish flash
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(255, 255, 0, 1)';
        ctx.beginPath();
        ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        setTimeout(() => {
            ctx.fillStyle = originalFillStyle;
            ctx.shadowBlur = originalShadowBlur;
            ctx.shadowColor = originalShadowColor;
            generateFood();
        }, 100); // Flash for 100ms
        
    } else {
        snake.pop();
    }
    // Remove special food if expired
    if (specialFood && Date.now() - specialFood.created > SPECIAL_FOOD_DURATION) {
        specialFood = null;
    }
}

function checkCollision(head) {
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') direction = 'right';
            break;
    }
});

function restartGame(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        gameOver = false;
        startGame();
    }
}

function startGame() {
    snake = [{ x: 10, y: 10 }];
    direction = 'right';
    score = 0;
    scoreDisplay.textContent = 'Score: ' + score;
    generateFood();
    lastFrameTime = 0; // Reset for a clean start
    lastUpdateTime = 0; // Reset for a clean start
    requestAnimationFrame(gameLoop);
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('yashwantSnakeHighScore', highScore);
        highScoreDisplay.textContent = 'High Score: ' + highScore;
        // Animate high score
        highScoreDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => highScoreDisplay.style.transform = '', 200);
    }
}

// Initial call to start the game
startGame(); 