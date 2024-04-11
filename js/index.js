const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const canvasScale = 2;
canvas.width *= canvasScale;
canvas.height *= canvasScale;

const canvasLeft = canvas.offsetLeft + canvas.clientLeft;
const canvasTop = canvas.offsetTop + canvas.clientTop;

const canvasHeight = canvas.height;
const canvasWidth = canvas.width;

const promotion_popdown = document.getElementById('promotion_popdown');
const promotion_bishop = document.getElementById('promotion_bishop');
const promotion_knight = document.getElementById('promotion_knight');
const promotion_queen = document.getElementById('promotion_queen');
const promotion_rook = document.getElementById('promotion_rook');
let promotion_suffix = '';

const fenInput = document.getElementById('fen');
const fenLoadBtn = document.getElementById('fen_load');

const boardSize = 8;

const tileSize = 52;
const boardOffset = 0;

const whiteTile = "rgb(240 240 240)";
const blackTile = "rgb(160 160 160)";

let tiles = [];
let imageMap = {};

let turn = 'white';
let clicked = false;

let selectedPiece = '';
let selectedPieceX = 0;
let selectedPieceY = 0;

let halfMoveClock = 0;
let fullMoves = 1;
let castle_K = true;
let castle_Q = true;
let castle_k = true;
let castle_q = true;
let en_passant_block = '';

let LOCK_EVENTS = false;

let loading = true;

const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";


// -- debug

let OVERRIDE_GRAB = true;
let OVERRIDE_MOVE = true;

// -- game

// https://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-specific-index-in-javascript
String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}

window.onload = function() {
    setup();
};

function setup() {
    ctx.scale(canvasScale, canvasScale);
    ctx.fillStyle = "rgb(80 80 80)";
    ctx.font = "12px Arial";

    canvas.addEventListener('click', function(event) { boardClick(event) }, false);

    promotion_bishop.addEventListener('click', _promotion_bishop);
    promotion_knight.addEventListener('click', _promotion_knight);
    promotion_queen.addEventListener('click', _promotion_queen);
    promotion_rook.addEventListener('click', _promotion_rook);

    fenLoadBtn.addEventListener('click', function() {loadFen(fenInput.value)}, false);

    // preload images
    imageMap["pawnW"] = new Image();    imageMap["pawnW"].src = "static/pawnW.png";
    imageMap["bishopW"] = new Image();  imageMap["bishopW"].src = "static/bishopW.png";
    imageMap["kingW"] = new Image();    imageMap["kingW"].src = "static/kingW.png";
    imageMap["knightW"] = new Image();  imageMap["knightW"].src = "static/knightW.png";
    imageMap["queenW"] = new Image();   imageMap["queenW"].src = "static/queenW.png";
    imageMap["rookW"] = new Image();    imageMap["rookW"].src = "static/rookW.png";

    imageMap["pawnB"] = new Image();    imageMap["pawnB"].src = "static/pawnB.png";
    imageMap["bishopB"] = new Image();  imageMap["bishopB"].src = "static/bishopB.png";
    imageMap["kingB"] = new Image();    imageMap["kingB"].src = "static/kingB.png";
    imageMap["knightB"] = new Image();  imageMap["knightB"].src = "static/knightB.png";
    imageMap["queenB"] = new Image();   imageMap["queenB"].src = "static/queenB.png";
    imageMap["rookB"] = new Image();    imageMap["rookB"].src = "static/rookB.png";

    loadFen(startingFEN);
    
    setTimeout(function() {
        loading = false;
        draw();
    }, 500);
}

function preloadImage(target, url) {
    target = new Image();
    target.src = url;
}

