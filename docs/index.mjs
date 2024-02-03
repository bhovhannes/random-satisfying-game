
const WHITE = 1
const BLACK = 0

// the field is 512px, so keep ball and cell size power of 2 as well
const ballSize = 16;
const ballRadius = ballSize / 2;
const cellSize = 32;

const velocity = 6

/**
 * @type {GameState}
 */
let gameState = null


class GameState {
    constructor(canvasSize, debugMode) {
        this.debugMode = debugMode
        this.black = new BallState(canvasSize, canvasSize / 4 + ballRadius, canvasSize / 2 + ballRadius, BLACK);
        this.white = new BallState(canvasSize, 3 * canvasSize / 4 + ballRadius, canvasSize / 2 + ballRadius, WHITE)
        this.rowCount = canvasSize / cellSize
        this.colCount = canvasSize / cellSize
        this.canvasSize = canvasSize

        // A "this.cells" is an array of matrix cells, where columns come one after another.
        // The first "this.rowCount" cells belong to the first column and so on.
        this.cells = new Uint8Array(this.colCount * this.rowCount)
        for (let i=0; i<this.cells.length; ++i) {
            this.cells[i] = i < this.cells.length/2 ? WHITE : BLACK
        }
    }
}

class BallState {
    constructor(canvasSize, x, y, color) {
        // By adding 10 degrees and taking steps of 20 degrees,
        // we are sure that we won't get 0 or 90 degree angles of movement.
        const angle = 10 + 20 * Math.floor(360 * Math.random() / 20)

        this.x = x
        this.y = y
        this.dx = velocity * Math.cos(angle)
        this.dy = velocity * Math.sin(angle)
        this.score = 0
        this.color = color
    }
}


function moveBall(ball, paintColor) {
    ball.x += ball.dx
    ball.y += ball.dy

    let dxDirectionChange = 1
    let dyDirectionChange = 1

    // correct ball position if it moves out of the field because of movement in a negative direction of X axis
    if (ball.x < ballRadius) {
        const overflow = ball.x - ballRadius
        ball.x -= overflow
        ball.y -= overflow * ball.dy / ball.dx
        dxDirectionChange = -1
    }

    // correct ball position if it moves out of the field because of movement in a positive direction of X axis
    if (ball.x > gameState.canvasSize - ballRadius) {
        const overflow = ball.x - (gameState.canvasSize - ballRadius)
        ball.x -= overflow
        ball.y -= overflow * ball.dy / ball.dx
        dxDirectionChange = -1
    }

    // correct ball position if it moves out of the field because of movement in a negative direction of Y axis
    if (ball.y < ballRadius) {
        const overflow = ball.y - ballRadius
        ball.x -= overflow * ball.dx / ball.dy
        ball.y -= overflow
        dyDirectionChange = -1
    }

    // correct ball position if it moves out of the field because of movement in a positive direction of Y axis
    if (ball.y > gameState.canvasSize - ballRadius) {
        const overflow = ball.y - (gameState.canvasSize - ballRadius)
        ball.x -= overflow * ball.dx / ball.dy
        ball.y -= overflow
        dyDirectionChange = -1
    }


    const {x:x0, y:y0, dx, dy} = ball

    const ballCellCol = Math.floor(x0 / cellSize)
    const ballCellRow = Math.floor(y0 / cellSize)

    let distanceScore = Infinity
    let closestEdge
    let closestCell
    const cells = [
        [ballCellRow-1, ballCellCol-1],
        [ballCellRow-1, ballCellCol],
        [ballCellRow-1, ballCellCol+1],
        [ballCellRow, ballCellCol-1],
        [ballCellRow, ballCellCol+1],
        [ballCellRow+1, ballCellCol-1],
        [ballCellRow+1, ballCellCol],
        [ballCellRow+1, ballCellCol+1]
    ]
    for (const cell of cells) {
        const [r,c] = cell
        if (r < 0 || c < 0 || r >= gameState.rowCount || c >= gameState.colCount) {
            continue;
        }
        if (gameState.cells[getCellIndex(r,c)] !== ball.color) {
            continue;
        }

        const lineY = r > ballCellRow ? r * cellSize : (r+1) * cellSize
        const xSquared = (ballRadius)**2 - (lineY - y0)**2
        if (xSquared >= 0) {
            const lineXLft = x0 + Math.sqrt(xSquared)
            const lineXRgt = x0 - (lineXLft - x0)
            const xMin = c * cellSize
            const xMax = xMin + cellSize
            if (
                (lineXLft >= xMin && lineXLft < xMax) ||
                (lineXRgt >= xMin && lineXRgt < xMax)
            ) {
                const distanceFromEdgeCenterSquared = ((xMin + xMax)/2 - x0)**2 + (lineY - y0)**2
                if (distanceFromEdgeCenterSquared < distanceScore) {
                    distanceScore = distanceFromEdgeCenterSquared
                    closestEdge = [ [xMin, lineY], [xMax, lineY] ]
                    closestCell = cell
                }
            }
        }
        const lineX = c > ballCellCol ? c * cellSize : (c+1) * cellSize
        const ySquared = (ballRadius)**2 - (lineX - x0)**2
        if (ySquared >= 0) {
            const lineYBtm = y0 + Math.sqrt(ySquared)
            const lineYTop = y0 - (lineYBtm - y0)
            const yMin = r * cellSize
            const yMax = yMin + cellSize
            if (
                (lineYBtm >= yMin && lineYBtm < yMax) ||
                (lineYTop >= yMin && lineYTop < yMax)
            ) {
                const distanceFromEdgeCenterSquared = ((yMin + yMax)/2 - y0)**2 + (lineX - x0)**2
                if (distanceFromEdgeCenterSquared < distanceScore) {
                    distanceScore = distanceFromEdgeCenterSquared
                    closestEdge = [ [lineX, yMin], [lineX, yMax] ]
                    closestCell = cell
                }
            }
        }
    }

    if (closestCell) {
        const [r,c] = closestCell
        gameState.cells[getCellIndex(r,c)] = paintColor
        ball.score += 1
        const [ [x1, y1], [x2, y2] ] = closestEdge
        if (x1 === x2) { // we hit vertical edge first
            dxDirectionChange = -1
            ball.x -= dx
            ball.y -= dy
        }
        else if (y1 === y2) { // we hit horizontal edge first
            dyDirectionChange = -1
            ball.x -= dx
            ball.y -= dy
        }
    }

    // change a movement direction if we hit to either field walls or to cells of another color
    ball.dx *= dxDirectionChange
    ball.dy *= dyDirectionChange
}

