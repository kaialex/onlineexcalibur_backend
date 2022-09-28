export type block = 0 | 1;
export type MinoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type MinoColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface MinoProps {
  name: MinoType;
  blockdata: block[][];
  color: string;
}

export const colorData: { [key in MinoType]: MinoColor } = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

const Mino_I: MinoProps = {
  name: "I",
  blockdata: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  color: "#00FFFF",
};

const Mino_O: MinoProps = {
  name: "O",
  blockdata: [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  color: "#FFFF00",
};

const Mino_T: MinoProps = {
  name: "T",
  blockdata: [
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],
  color: "#FF00FF",
};

const Mino_S: MinoProps = {
  name: "S",
  blockdata: [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 0],
  ],
  color: "#00FF00",
};

const Mino_Z: MinoProps = {
  name: "Z",
  blockdata: [
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  color: "#FF0000",
};

const Mino_J: MinoProps = {
  name: "J",
  blockdata: [
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  color: "#0000FF",
};

const Mino_L: MinoProps = {
  name: "L",
  blockdata: [
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 0],
  ],
  color: "#FFA500",
};

export const MinoData: MinoProps[] = [
  Mino_I,
  Mino_O,
  Mino_T,
  Mino_S,
  Mino_Z,
  Mino_J,
  Mino_L,
];

export const RotateRight = (blockdata: block[][]): block[][] => {
  const newblockdata: block[][] = [];
  for (let i = 0; i < blockdata.length; i++) {
    newblockdata.push([]);
    for (let j = 0; j < blockdata[i].length; j++) {
      newblockdata[i].push(blockdata[j][blockdata.length - i - 1]);
    }
  }
  return newblockdata;
};

export const RotateLeft = (blockdata: block[][]): block[][] => {
  const newblockdata: block[][] = [];
  for (let i = 0; i < blockdata.length; i++) {
    newblockdata.push([]);
    for (let j = 0; j < blockdata[i].length; j++) {
      newblockdata[i].push(blockdata[blockdata.length - j - 1][i]);
    }
  }
  return newblockdata;
};