function loadFen(fen) {
    for (let i = 0; i < boardSize; i++) {
        tiles[i] = new Array(boardSize);
        for (let j = 0; j < boardSize; j++) {
            tiles[i][j] = '';
        }
    }

    selectedPiece = '';
    selectedPieceX = 0;
    selectedPieceY = 0;
    clicked = false;
    LOCK_EVENTS = false;
    let pcs = fen.split(' ');
    let pFen = pcs[0].split('/');
    let x = 0;
    let y = 0;
    pFen.forEach(element => {
        element.split('').forEach(piece => {
            switch(piece) {
                case 'r': tiles[y][x] = 'rookB';    break;
                case 'n': tiles[y][x] = 'knightB';  break;
                case 'b': tiles[y][x] = 'bishopB';  break;
                case 'q': tiles[y][x] = 'queenB';   break;
                case 'k': tiles[y][x] = 'kingB';    break;
                case 'p': tiles[y][x] = 'pawnB';    break;
                case 'R': tiles[y][x] = 'rookW';    break;
                case 'N': tiles[y][x] = 'knightW';  break;
                case 'B': tiles[y][x] = 'bishopW';  break;
                case 'Q': tiles[y][x] = 'queenW';   break;
                case 'K': tiles[y][x] = 'kingW';    break;
                case 'P': tiles[y][x] = 'pawnW';    break;
                default: 
                    let offset = parseInt(piece);
                    for (let i = 0; i < offset-1; i++) {
                        tiles[y][x] = ''; 
                        x++;
                    }
            }
            x++;
            if (x > 7)
                x = 7;
        });
        x = 0;
        y++;
        if (y > 7)
            y = 7;
    });
    
    // turn
    if (pcs[1] === "w")
        turn = 'white';
    else
        turn = 'black';

    // castling
    let bpcs = 0;
    if (pcs.length > 6)
    {
        bpcs = 1;
        castle_K = pcs[2].includes("K");
        castle_Q = pcs[2].includes("Q");
        castle_k = pcs[3].includes("k");
        castle_Q = pcs[3].includes("q");
    } else {
        castle_K = pcs[2].includes("K");
        castle_Q = pcs[2].includes("Q");
        castle_k = pcs[2].includes("k");
        castle_Q = pcs[2].includes("q");
    }

    // en passant
    en_passant_block = pcs[3+bpcs];

    // halfmove clock
    halfMoveClock = pcs[4+bpcs];

    // fullmove number
    fullMoves = pcs[5+bpcs];

    if (!loading)
        draw();
}

function exportFen() {
    let fen = "";
    for (let i = 0; i < boardSize; i++) {
        let hasPiece = false;
        let ce = 0;
        let queue = '';
        for (let j = 0; j < boardSize; j++) {
            hasPiece = false;
            switch(tiles[i][j]) {
                case 'rookB': queue = 'r';    hasPiece = true; break;
                case 'knightB': queue = 'n';  hasPiece = true; break;
                case 'bishopB': queue = 'b';  hasPiece = true; break;
                case 'queenB': queue = 'q';   hasPiece = true; break;
                case 'kingB': queue = 'k';    hasPiece = true; break;
                case 'pawnB': queue = 'p';    hasPiece = true; break;
                case 'rookW': queue = 'R';    hasPiece = true; break;
                case 'knightW': queue = 'N';  hasPiece = true; break;
                case 'bishopW': queue = 'B';  hasPiece = true; break;
                case 'queenW': queue = 'Q';   hasPiece = true; break;
                case 'kingW': queue = 'K';    hasPiece = true; break;
                case 'pawnW': queue = 'P';    hasPiece = true; break;
                default:
                    if (!hasPiece)
                        ce++;
            }
            if (queue !== '')
                if (ce > 0) {
                    fen += ce;
                    ce = 0;
                }
                fen += queue;
                queue = '';
        }

        if (ce > 0)
            fen += ce;

        if (i < 7)
            fen += "/";

    }

    fen += ` ${turn[0]}`;

    let cc = '';
    if (castle_K && ! castle_Q) 
        fen += ' K';
    else if (castle_K && castle_Q)
        fen += ` KQ`;
    else if (!castle_K && castle_Q)
        fen += ` Q`;
    else if (!castle_K && !castle_Q) {
        fen += ` -`; 
        cc = ' ';
    }

    if (castle_k && ! castle_Q) 
        fen += `${cc}k`;
    else if (castle_k && castle_q)
        fen += `${cc}kq`;
    else if (!castle_k && castle_q)
        fen += `${cc}q`;
    else if (!castle_k && !castle_q)
        fen += ` -`;
 
    fen += ` ${en_passant_block}`;

    fen += ` ${halfMoveClock}`;
    fen += ` ${fullMoves}`;

    fenInput.value = fen;
}

function draw() {
    //console.log('redraw');
    exportFen();
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // numbers and letters

    // draw board !!! i = y, j = x
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            setTileColor(i, j);
            ctx.fillRect(j * tileSize, i * tileSize, tileSize, tileSize);
            //console.log(tiles[i][j]);
            //console.log(imageMap[tiles[i][j]]);
            ctx.fillStyle = "rgb(255, 255, 255)";
            if (imageMap[tiles[i][j]] !== undefined) {
                ctx.drawImage(imageMap[tiles[i][j]], j * tileSize, i * tileSize);
            }
            
            printLocation(i, j);
        }
    }
    
    if (selectedPiece !== '')
        drawPossibleMoves();

}