function getCellIndex(row, col) {
    return col * gameState.rowCount + row
}

/**
 * @param {CanvasRenderingContext2D} renderContext
 */
function renderBlackBall(renderContext) {
    renderContext.beginPath()
    renderContext.fillStyle = "#000";
    renderContext.arc(gameState.black.x, gameState.black.y, ballRadius, 0, 2*Math.PI);
    renderContext.fill()
    renderContext.closePath()
}

/**
 * @param {CanvasRenderingContext2D} renderContext
 */
function renderWhiteBall(renderContext) {
    renderContext.beginPath()
    renderContext.fillStyle = "#DDD";
    renderContext.arc(gameState.white.x, gameState.white.y, ballRadius, 0, 2*Math.PI);
    renderContext.fill()
    renderContext.closePath()
}

/**
 * @param {CanvasRenderingContext2D} renderContext
 */
function renderCells(renderContext) {
    const renderWithColor = (color, fillStyle) => {
        renderContext.beginPath()
        renderContext.fillStyle = fillStyle
        renderContext.strokeStyle = "#0F0"
        for(let i=0; i<gameState.cells.length; ++i) {
            if (gameState.cells[i] === color) {
                const r = i % gameState.rowCount
                const c = (i - r) / gameState.rowCount
                renderContext.rect(c*cellSize, r*cellSize, cellSize, cellSize)
            }
        }
        renderContext.fill()
        if (gameState.debugMode) {
            renderContext.stroke()
        }
        renderContext.closePath()
    }
    renderWithColor(WHITE, "#DDD")
    renderWithColor(BLACK, "#000")
}

function updateWhiteBallScore(whiteScoreEl) {
    whiteScoreEl.firstChild.textContent = gameState.white.score
}

function updateBlackBallScore(blackScoreEl) {
    blackScoreEl.firstChild.textContent = gameState.black.score
}

function onWindowLoad() {
    const restartButtonEl = document.getElementById("restartBtn")
    const sceneCanvasEl = document.getElementById("scene")
    const blackScoreEl = document.getElementById("blackScore")
    const whiteScoreEl = document.getElementById("whiteScore")
    const debugModeEl = document.getElementById("debugMode")
    const blackTrophyEl = document.getElementById("blackTrophy")
    const whiteTrophyEl = document.getElementById("whiteTrophy")

    let rafHandle = 0

    const canvasSize = sceneCanvasEl.clientWidth
    sceneCanvasEl.width = canvasSize
    sceneCanvasEl.height = canvasSize

    const renderContext = sceneCanvasEl.getContext("2d")
    const gameStep = () => {
        renderCells(renderContext)
        renderWhiteBall(renderContext)
        renderBlackBall(renderContext)
        updateWhiteBallScore(whiteScoreEl)
        updateBlackBallScore(blackScoreEl)
        if (gameState.white.score > gameState.black.score) {
            blackTrophyEl.style.visibility = "hidden"
            whiteTrophyEl.style.visibility = "visible"
        }
        else if (gameState.white.score < gameState.black.score) {
            blackTrophyEl.style.visibility = "visible"
            whiteTrophyEl.style.visibility = "hidden"
        }
        else {
            blackTrophyEl.style.visibility = "hidden"
            whiteTrophyEl.style.visibility = "hidden"
        }
        moveBall(gameState.white, BLACK)
        moveBall(gameState.black, WHITE)
    }

    const init = () => {
        gameState = new GameState(canvasSize, debugModeEl.checked)
        cancelAnimationFrame(rafHandle)
        if (gameState.debugMode) {
            window.addEventListener("click", gameStep)
        }
        else {
            const loop = () => {
                gameStep()
                rafHandle = requestAnimationFrame(loop)
            }
            loop()
        }
    }

    restartButtonEl.addEventListener('click', init)
    debugModeEl.addEventListener('click', init)
    init()
}

window.addEventListener("load", onWindowLoad)