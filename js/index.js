const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const canvasScale = 1.2;
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
let promotion_suffix  = ''

const info_fullMoves = document.getElementById('full-moves');
const info_halfMoves = document.getElementById('half-moves');
const info_turn = document.getElementById('turn');
const info_check = document.getElementById('check');

let checking;
let check = '';
let game_state = '';

let kingPosWhite = "";
    kingPosBlack = "";

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

let OVERRIDE_GRAB = false;
let OVERRIDE_MOVE = false;

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
    halfMoveClock = parseInt(pcs[4+bpcs]);

    // fullmove number
    fullMoves = parseInt(pcs[5+bpcs]);

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
                case 'kingB': queue = 'k';    hasPiece = true; kingPosBlack = encodePosition(j, i); break;
                case 'pawnB': queue = 'p';    hasPiece = true; break;
                case 'rookW': queue = 'R';    hasPiece = true; break;
                case 'knightW': queue = 'N';  hasPiece = true; break;
                case 'bishopW': queue = 'B';  hasPiece = true; break;
                case 'queenW': queue = 'Q';   hasPiece = true; break;
                case 'kingW': queue = 'K';    hasPiece = true; kingPosWhite = encodePosition(j, i); break;
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
            
            //printLocation(i, j);
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
        //console.log(`${selectedPiece} | ${selectedPieceX};${selectedPieceY}`);
    } else {
        clicked = false;

        if (!canMove(eX, eY)) {
            selectedPiece = '';
            break click;
        }

        let tempPiece = tiles[eY][eX];
        if (tiles[eY][eX] !== '')
        {
            halfMoveClock = 0;
            tempPiece = '';
        } else {
            halfMoveClock += 1;
        }

        if (halfMoveClock >= 50) {
            fiftyMoveEnd();
        }

        fullMoves += 1;

        tiles[eY][eX] = selectedPiece;
        tiles[selectedPieceY][selectedPieceX] = tempPiece;
        if ((selectedPiece === "pawnW" && eY === 0) || (selectedPiece === "pawnB" && eY === 7))
            promotion(eX, eY);
        [selectedPieceX, selectedPieceY] = [eX, eY];
        getMoves();
        
        selectedPiece = '';

        changeTurn();
    }
    }

    updateInfo();
    draw();
}

function changeTurn() {
    if (turn === 'white')
        turn = 'black';
    else
        turn = 'white';
}