function setTileColor(y, x) {
    if ((x % 2 === 0 & (x !== 0 & y % 2 === 0)) || (x === 0 & y % 2 === 0) || (x % 2 !== 0 & x !== 0 & y % 2 !== 0)) {
        ctx.fillStyle = whiteTile;
    } else {
        ctx.fillStyle = blackTile;
    }
}

function printLocation(x, y) {
    ctx.fillStyle = "rgb(180 40 40)";
    ctx.fillText(`${y};${x}`, 2 + (y * tileSize), 50 + (x * tileSize));
}

function boardClick(event) {
    if (LOCK_EVENTS)
        return;

    let x = event.pageX - canvasLeft;
        y = event.pageY - canvasTop;

    let eX = parseInt(x / (tileSize * canvasScale));
    let eY = parseInt(y / (tileSize * canvasScale));

    if (eX > boardSize - 1 || eY > boardSize - 1 || eX < 0 || eY < 0)
        return;

    click: {
    if (!clicked) {
        if (!canGrab(eX, eY))
            break click;
        clicked = true;
        selectedPieceX = eX;
        selectedPieceY = eY;
        selectedPiece = tiles[selectedPieceY][selectedPieceX];
        console.log(`${selectedPiece} | ${selectedPieceX};${selectedPieceY}`);
    } else {
        clicked = false;

        if (!canMove(eX, eY)) {
            selectedPiece = '';
            break click;
        }

        let tempPiece = tiles[eY][eX];
        if (tiles[eY][eX] !== '')
        {
            tempPiece = '';
        }

        tiles[eY][eX] = selectedPiece;
        tiles[selectedPieceY][selectedPieceX] = tempPiece;
        if ((selectedPiece === "pawnW" || selectedPiece === "pawnB") && eY === 0)
            promotion(eX, eY);
        selectedPiece = '';
    }
    }

    draw();
}

function promotion(eX, eY) {
    LOCK_EVENTS = true;
    promotion_suffix = turn[0].toUpperCase();
    promotion_popdown.style.visibility = 'visible';
    selectedPieceX = eX;
    selectedPieceY = eY;
}

function _promotion_bishop() {
    if (LOCK_EVENTS) {
        LOCK_EVENTS = false;
        tiles[selectedPieceY][selectedPieceX] = `bishop${promotion_suffix}`
        promotion_popdown.style.visibility = 'hidden';
        draw();
    }
}
function _promotion_knight() {
    if (LOCK_EVENTS) {
        LOCK_EVENTS = false;
        tiles[selectedPieceY][selectedPieceX] = `knight${promotion_suffix}`
        promotion_popdown.style.visibility = 'hidden';
        draw();
    }
}
function _promotion_queen() {
    if (LOCK_EVENTS) {
        LOCK_EVENTS = false;
        tiles[selectedPieceY][selectedPieceX] = `queen${promotion_suffix}`
        promotion_popdown.style.visibility = 'hidden';
        draw();
    }
}
function _promotion_rook() {
    if (LOCK_EVENTS) {
        LOCK_EVENTS = false;
        tiles[selectedPieceY][selectedPieceX] = `rook${promotion_suffix}`
        promotion_popdown.style.visibility = 'hidden';
        draw();
    }
}

function canGrab(x, y) {
    if (OVERRIDE_GRAB)
        return true;

    if (turn === 'white' && tiles[y][x].endsWith('W'))
        return true;
    else if (turn === 'black' && tiles[y][x].endsWith('B'))
        return true;

    return false;
}

function canMove(x, y) {
    if (OVERRIDE_MOVE)
        return true;

    let possibleMoves = getMoves();
    let ret = false;
    possibleMoves.forEach((element) => {
        let px = element >> 8;
            py = element  & 0xFF;
        //console.log(`${x};${y}|${px};${py}`)
        if (x === px && y === py) {
            ret = true;
        }
    });

    return ret;
}

