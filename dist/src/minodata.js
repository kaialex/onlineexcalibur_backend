"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotateLeft = exports.RotateRight = exports.MinoData = exports.boardData = void 0;
exports.boardData = {
    I: 1,
    O: 2,
    T: 3,
    S: 4,
    Z: 5,
    J: 6,
    L: 7,
};
const Mino_I = {
    name: "I",
    blockdata: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    color: "#00FFFF",
};
const Mino_O = {
    name: "O",
    blockdata: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
    ],
    color: "#FFFF00",
};
const Mino_T = {
    name: "T",
    blockdata: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
    ],
    color: "#FF00FF",
};
const Mino_S = {
    name: "S",
    blockdata: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [0, 0, 0, 0],
    ],
    color: "#00FF00",
};
const Mino_Z = {
    name: "Z",
    blockdata: [
        [0, 0, 0, 0],
        [0, 0, 1, 1],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
    ],
    color: "#FF0000",
};
const Mino_J = {
    name: "J",
    blockdata: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
    ],
    color: "#0000FF",
};
const Mino_L = {
    name: "L",
    blockdata: [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 0, 0, 1],
        [0, 0, 0, 0],
    ],
    color: "#FFA500",
};
exports.MinoData = [
    Mino_I,
    Mino_O,
    Mino_T,
    Mino_S,
    Mino_Z,
    Mino_J,
    Mino_L,
];
const RotateRight = (blockdata) => {
    const newblockdata = [];
    for (let i = 0; i < blockdata.length; i++) {
        newblockdata.push([]);
        for (let j = 0; j < blockdata[i].length; j++) {
            newblockdata[i].push(blockdata[j][blockdata.length - i - 1]);
        }
    }
    return newblockdata;
};
exports.RotateRight = RotateRight;
const RotateLeft = (blockdata) => {
    const newblockdata = [];
    for (let i = 0; i < blockdata.length; i++) {
        newblockdata.push([]);
        for (let j = 0; j < blockdata[i].length; j++) {
            newblockdata[i].push(blockdata[blockdata.length - j - 1][i]);
        }
    }
    return newblockdata;
};
exports.RotateLeft = RotateLeft;