function promotion(eX, eY) {
    LOCK_EVENTS = true;
    let t = tiles[eY][eX];
    promotion_suffix = t.slice(-1).toUpperCase();
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

    // conditional: between my king and my enemy
    if (selectedPiece.endsWith("W") && selectedPieceY < 7) {
        if ((tiles[selectedPieceY + 1][selectedPieceX] === "kingW") && (tiles[selectedPieceY - 1][selectedPieceX] === "queenB"))
            return moves;
    } else if (selectedPiece.endsWith("B") && selectedPieceY > 0) {
        if ((tiles[selectedPieceY - 1][selectedPieceX] === "kingB") && (tiles[selectedPieceY + 1][selectedPieceX] === "queenW"))
            return moves;
    }

    let friendlyColor = selectedPiece.slice(-1).toUpperCase();
    let oppColor = getOppositeColor(friendlyColor);

    let uMoves = [];
    if (check.charAt(0).toUpperCase() === friendlyColor) {
        uMoves = uncheckMoves(friendlyColor, oppColor);
    }
    if (uMoves.length === 0) {
        check = '';
    }

    // pawn white
    if (selectedPiece === "pawnW") {
        moves = moves.concat(_getMovesPawnWhite(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // pawn black
    else if (selectedPiece === "pawnB") {
        moves = moves.concat(_getMovesPawnBlack(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // rook
    else if (selectedPiece.startsWith("rook")) {
        moves = moves.concat(_getMovesRook(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // knight
    else if (selectedPiece.startsWith("knight")) {
        // left
        moves = moves.concat(_getMovesKnight(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // bishop
    else if (selectedPiece.startsWith("bishop")) {
        moves = moves.concat(_getMovesBishop(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // queen
    else if (selectedPiece.startsWith("queen")) {
        moves = moves.concat(_getMovesQueen(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }
    // king
    else if (selectedPiece.startsWith("king")) {
        moves = moves.concat(_getMovesKing(selectedPieceX, selectedPieceY, friendlyColor, oppColor));
    }

    // filter out to king and mark checks
    let anyCheck = false;
    moves.forEach((element) => {
        let index;
        let [kWX, kWY] = decodePosition(kingPosWhite);
        let [kBX, kBY] = decodePosition(kingPosBlack);
        let [mPX, mPY] = decodePosition(element);
        //console.log(`${decodePosition(kingPosWhite)}; ${decodePosition(kingPosBlack)} :: ${decodePosition(element)}`)
        if (mPX == kWX && mPY == kWY) {
            anyCheck = true;
            checking = encodePosition(mPX, mPY);
            check = 'white';
            moves.splice(moves.indexOf(element), 1);
        } else if (mPX == kBX && mPY == kBY) {
            anyCheck = true;
            checking = encodePosition(mPX, mPY);
            check = 'black';
            moves.splice(moves.indexOf(element), 1);
        }
    });

    if (!anyCheck) {
        checkForCheck(friendlyColor, oppColor);
    }

    if (check.charAt(0).toUpperCase() === friendlyColor) {
        moves = arrayIntersect(moves, uMoves);
    }

    //console.log(`${check}; ${checking} -> ${decodePosition(checking)}`);

    return moves;
}

function _getMovesPawnWhite(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    if (pY > 0) {
        if (tiles[pY - 1][pX] === "")
            moves.push(encodePosition(pX, pY - 1));
        if (pX > 0)
            if (tiles[pY - 1][pX - 1].endsWith("B"))
                moves.push(encodePosition(pX - 1, pY - 1));
        if (pX < boardSize - 1)
            if (tiles[pY - 1][pX + 1].endsWith("B"))
                moves.push(encodePosition(pX + 1, pY - 1));
    }
    if (pY == 6) {
        if (tiles[pY - 2][pX] === "")
            moves.push(encodePosition(pX, pY - 2));
    }
    return moves;
}

function _getMovesPawnBlack(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    if (pY < 7) {
        if (tiles[pY + 1][pX] === "")
            moves.push(encodePosition(pX, pY + 1));
        if (pX > 0)
            if (tiles[pY + 1][pX - 1].endsWith("W"))
                moves.push(encodePosition(pX - 1, pY + 1));
        if (pX < boardSize - 1)
            if (tiles[pY + 1][pX + 1].endsWith("W"))
                moves.push(encodePosition(pX + 1, pY + 1));

    }
    if (pY == 1) {
        if (tiles[pY + 2][pX] === "")
            moves.push(encodePosition(pX, pY + 2));
    }
    return moves;
}

function _getMovesRook(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    for (let y = pY + 1; y < boardSize; y++){
        if (y > 7)
            break;
        if (!(tiles[y][pX].endsWith(friendlyColor))) {
            moves.push((pX << 8) | y);
            if (tiles[y][pX].endsWith(oppColor))
                break;
        } else if (tiles[y][pX].endsWith(friendlyColor))
            break;
    }
    for (let y = pY - 1; y < boardSize; y--){
        if (y < 0)
            break;
        if (!(tiles[y][pX].endsWith(friendlyColor))) {
            moves.push((pX << 8) | y);
            if (tiles[y][pX].endsWith(oppColor))
                break;
        } else if (tiles[y][pX].endsWith(friendlyColor))
            break;
    }
    for (let x = pX - 1; x < boardSize; x--){
        if (x < 0)
            break;
        if (!(tiles[pY][x].endsWith(friendlyColor))) {
            moves.push((x << 8) | pY);
            if (tiles[pY][x].endsWith(oppColor))
                break;
        } else if (tiles[pY][x].endsWith(friendlyColor))
            break;
    }
    for (let x = pX + 1; x < boardSize; x++){
        if (x > 7)
            break;
        if (!(tiles[pY][x].endsWith(friendlyColor))) {
            moves.push((x << 8) | pY);
            if (tiles[pY][x].endsWith(oppColor))
                break;
        } else if (tiles[pY][x].endsWith(friendlyColor))
            break;
    }
    return moves;
}

function _getMovesKnight(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    // left
    if (pX > 1 && pY > 0)
        if (!(tiles[pY-1][pX-2].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 2, pY - 1));
    if (pX > 0 && pY > 1)
        if (!(tiles[pY-2][pX-1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 1, pY - 2));
    if (pX > 1 && pY < 7)
        if (!(tiles[pY+1][pX-2].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 2, pY + 1));
    if (pX > 0 && pY < 6)
        if (!(tiles[pY+2][pX-1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 1, pY + 2));
    // right
    if (pX < 6 && pY > 0)
        if (!(tiles[pY-1][pX+2].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 2, pY - 1));
    if (pX < 7 && pY > 1)
        if (!(tiles[pY-2][pX+1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 1, pY - 2));
    if (pX < 6 && pY < 7)
        if (!(tiles[pY+1][pX+2].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 2, pY + 1));
    if (pX < 7 && pY < 6)
        if (!(tiles[pY+2][pX+1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 1, pY + 2));
    return moves;
}

function _getMovesBishop(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    for (let o = 1; o < boardSize; o++) {
        if (pX + o > 7 || pY + o > 7)
            break;
        if (tiles[pY + o][pX + o] === "") 
            moves.push(encodePosition(pX + o, pY + o));
        else if (tiles[pY + o][pX + o].endsWith(oppColor)) {
            moves.push(encodePosition(pX + o, pY + o));
            break;
        } else
            break
    }
    for (let o = 1; o < boardSize; o++) {
        if (pX - o < 0 || pY - o < 0)
            break;
        if (tiles[pY - o][pX - o] === "") 
            moves.push(encodePosition(pX - o, pY - o));
        else if (tiles[pY - o][pX - o].endsWith(oppColor)) {
            moves.push(encodePosition(pX - o, pY - o));
            break;
        } else
            break;
    }
    for (let o = 1; o < boardSize; o++) {
        if (pX - o < 0 || pY + o > 7)
            break;
        if (tiles[pY + o][pX - o] === "")
            moves.push(encodePosition(pX - o, pY + o));
        else if (tiles[pY + o][pX - o].endsWith(oppColor)) {
            moves.push(encodePosition(pX - o, pY + o));
            break;
        } else
            break;
    }
    for (let o = 1; o < boardSize; o++) {
        if (pX + o > 7 || pY - o < 0)
            break;
        if (tiles[pY - o][pX + o] === "")
            moves.push(encodePosition(pX + o, pY - o));
        else if (tiles[pY - o][pX + o].endsWith(oppColor)) {
            moves.push(encodePosition(pX + o, pY - o));
            break;
        } else
            break;
    }
    return moves;
}

function _getMovesQueen(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    moves = moves.concat(_getMovesRook(pX, pY, friendlyColor, oppColor));
    moves = moves.concat(_getMovesBishop(pX, pY, friendlyColor, oppColor));
    return moves;
}

function _getMovesKing(pX, pY, friendlyColor, oppColor) {
    let moves = [];
    if (pY > 0)
        if (!(tiles[pY - 1][pX].endsWith(friendlyColor)))
            moves.push(encodePosition(pX, pY - 1));
    if (pY < 7)
        if (!(tiles[pY + 1][pX].endsWith(friendlyColor)))
            moves.push(encodePosition(pX, pY + 1));
    if (pX > 0)
        if (!(tiles[pY][pX - 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 1, pY));
    if (pX < 7)
        if (!(tiles[pY][pX + 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 1, pY));

        // diagonal
    if (pY > 0 && pX > 0)
        if (!(tiles[pY - 1][pX - 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 1, pY - 1));
    if (pY < 7 && pX < 7)
        if (!(tiles[pY + 1][pX + 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 1, pY + 1));
    if (pY < 7 && pX > 0)
        if (!(tiles[pY + 1][pX - 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX - 1, pY + 1));
    if (pY > 0 && pX < 7)
        if (!(tiles[pY - 1][pX + 1].endsWith(friendlyColor)))
            moves.push(encodePosition(pX + 1, pY - 1));

    // filter out moves that king cannot do
    let otherMoves = getEveryMoveOfColor(oppColor);

    moves = arrayDifference(moves, otherMoves);

    return moves;
}

function uncheckMoves(friendlyColor, oppColor) {
    let threats = [];

    let kingPos;
    if (friendlyColor === "W")
        kingPos = kingPosWhite;
    else
        kingPos = kingPosBlack;
    
    let [kX, kY] = decodePosition(kingPos);

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            let moves = [];
            if (tiles[y][x].slice(-1) !== oppColor)
                continue;
            if (tiles[y][x] === "pawnW") {
                moves = moves.concat(_getMovesPawnWhite(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x] === "pawnB") {
                moves = moves.concat(_getMovesPawnBlack(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("rook")) {
                moves = moves.concat(_getMovesRook(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("knight")) {
                moves = moves.concat(_getMovesKnight(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("bishop")) {
                moves = moves.concat(_getMovesBishop(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("queen")) {
                moves = moves.concat(_getMovesQueen(x, y, friendlyColor, oppColor));
            }
            
            moves.forEach(element => {
                let [mX, mY] = decodePosition(element);
                if (mX === kX && mY == kY) {
                    threats += encodePosition(x, y);
                }
            });
        }
    }

    return threats;
}

function checkForCheck(friendlyColor, oppColor) {
    let kingPos;
    if (friendlyColor === "W")
        kingPos = kingPosWhite;
    else
        kingPos = kingPosBlack;
    
    let [kX, kY] = decodePosition(kingPos);

    let anyCheck = false;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            let moves = [];
            if (tiles[y][x].slice(-1) !== oppColor)
                continue;
            if (tiles[y][x] === "pawnW") {
                moves = moves.concat(_getMovesPawnWhite(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x] === "pawnB") {
                moves = moves.concat(_getMovesPawnBlack(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("rook")) {
                moves = moves.concat(_getMovesRook(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("knight")) {
                moves = moves.concat(_getMovesKnight(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("bishop")) {
                moves = moves.concat(_getMovesBishop(x, y, friendlyColor, oppColor));
            } else if (tiles[y][x].startsWith("queen")) {
                moves = moves.concat(_getMovesQueen(x, y, friendlyColor, oppColor));
            }
            
            moves.forEach(element => {
                let [mX, mY] = decodePosition(element);
                if (mX === kX && mY == kY) {
                    if (friendlyColor === "W")
                        check = "white";
                    else
                        check = "black";
                    anyCheck = true;
                    return;
                }
            });
            if (anyCheck)
                break
        }
        if (anyCheck)
            break;
    }

    return;
}

function getEveryMoveOfColor(c) {
    let moves = [];

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (tiles[y][x].slice(-1) !== c)
                continue;
            if (tiles[y][x] === "pawnW") {
                moves = moves.concat(_getMovesPawnWhite(x, y, c, getOppositeColor(c)));
            } else if (tiles[y][x] === "pawnB") {
                moves = moves.concat(_getMovesPawnBlack(x, y, c, getOppositeColor(c)));
            } else if (tiles[y][x].startsWith("rook")) {
                moves = moves.concat(_getMovesRook(x, y, c, getOppositeColor(c)));
            } else if (tiles[y][x].startsWith("knight")) {
                moves = moves.concat(_getMovesKnight(x, y, c, getOppositeColor(c)));
            } else if (tiles[y][x].startsWith("bishop")) {
                moves = moves.concat(_getMovesBishop(x, y, c, getOppositeColor(c)));
            } else if (tiles[y][x].startsWith("queen")) {
                moves = moves.concat(_getMovesQueen(x, y, c, getOppositeColor(c)));
            }
        }
    }
    
    return moves;
}

function arrayDifference(arr1, arr2) {
    return arr1.filter(x=>!arr2.includes(x)); 
}
function arrayIntersect(arr1, arr2) {
    return arr1.filter(x=>arr2.includes(x)); 
} 

function drawPossibleMoves() {
    let possibleMoves = getMoves();
    possibleMoves.forEach((element) => {
        let p = decodePosition(element);
        ctx.fillStyle = "rgba(80, 60, 120, 0.4)";
        ctx.beginPath();
        //console.log(`${x};${y}`);
        ctx.arc((p[0] * tileSize) + tileSize / 2, (p[1] * tileSize) + tileSize / 2, 10, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function encodePosition(x, y) {
    return x << 8 | y;
}

function decodePosition(p, c) {
    let x = p >> 8;
        y = p  & 0xFF;
    return [x, y];
}

function getCheckMoves() {
    return check;
}

function getOppositeColor(c) {
    if (c === "W")
        return "B";
    else if (c === "B")
        return "W";
    else if (c === "white")
        return "black";
    else if (c === "black")
        return "white";
}

function updateInfo() {
    info_fullMoves.innerHTML = `Full moves: ${fullMoves}`;
    if (halfMoveClock >= 50)
        info_halfMoves.innerHTML = `50 move rule end!`;
    else
        info_halfMoves.innerHTML = `Half moves: ${halfMoveClock}`;
    info_turn.innerHTML = `${capitalizeString(turn)} turn`;
    if (check === "")
        info_check.innerHTML = "No Check";
    else
        info_check.innerHTML = `${capitalizeString(check)} check`;
}


function capitalizeString(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function fiftyMoveEnd() {
    info_halfMoves.innerHTML = "50 move rule!";
    LOCK_EVENTS = true;
}