function getMoves() {
    let moves = [];

    // pawn white
    if (selectedPiece === "pawnW") {
        if (selectedPieceY > 0) {
            if (tiles[selectedPieceY - 1][selectedPieceX] === "")
                moves.push( (selectedPieceX << 8) | (selectedPieceY - 1) );
            if (selectedPieceX > 0)
                if (tiles[selectedPieceY - 1][selectedPieceX - 1].endsWith("B"))
                    moves.push( ((selectedPieceX - 1) << 8) | (selectedPieceY - 1) );
            if (selectedPieceX < boardSize - 1)
                if (tiles[selectedPieceY - 1][selectedPieceX + 1].endsWith("B"))
                    moves.push( ((selectedPieceX + 1) << 8) | (selectedPieceY - 1) );

        }
        if (selectedPieceY == 6) {
            if (tiles[selectedPieceY - 2][selectedPieceX] === "")
                moves.push( (selectedPieceX << 8) | (selectedPieceY - 2));
        }
    }
    // rook white
    else if (selectedPiece === "rookW") {
        for (let y = selectedPieceY + 1; y < boardSize; y++){
            if (y > 7)
                break;
            if (!(tiles[y][selectedPieceX].endsWith("W"))) {
                moves.push((selectedPieceX << 8) | y);
                if (tiles[y][selectedPieceX].endsWith("B"))
                    break;
            } else if (tiles[y][selectedPieceX].endsWith("W"))
                break;
        }
        for (let y = selectedPieceY - 1; y < boardSize; y--){
            if (y < 0)
                break;
            if (!(tiles[y][selectedPieceX].endsWith("W"))) {
                moves.push((selectedPieceX << 8) | y);
                if (tiles[y][selectedPieceX].endsWith("B"))
                    break;
            } else if (tiles[y][selectedPieceX].endsWith("W"))
                break;
        }
        for (let x = selectedPieceX - 1; x < boardSize; x--){
            if (x < 0)
                break;
            if (!(tiles[selectedPieceY][x].endsWith("W"))) {
                moves.push((x << 8) | selectedPieceY);
                if (tiles[selectedPieceY][x].endsWith("B"))
                    break;
            } else if (tiles[selectedPieceY][x].endsWith("W"))
                break;
        }
        for (let x = selectedPieceX + 1; x < boardSize; x++){
            if (x > 7)
                break;
            if (!(tiles[selectedPieceY][x].endsWith("W"))) {
                moves.push((x << 8) | selectedPieceY);
                if (tiles[selectedPieceY][x].endsWith("B"))
                    break;
            } else if (tiles[selectedPieceY][x].endsWith("W"))
                break;
        }
    }
    else if (selectedPiece === "knightW") {
        // left
        if (selectedPieceX > 1 && selectedPieceY > 0)
            if (!(tiles[selectedPieceY-1][selectedPieceX-2].endsWith("W")))
                moves.push((selectedPieceX - 2 << 8) | selectedPieceY - 1);
        if (selectedPieceX > 0 && selectedPieceY > 1)
            if (!(tiles[selectedPieceY-2][selectedPieceX-1].endsWith("W")))
                moves.push((selectedPieceX - 1 << 8) | selectedPieceY - 2);
        if (selectedPieceX > 1 && selectedPieceY < 7)
            if (!(tiles[selectedPieceY+1][selectedPieceX-2].endsWith("W")))
                moves.push((selectedPieceX - 2 << 8) | selectedPieceY + 1);
        if (selectedPieceX > 0 && selectedPieceY < 6)
            if (!(tiles[selectedPieceY+2][selectedPieceX-1].endsWith("W")))
                moves.push((selectedPieceX - 1 << 8) | selectedPieceY + 2);
        // right
        if (selectedPieceX < 6 && selectedPieceY > 0)
            if (!(tiles[selectedPieceY-1][selectedPieceX+2].endsWith("W")))
                moves.push((selectedPieceX + 2 << 8) | selectedPieceY - 1);
        if (selectedPieceX < 7 && selectedPieceY > 1)
            if (!(tiles[selectedPieceY-2][selectedPieceX+1].endsWith("W")))
                moves.push((selectedPieceX + 1 << 8) | selectedPieceY - 2);
        if (selectedPieceX < 6 && selectedPieceY < 7)
            if (!(tiles[selectedPieceY+1][selectedPieceX+2].endsWith("W")))
                moves.push((selectedPieceX + 2 << 8) | selectedPieceY + 1);
        if (selectedPieceX < 7 && selectedPieceY < 6)
            if (!(tiles[selectedPieceY+2][selectedPieceX+1].endsWith("W")))
                moves.push((selectedPieceX + 1 << 8) | selectedPieceY + 2);
    }

    // filter out king
    moves.forEach((element) => {
        let mX = element >> 8;
            mY = element  & 0xFF;
        if (tiles[mY][mX].startsWith("king")) {
            const index = moves.indexOf(element);
            moves.splice(index, 1);
        }
    });

    return moves;
}

function drawPossibleMoves() {
    let possibleMoves = getMoves();
    possibleMoves.forEach((element) => {
        let x = element >> 8;
            y = element  & 0xFF;
        ctx.fillStyle = "rgba(80, 60, 120, 0.4)";
        ctx.beginPath();
        console.log(`${x};${y}`);
        ctx.arc((x * tileSize) + tileSize / 2, (y * tileSize) + tileSize / 2, 10, 0, 2 * Math.PI);
        ctx.fill();
    });
}