// Auto-generated Game FPS Data
export type Resolution = '1080p' | '1440p' | '4K';

export interface FpsMetrics {
  avg: number;
  low: number;
}

export const gamesList = [
  "Apex 英雄",
  "三角洲行动",
  "刀塔 2",
  "反恐精英 2",
  "守望先锋 2",
  "我的世界",
  "无畏契约",
  "绝地求生",
  "腐蚀",
  "荒野大镖客：救赎 2",
  "赛博朋克 2077",
  "黑神话：悟空"
];
export const cpuList = [
  "Core i3-12100",
  "Core i3-12300",
  "Core i3-13100",
  "Core i3-14100",
  "Core i5-11600",
  "Core i5-11600K",
  "Core i5-12600",
  "Core i5-12600K",
  "Core i5-13600",
  "Core i5-13600K",
  "Core i5-14400",
  "Core i5-14400F",
  "Core i5-14500",
  "Core i5-14600",
  "Core i5-14600K",
  "Core i5-14600KF",
  "Core i7-11700K",
  "Core i7-12700",
  "Core i7-12700K",
  "Core i7-13700",
  "Core i7-13700K",
  "Core i7-13700KF",
  "Core i7-14700",
  "Core i7-14700F",
  "Core i7-14700K",
  "Core i7-14700KF",
  "Core i9-11900K",
  "Core i9-12900",
  "Core i9-12900K",
  "Core i9-12900KS",
  "Core i9-13900",
  "Core i9-13900K",
  "Core i9-13900KS",
  "Core i9-14900",
  "Core i9-14900F",
  "Core i9-14900K",
  "Core i9-14900KF",
  "Core i9-14900KS",
  "Ryzen 3 5300G",
  "Ryzen 5 5500",
  "Ryzen 5 5600",
  "Ryzen 5 5600X",
  "Ryzen 5 5600X3D",
  "Ryzen 5 7500F",
  "Ryzen 5 7600",
  "Ryzen 5 7600X",
  "Ryzen 7 5800X",
  "Ryzen 7 5800X3D",
  "Ryzen 7 7700",
  "Ryzen 7 7700X",
  "Ryzen 7 7800X3D",
  "Ryzen 9 5900X",
  "Ryzen 9 5950X",
  "Ryzen 9 7900X",
  "Ryzen 9 7900X3D",
  "Ryzen 9 7950X",
  "Ryzen 9 7950X3D",
  "Ryzen 9 9900X",
  "Ryzen 9 9950X",
  "Ryzen 9 9950X3D"
];
export const gpuList = [
  "GeForce RTX 3050",
  "GeForce RTX 3050 6 GB",
  "GeForce RTX 3060",
  "GeForce RTX 3060 8 GB",
  "GeForce RTX 3060 Ti",
  "GeForce RTX 3060 Ti GDDR6X",
  "GeForce RTX 3070",
  "GeForce RTX 3070 Ti",
  "GeForce RTX 3080",
  "GeForce RTX 3080 Ti",
  "GeForce RTX 3090",
  "GeForce RTX 3090 Ti",
  "GeForce RTX 4060",
  "GeForce RTX 4060 Ti",
  "GeForce RTX 4070",
  "GeForce RTX 4070 SUPER",
  "GeForce RTX 4070 Super",
  "GeForce RTX 4070 Ti",
  "GeForce RTX 4070 Ti SUPER",
  "GeForce RTX 4070 Ti Super",
  "GeForce RTX 4080",
  "GeForce RTX 4080 SUPER",
  "GeForce RTX 4080 Super",
  "GeForce RTX 4090",
  "GeForce RTX 4090 D",
  "GeForce RTX 5050",
  "GeForce RTX 5060",
  "GeForce RTX 5060 Ti",
  "GeForce RTX 5070",
  "GeForce RTX 5070 Ti",
  "GeForce RTX 5080",
  "GeForce RTX 5090",
  "RTX 3060 8 GB",
  "RTX 4070 Super",
  "RTX 4070 Ti Super",
  "RTX 4080 Super",
  "RX 6500 XT",
  "RX 970",
  "Radeon RX 6400",
  "Radeon RX 6500 XT",
  "Radeon RX 6600",
  "Radeon RX 6600 XT",
  "Radeon RX 6650 XT",
  "Radeon RX 6700",
  "Radeon RX 6700 XT",
  "Radeon RX 6800",
  "Radeon RX 6800 XT",
  "Radeon RX 6900 XT",
  "Radeon RX 7600",
  "Radeon RX 7600 XT",
  "Radeon RX 7650 GRE",
  "Radeon RX 7700 XT",
  "Radeon RX 7800 XT",
  "Radeon RX 7900 GRE",
  "Radeon RX 7900 XT",
  "Radeon RX 7900 XTX",
  "Radeon RX 8800 XT",
  "Radeon RX 9060 XT",
  "Radeon RX 9060 XT 16GB",
  "Radeon RX 9070",
  "Radeon RX 9070 XT",
  "Radeon RX 970",
  "Radeon RX 9700 XT",
  "Radeon RX 9800 XT"
];

export const gamesFpsData: Record<string, { cpu: Record<string, Partial<Record<Resolution, FpsMetrics>>>, gpu: Record<string, Partial<Record<Resolution, FpsMetrics>>> }> = {
  "Apex 英雄": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 387,
          "low": 252
        },
        "1440p": {
          "avg": 360,
          "low": 233
        },
        "4K": {
          "avg": 286,
          "low": 185
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 387,
          "low": 252
        },
        "1440p": {
          "avg": 360,
          "low": 233
        },
        "4K": {
          "avg": 286,
          "low": 185
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 366,
          "low": 236
        },
        "1440p": {
          "avg": 339,
          "low": 217
        },
        "4K": {
          "avg": 265,
          "low": 169
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 371,
          "low": 239
        },
        "1440p": {
          "avg": 343,
          "low": 221
        },
        "4K": {
          "avg": 270,
          "low": 173
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 358,
          "low": 229
        },
        "1440p": {
          "avg": 330,
          "low": 211
        },
        "4K": {
          "avg": 257,
          "low": 163
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 355,
          "low": 227
        },
        "1440p": {
          "avg": 328,
          "low": 209
        },
        "4K": {
          "avg": 254,
          "low": 161
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 375,
          "low": 242
        },
        "1440p": {
          "avg": 347,
          "low": 224
        },
        "4K": {
          "avg": 273,
          "low": 176
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 375,
          "low": 243
        },
        "1440p": {
          "avg": 348,
          "low": 224
        },
        "4K": {
          "avg": 274,
          "low": 176
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 375,
          "low": 242
        },
        "1440p": {
          "avg": 347,
          "low": 224
        },
        "4K": {
          "avg": 273,
          "low": 176
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 358,
          "low": 230
        },
        "1440p": {
          "avg": 331,
          "low": 211
        },
        "4K": {
          "avg": 257,
          "low": 163
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 361,
          "low": 232
        },
        "1440p": {
          "avg": 334,
          "low": 213
        },
        "4K": {
          "avg": 260,
          "low": 165
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 364,
          "low": 234
        },
        "1440p": {
          "avg": 336,
          "low": 215
        },
        "4K": {
          "avg": 262,
          "low": 167
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 361,
          "low": 232
        },
        "1440p": {
          "avg": 334,
          "low": 213
        },
        "4K": {
          "avg": 260,
          "low": 165
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 358,
          "low": 230
        },
        "1440p": {
          "avg": 331,
          "low": 211
        },
        "4K": {
          "avg": 257,
          "low": 163
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 361,
          "low": 232
        },
        "1440p": {
          "avg": 334,
          "low": 213
        },
        "4K": {
          "avg": 260,
          "low": 165
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 359,
          "low": 230
        },
        "1440p": {
          "avg": 332,
          "low": 212
        },
        "4K": {
          "avg": 258,
          "low": 164
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 359,
          "low": 230
        },
        "1440p": {
          "avg": 332,
          "low": 212
        },
        "4K": {
          "avg": 258,
          "low": 164
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 356,
          "low": 227
        },
        "1440p": {
          "avg": 328,
          "low": 209
        },
        "4K": {
          "avg": 254,
          "low": 161
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 356,
          "low": 228
        },
        "1440p": {
          "avg": 328,
          "low": 209
        },
        "4K": {
          "avg": 255,
          "low": 161
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 355,
          "low": 227
        },
        "1440p": {
          "avg": 328,
          "low": 209
        },
        "4K": {
          "avg": 254,
          "low": 161
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 350,
          "low": 223
        },
        "1440p": {
          "avg": 322,
          "low": 204
        },
        "4K": {
          "avg": 248,
          "low": 156
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 346,
          "low": 220
        },
        "1440p": {
          "avg": 318,
          "low": 201
        },
        "4K": {
          "avg": 245,
          "low": 153
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 346,
          "low": 220
        },
        "1440p": {
          "avg": 318,
          "low": 201
        },
        "4K": {
          "avg": 245,
          "low": 153
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 362,
          "low": 232
        },
        "1440p": {
          "avg": 334,
          "low": 214
        },
        "4K": {
          "avg": 260,
          "low": 166
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 360,
          "low": 231
        },
        "1440p": {
          "avg": 332,
          "low": 212
        },
        "4K": {
          "avg": 258,
          "low": 164
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 360,
          "low": 231
        },
        "1440p": {
          "avg": 332,
          "low": 212
        },
        "4K": {
          "avg": 258,
          "low": 164
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 355,
          "low": 227
        },
        "1440p": {
          "avg": 327,
          "low": 208
        },
        "4K": {
          "avg": 253,
          "low": 160
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 352,
          "low": 225
        },
        "1440p": {
          "avg": 324,
          "low": 206
        },
        "4K": {
          "avg": 250,
          "low": 158
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 357,
          "low": 228
        },
        "1440p": {
          "avg": 329,
          "low": 210
        },
        "4K": {
          "avg": 255,
          "low": 162
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 358,
          "low": 229
        },
        "1440p": {
          "avg": 330,
          "low": 210
        },
        "4K": {
          "avg": 256,
          "low": 162
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 353,
          "low": 226
        },
        "1440p": {
          "avg": 326,
          "low": 207
        },
        "4K": {
          "avg": 252,
          "low": 159
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 348,
          "low": 221
        },
        "1440p": {
          "avg": 320,
          "low": 203
        },
        "4K": {
          "avg": 247,
          "low": 155
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 387,
          "low": 252
        },
        "1440p": {
          "avg": 360,
          "low": 233
        },
        "4K": {
          "avg": 286,
          "low": 185
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 346,
          "low": 230
        },
        "1440p": {
          "avg": 319,
          "low": 211
        },
        "4K": {
          "avg": 245,
          "low": 163
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 346,
          "low": 230
        },
        "1440p": {
          "avg": 319,
          "low": 211
        },
        "4K": {
          "avg": 245,
          "low": 163
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 312,
          "low": 211
        },
        "1440p": {
          "avg": 285,
          "low": 192
        },
        "4K": {
          "avg": 211,
          "low": 144
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 271,
          "low": 187
        },
        "1440p": {
          "avg": 243,
          "low": 168
        },
        "4K": {
          "avg": 169,
          "low": 120
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 260,
          "low": 181
        },
        "1440p": {
          "avg": 232,
          "low": 162
        },
        "4K": {
          "avg": 159,
          "low": 114
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 310,
          "low": 210
        },
        "1440p": {
          "avg": 282,
          "low": 191
        },
        "4K": {
          "avg": 209,
          "low": 143
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 286,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 185,
          "low": 129
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 286,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 185,
          "low": 129
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 286,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 185,
          "low": 129
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 286,
          "low": 196
        },
        "1440p": {
          "avg": 259,
          "low": 178
        },
        "4K": {
          "avg": 185,
          "low": 130
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 261,
          "low": 181
        },
        "1440p": {
          "avg": 233,
          "low": 163
        },
        "4K": {
          "avg": 159,
          "low": 115
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 244,
          "low": 171
        },
        "1440p": {
          "avg": 216,
          "low": 153
        },
        "4K": {
          "avg": 142,
          "low": 105
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 236,
          "low": 167
        },
        "1440p": {
          "avg": 209,
          "low": 148
        },
        "4K": {
          "avg": 135,
          "low": 100
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 249,
          "low": 174
        },
        "1440p": {
          "avg": 221,
          "low": 155
        },
        "4K": {
          "avg": 147,
          "low": 107
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 237,
          "low": 167
        },
        "1440p": {
          "avg": 209,
          "low": 148
        },
        "4K": {
          "avg": 135,
          "low": 100
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 235,
          "low": 166
        },
        "1440p": {
          "avg": 208,
          "low": 147
        },
        "4K": {
          "avg": 134,
          "low": 99
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 216,
          "low": 154
        },
        "1440p": {
          "avg": 188,
          "low": 135
        },
        "4K": {
          "avg": 114,
          "low": 86
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 223,
          "low": 159
        },
        "1440p": {
          "avg": 196,
          "low": 140
        },
        "4K": {
          "avg": 122,
          "low": 91
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 223,
          "low": 159
        },
        "1440p": {
          "avg": 196,
          "low": 140
        },
        "4K": {
          "avg": 122,
          "low": 91
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 213,
          "low": 152
        },
        "1440p": {
          "avg": 186,
          "low": 134
        },
        "4K": {
          "avg": 112,
          "low": 84
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 323,
          "low": 217
        },
        "1440p": {
          "avg": 295,
          "low": 198
        },
        "4K": {
          "avg": 221,
          "low": 150
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 307,
          "low": 208
        },
        "1440p": {
          "avg": 279,
          "low": 189
        },
        "4K": {
          "avg": 205,
          "low": 141
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 285,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 184,
          "low": 129
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 285,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 184,
          "low": 129
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 285,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 184,
          "low": 129
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 285,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 184,
          "low": 129
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 285,
          "low": 196
        },
        "1440p": {
          "avg": 258,
          "low": 177
        },
        "4K": {
          "avg": 184,
          "low": 129
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 273,
          "low": 188
        },
        "1440p": {
          "avg": 245,
          "low": 170
        },
        "4K": {
          "avg": 172,
          "low": 122
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 257,
          "low": 179
        },
        "1440p": {
          "avg": 229,
          "low": 160
        },
        "4K": {
          "avg": 155,
          "low": 112
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 219,
          "low": 156
        },
        "1440p": {
          "avg": 192,
          "low": 138
        },
        "4K": {
          "avg": 118,
          "low": 88
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 218,
          "low": 155
        },
        "1440p": {
          "avg": 190,
          "low": 137
        },
        "4K": {
          "avg": 117,
          "low": 87
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 208,
          "low": 149
        },
        "1440p": {
          "avg": 181,
          "low": 131
        },
        "4K": {
          "avg": 107,
          "low": 80
        }
      }
    }
  },
  "黑神话：悟空": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 104,
          "low": 78
        },
        "4K": {
          "avg": 83,
          "low": 62
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 104,
          "low": 78
        },
        "4K": {
          "avg": 83,
          "low": 62
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 107,
          "low": 80
        },
        "1440p": {
          "avg": 96,
          "low": 72
        },
        "4K": {
          "avg": 75,
          "low": 56
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 109,
          "low": 81
        },
        "1440p": {
          "avg": 98,
          "low": 73
        },
        "4K": {
          "avg": 77,
          "low": 58
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 102,
          "low": 76
        },
        "1440p": {
          "avg": 91,
          "low": 68
        },
        "4K": {
          "avg": 70,
          "low": 52
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 100,
          "low": 75
        },
        "1440p": {
          "avg": 89,
          "low": 67
        },
        "4K": {
          "avg": 68,
          "low": 51
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 110,
          "low": 83
        },
        "1440p": {
          "avg": 100,
          "low": 75
        },
        "4K": {
          "avg": 79,
          "low": 59
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 111,
          "low": 83
        },
        "1440p": {
          "avg": 100,
          "low": 75
        },
        "4K": {
          "avg": 79,
          "low": 59
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 110,
          "low": 83
        },
        "1440p": {
          "avg": 100,
          "low": 75
        },
        "4K": {
          "avg": 79,
          "low": 59
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 102,
          "low": 76
        },
        "1440p": {
          "avg": 91,
          "low": 68
        },
        "4K": {
          "avg": 70,
          "low": 52
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 104,
          "low": 78
        },
        "1440p": {
          "avg": 93,
          "low": 70
        },
        "4K": {
          "avg": 72,
          "low": 54
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 105,
          "low": 79
        },
        "1440p": {
          "avg": 95,
          "low": 71
        },
        "4K": {
          "avg": 73,
          "low": 55
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 104,
          "low": 78
        },
        "1440p": {
          "avg": 93,
          "low": 70
        },
        "4K": {
          "avg": 72,
          "low": 54
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 102,
          "low": 76
        },
        "1440p": {
          "avg": 91,
          "low": 68
        },
        "4K": {
          "avg": 70,
          "low": 52
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 104,
          "low": 78
        },
        "1440p": {
          "avg": 93,
          "low": 70
        },
        "4K": {
          "avg": 72,
          "low": 54
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 103,
          "low": 77
        },
        "1440p": {
          "avg": 92,
          "low": 69
        },
        "4K": {
          "avg": 71,
          "low": 53
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 103,
          "low": 77
        },
        "1440p": {
          "avg": 92,
          "low": 69
        },
        "4K": {
          "avg": 71,
          "low": 53
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 100,
          "low": 75
        },
        "1440p": {
          "avg": 89,
          "low": 67
        },
        "4K": {
          "avg": 68,
          "low": 51
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 100,
          "low": 75
        },
        "1440p": {
          "avg": 90,
          "low": 67
        },
        "4K": {
          "avg": 69,
          "low": 51
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 100,
          "low": 75
        },
        "1440p": {
          "avg": 89,
          "low": 67
        },
        "4K": {
          "avg": 68,
          "low": 51
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 95,
          "low": 71
        },
        "1440p": {
          "avg": 85,
          "low": 63
        },
        "4K": {
          "avg": 63,
          "low": 47
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 92,
          "low": 69
        },
        "1440p": {
          "avg": 81,
          "low": 61
        },
        "4K": {
          "avg": 60,
          "low": 45
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 92,
          "low": 69
        },
        "1440p": {
          "avg": 81,
          "low": 61
        },
        "4K": {
          "avg": 60,
          "low": 45
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 104,
          "low": 78
        },
        "1440p": {
          "avg": 93,
          "low": 70
        },
        "4K": {
          "avg": 72,
          "low": 54
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 103,
          "low": 77
        },
        "1440p": {
          "avg": 92,
          "low": 69
        },
        "4K": {
          "avg": 71,
          "low": 53
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 103,
          "low": 77
        },
        "1440p": {
          "avg": 92,
          "low": 69
        },
        "4K": {
          "avg": 71,
          "low": 53
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 99,
          "low": 74
        },
        "1440p": {
          "avg": 89,
          "low": 66
        },
        "4K": {
          "avg": 68,
          "low": 51
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 97,
          "low": 73
        },
        "1440p": {
          "avg": 87,
          "low": 65
        },
        "4K": {
          "avg": 65,
          "low": 49
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 101,
          "low": 76
        },
        "1440p": {
          "avg": 90,
          "low": 68
        },
        "4K": {
          "avg": 69,
          "low": 52
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 101,
          "low": 76
        },
        "1440p": {
          "avg": 91,
          "low": 68
        },
        "4K": {
          "avg": 70,
          "low": 52
        }
      },
      "Core i5-13600K": {
        "1440p": {
          "avg": 88,
          "low": 66
        },
        "4K": {
          "avg": 67,
          "low": 50
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 94,
          "low": 70
        },
        "1440p": {
          "avg": 83,
          "low": 62
        },
        "4K": {
          "avg": 62,
          "low": 46
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 104,
          "low": 78
        },
        "4K": {
          "avg": 83,
          "low": 62
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 92,
          "low": 69
        },
        "1440p": {
          "avg": 81,
          "low": 61
        },
        "4K": {
          "avg": 60,
          "low": 45
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 92,
          "low": 69
        },
        "1440p": {
          "avg": 81,
          "low": 61
        },
        "4K": {
          "avg": 60,
          "low": 45
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 76,
          "low": 57
        },
        "1440p": {
          "avg": 65,
          "low": 49
        },
        "4K": {
          "avg": 44,
          "low": 33
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 59,
          "low": 44
        },
        "1440p": {
          "avg": 48,
          "low": 36
        },
        "4K": {
          "avg": 27,
          "low": 20
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 55,
          "low": 41
        },
        "1440p": {
          "avg": 44,
          "low": 33
        },
        "4K": {
          "avg": 23,
          "low": 17
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 75,
          "low": 56
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 43,
          "low": 32
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 75,
          "low": 56
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 43,
          "low": 32
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 75,
          "low": 56
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 43,
          "low": 32
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 75,
          "low": 56
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 43,
          "low": 32
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 65,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 41
        },
        "4K": {
          "avg": 33,
          "low": 25
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 55,
          "low": 41
        },
        "1440p": {
          "avg": 44,
          "low": 33
        },
        "4K": {
          "avg": 23,
          "low": 17
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 49,
          "low": 37
        },
        "1440p": {
          "avg": 38,
          "low": 29
        },
        "4K": {
          "avg": 17,
          "low": 13
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 46,
          "low": 35
        },
        "1440p": {
          "avg": 36,
          "low": 27
        },
        "4K": {
          "avg": 14,
          "low": 11
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 51,
          "low": 38
        },
        "1440p": {
          "avg": 40,
          "low": 30
        },
        "4K": {
          "avg": 19,
          "low": 14
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 46,
          "low": 35
        },
        "1440p": {
          "avg": 36,
          "low": 27
        },
        "4K": {
          "avg": 15,
          "low": 11
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 46,
          "low": 34
        },
        "1440p": {
          "avg": 35,
          "low": 26
        },
        "4K": {
          "avg": 14,
          "low": 10
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 39,
          "low": 29
        },
        "1440p": {
          "avg": 29,
          "low": 21
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 42,
          "low": 31
        },
        "1440p": {
          "avg": 31,
          "low": 23
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 42,
          "low": 31
        },
        "1440p": {
          "avg": 31,
          "low": 23
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 39,
          "low": 29
        },
        "1440p": {
          "avg": 28,
          "low": 21
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 81,
          "low": 60
        },
        "1440p": {
          "avg": 70,
          "low": 52
        },
        "4K": {
          "avg": 49,
          "low": 36
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 73,
          "low": 55
        },
        "1440p": {
          "avg": 63,
          "low": 47
        },
        "4K": {
          "avg": 41,
          "low": 31
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 64,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 33,
          "low": 24
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 64,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 33,
          "low": 24
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 64,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 33,
          "low": 24
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 64,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 33,
          "low": 24
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 64,
          "low": 48
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 33,
          "low": 24
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 60,
          "low": 45
        },
        "1440p": {
          "avg": 49,
          "low": 37
        },
        "4K": {
          "avg": 28,
          "low": 21
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 54,
          "low": 40
        },
        "1440p": {
          "avg": 43,
          "low": 32
        },
        "4K": {
          "avg": 22,
          "low": 16
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 41,
          "low": 30
        },
        "1440p": {
          "avg": 30,
          "low": 22
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 40,
          "low": 30
        },
        "1440p": {
          "avg": 30,
          "low": 22
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 37,
          "low": 28
        },
        "1440p": {
          "avg": 26,
          "low": 20
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      }
    }
  },
  "赛博朋克 2077": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 123,
          "low": 77
        },
        "1440p": {
          "avg": 102,
          "low": 61
        },
        "4K": {
          "avg": 51,
          "low": 24
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 123,
          "low": 77
        },
        "1440p": {
          "avg": 102,
          "low": 61
        },
        "4K": {
          "avg": 51,
          "low": 24
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 116,
          "low": 67
        },
        "1440p": {
          "avg": 95,
          "low": 51
        },
        "4K": {
          "avg": 44,
          "low": 13
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 118,
          "low": 70
        },
        "1440p": {
          "avg": 97,
          "low": 54
        },
        "4K": {
          "avg": 46,
          "low": 16
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 112,
          "low": 62
        },
        "1440p": {
          "avg": 91,
          "low": 46
        },
        "4K": {
          "avg": 40,
          "low": 10
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 110,
          "low": 60
        },
        "1440p": {
          "avg": 89,
          "low": 44
        },
        "4K": {
          "avg": 39,
          "low": 10
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 119,
          "low": 72
        },
        "1440p": {
          "avg": 98,
          "low": 56
        },
        "4K": {
          "avg": 47,
          "low": 18
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 119,
          "low": 72
        },
        "1440p": {
          "avg": 98,
          "low": 56
        },
        "4K": {
          "avg": 47,
          "low": 18
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 119,
          "low": 72
        },
        "1440p": {
          "avg": 98,
          "low": 56
        },
        "4K": {
          "avg": 47,
          "low": 18
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 112,
          "low": 62
        },
        "1440p": {
          "avg": 91,
          "low": 47
        },
        "4K": {
          "avg": 40,
          "low": 10
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 114,
          "low": 64
        },
        "1440p": {
          "avg": 93,
          "low": 49
        },
        "4K": {
          "avg": 42,
          "low": 11
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 115,
          "low": 66
        },
        "1440p": {
          "avg": 94,
          "low": 50
        },
        "4K": {
          "avg": 43,
          "low": 12
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 114,
          "low": 64
        },
        "1440p": {
          "avg": 93,
          "low": 49
        },
        "4K": {
          "avg": 42,
          "low": 11
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 112,
          "low": 62
        },
        "1440p": {
          "avg": 91,
          "low": 46
        },
        "4K": {
          "avg": 40,
          "low": 10
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 114,
          "low": 64
        },
        "1440p": {
          "avg": 93,
          "low": 49
        },
        "4K": {
          "avg": 42,
          "low": 11
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 112,
          "low": 63
        },
        "1440p": {
          "avg": 92,
          "low": 47
        },
        "4K": {
          "avg": 41,
          "low": 10
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 112,
          "low": 63
        },
        "1440p": {
          "avg": 92,
          "low": 47
        },
        "4K": {
          "avg": 41,
          "low": 10
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 110,
          "low": 60
        },
        "1440p": {
          "avg": 90,
          "low": 45
        },
        "4K": {
          "avg": 39,
          "low": 10
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 111,
          "low": 61
        },
        "1440p": {
          "avg": 90,
          "low": 45
        },
        "4K": {
          "avg": 39,
          "low": 10
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 110,
          "low": 60
        },
        "1440p": {
          "avg": 89,
          "low": 44
        },
        "4K": {
          "avg": 39,
          "low": 10
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 107,
          "low": 56
        },
        "1440p": {
          "avg": 86,
          "low": 40
        },
        "4K": {
          "avg": 35,
          "low": 10
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 104,
          "low": 53
        },
        "1440p": {
          "avg": 83,
          "low": 37
        },
        "4K": {
          "avg": 32,
          "low": 10
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 104,
          "low": 53
        },
        "1440p": {
          "avg": 83,
          "low": 37
        },
        "4K": {
          "avg": 32,
          "low": 10
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 114,
          "low": 64
        },
        "1440p": {
          "avg": 93,
          "low": 49
        },
        "4K": {
          "avg": 42,
          "low": 11
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 113,
          "low": 63
        },
        "1440p": {
          "avg": 92,
          "low": 47
        },
        "4K": {
          "avg": 41,
          "low": 10
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 113,
          "low": 63
        },
        "1440p": {
          "avg": 92,
          "low": 47
        },
        "4K": {
          "avg": 41,
          "low": 10
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 110,
          "low": 60
        },
        "1440p": {
          "avg": 89,
          "low": 44
        },
        "4K": {
          "avg": 38,
          "low": 10
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 108,
          "low": 58
        },
        "1440p": {
          "avg": 87,
          "low": 42
        },
        "4K": {
          "avg": 37,
          "low": 10
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 111,
          "low": 61
        },
        "1440p": {
          "avg": 90,
          "low": 46
        },
        "4K": {
          "avg": 39,
          "low": 10
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 112,
          "low": 62
        },
        "1440p": {
          "avg": 91,
          "low": 46
        },
        "4K": {
          "avg": 40,
          "low": 10
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 109,
          "low": 59
        },
        "1440p": {
          "avg": 88,
          "low": 43
        },
        "4K": {
          "avg": 37,
          "low": 10
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 106,
          "low": 55
        },
        "1440p": {
          "avg": 85,
          "low": 39
        },
        "4K": {
          "avg": 34,
          "low": 10
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 123,
          "low": 77
        },
        "1440p": {
          "avg": 102,
          "low": 61
        },
        "4K": {
          "avg": 51,
          "low": 24
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 98,
          "low": 70
        },
        "1440p": {
          "avg": 77,
          "low": 55
        },
        "4K": {
          "avg": 26,
          "low": 17
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 98,
          "low": 70
        },
        "1440p": {
          "avg": 77,
          "low": 55
        },
        "4K": {
          "avg": 26,
          "low": 17
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 76,
          "low": 57
        },
        "1440p": {
          "avg": 55,
          "low": 41
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 48,
          "low": 36
        },
        "1440p": {
          "avg": 27,
          "low": 20
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 40,
          "low": 30
        },
        "1440p": {
          "avg": 19,
          "low": 14
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 74,
          "low": 56
        },
        "1440p": {
          "avg": 54,
          "low": 40
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 28
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 28
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 28
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 58,
          "low": 44
        },
        "1440p": {
          "avg": 37,
          "low": 28
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 41,
          "low": 30
        },
        "1440p": {
          "avg": 20,
          "low": 15
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 29,
          "low": 22
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 24,
          "low": 18
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 33,
          "low": 24
        },
        "1440p": {
          "avg": 12,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 24,
          "low": 18
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 23,
          "low": 17
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 62,
          "low": 48
        },
        "1440p": {
          "avg": 42,
          "low": 32
        },
        "4K": {
          "avg": 20,
          "low": 15
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 15,
          "low": 11
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 15,
          "low": 11
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 68,
          "low": 45
        },
        "1440p": {
          "avg": 45,
          "low": 30
        },
        "4K": {
          "avg": 22,
          "low": 15
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 83,
          "low": 62
        },
        "1440p": {
          "avg": 62,
          "low": 46
        },
        "4K": {
          "avg": 11,
          "low": 10
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 72,
          "low": 54
        },
        "1440p": {
          "avg": 51,
          "low": 38
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 27
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 27
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 27
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 27
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 58,
          "low": 43
        },
        "1440p": {
          "avg": 37,
          "low": 27
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 49,
          "low": 37
        },
        "1440p": {
          "avg": 28,
          "low": 21
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 38,
          "low": 28
        },
        "1440p": {
          "avg": 17,
          "low": 13
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 13,
          "low": 10
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 12,
          "low": 10
        },
        "1440p": {
          "avg": 10,
          "low": 10
        },
        "4K": {
          "avg": 10,
          "low": 10
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 45,
          "low": 33
        },
        "1440p": {
          "avg": 30,
          "low": 22
        },
        "4K": {
          "avg": 14,
          "low": 10
        }
      }
    }
  },
  "刀塔 2": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 399,
          "low": 195
        },
        "1440p": {
          "avg": 399,
          "low": 192
        },
        "4K": {
          "avg": 372,
          "low": 174
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 399,
          "low": 195
        },
        "1440p": {
          "avg": 399,
          "low": 192
        },
        "4K": {
          "avg": 372,
          "low": 174
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 309,
          "low": 158
        },
        "1440p": {
          "avg": 309,
          "low": 155
        },
        "4K": {
          "avg": 281,
          "low": 137
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 329,
          "low": 166
        },
        "1440p": {
          "avg": 329,
          "low": 163
        },
        "4K": {
          "avg": 301,
          "low": 145
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 275,
          "low": 144
        },
        "1440p": {
          "avg": 274,
          "low": 141
        },
        "4K": {
          "avg": 247,
          "low": 123
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 263,
          "low": 140
        },
        "1440p": {
          "avg": 263,
          "low": 137
        },
        "4K": {
          "avg": 236,
          "low": 119
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 345,
          "low": 172
        },
        "1440p": {
          "avg": 345,
          "low": 170
        },
        "4K": {
          "avg": 318,
          "low": 151
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 348,
          "low": 174
        },
        "1440p": {
          "avg": 348,
          "low": 171
        },
        "4K": {
          "avg": 320,
          "low": 152
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 345,
          "low": 172
        },
        "1440p": {
          "avg": 345,
          "low": 170
        },
        "4K": {
          "avg": 318,
          "low": 151
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 276,
          "low": 145
        },
        "1440p": {
          "avg": 276,
          "low": 142
        },
        "4K": {
          "avg": 249,
          "low": 124
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 289,
          "low": 150
        },
        "1440p": {
          "avg": 289,
          "low": 147
        },
        "4K": {
          "avg": 262,
          "low": 129
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 298,
          "low": 153
        },
        "1440p": {
          "avg": 298,
          "low": 150
        },
        "4K": {
          "avg": 270,
          "low": 132
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 289,
          "low": 150
        },
        "1440p": {
          "avg": 289,
          "low": 147
        },
        "4K": {
          "avg": 262,
          "low": 129
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 276,
          "low": 145
        },
        "1440p": {
          "avg": 276,
          "low": 142
        },
        "4K": {
          "avg": 248,
          "low": 124
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 289,
          "low": 150
        },
        "1440p": {
          "avg": 289,
          "low": 147
        },
        "4K": {
          "avg": 262,
          "low": 129
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 280,
          "low": 146
        },
        "1440p": {
          "avg": 280,
          "low": 143
        },
        "4K": {
          "avg": 253,
          "low": 125
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 280,
          "low": 146
        },
        "1440p": {
          "avg": 280,
          "low": 143
        },
        "4K": {
          "avg": 253,
          "low": 125
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 265,
          "low": 140
        },
        "1440p": {
          "avg": 265,
          "low": 137
        },
        "4K": {
          "avg": 237,
          "low": 119
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 267,
          "low": 141
        },
        "1440p": {
          "avg": 267,
          "low": 138
        },
        "4K": {
          "avg": 239,
          "low": 120
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 263,
          "low": 140
        },
        "1440p": {
          "avg": 263,
          "low": 137
        },
        "4K": {
          "avg": 236,
          "low": 119
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 240,
          "low": 131
        },
        "1440p": {
          "avg": 240,
          "low": 128
        },
        "4K": {
          "avg": 213,
          "low": 110
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 225,
          "low": 125
        },
        "1440p": {
          "avg": 225,
          "low": 123
        },
        "4K": {
          "avg": 198,
          "low": 104
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 225,
          "low": 125
        },
        "1440p": {
          "avg": 225,
          "low": 123
        },
        "4K": {
          "avg": 198,
          "low": 104
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 290,
          "low": 150
        },
        "1440p": {
          "avg": 290,
          "low": 147
        },
        "4K": {
          "avg": 263,
          "low": 129
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 281,
          "low": 147
        },
        "1440p": {
          "avg": 281,
          "low": 144
        },
        "4K": {
          "avg": 254,
          "low": 126
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 281,
          "low": 147
        },
        "1440p": {
          "avg": 281,
          "low": 144
        },
        "4K": {
          "avg": 254,
          "low": 126
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 262,
          "low": 139
        },
        "1440p": {
          "avg": 261,
          "low": 136
        },
        "4K": {
          "avg": 234,
          "low": 118
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 250,
          "low": 135
        },
        "1440p": {
          "avg": 250,
          "low": 132
        },
        "4K": {
          "avg": 222,
          "low": 114
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 270,
          "low": 143
        },
        "1440p": {
          "avg": 270,
          "low": 140
        },
        "4K": {
          "avg": 243,
          "low": 121
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 273,
          "low": 143
        },
        "1440p": {
          "avg": 273,
          "low": 141
        },
        "4K": {
          "avg": 245,
          "low": 122
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 256,
          "low": 137
        },
        "1440p": {
          "avg": 256,
          "low": 134
        },
        "4K": {
          "avg": 229,
          "low": 116
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 234,
          "low": 129
        },
        "1440p": {
          "avg": 234,
          "low": 126
        },
        "4K": {
          "avg": 206,
          "low": 107
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 401,
          "low": 196
        },
        "1440p": {
          "avg": 401,
          "low": 193
        },
        "4K": {
          "avg": 374,
          "low": 175
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 403,
          "low": 198
        },
        "1440p": {
          "avg": 402,
          "low": 195
        },
        "4K": {
          "avg": 375,
          "low": 177
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 403,
          "low": 198
        },
        "1440p": {
          "avg": 402,
          "low": 195
        },
        "4K": {
          "avg": 375,
          "low": 177
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 398,
          "low": 194
        },
        "1440p": {
          "avg": 398,
          "low": 191
        },
        "4K": {
          "avg": 370,
          "low": 173
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 386,
          "low": 184
        },
        "1440p": {
          "avg": 386,
          "low": 181
        },
        "4K": {
          "avg": 358,
          "low": 163
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 382,
          "low": 180
        },
        "1440p": {
          "avg": 382,
          "low": 177
        },
        "4K": {
          "avg": 355,
          "low": 159
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 397,
          "low": 194
        },
        "1440p": {
          "avg": 397,
          "low": 191
        },
        "4K": {
          "avg": 370,
          "low": 173
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 364,
          "low": 167
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 382,
          "low": 181
        },
        "1440p": {
          "avg": 382,
          "low": 178
        },
        "4K": {
          "avg": 355,
          "low": 159
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 376,
          "low": 175
        },
        "1440p": {
          "avg": 376,
          "low": 172
        },
        "4K": {
          "avg": 348,
          "low": 154
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 373,
          "low": 172
        },
        "1440p": {
          "avg": 373,
          "low": 169
        },
        "4K": {
          "avg": 345,
          "low": 151
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 378,
          "low": 176
        },
        "1440p": {
          "avg": 378,
          "low": 174
        },
        "4K": {
          "avg": 350,
          "low": 155
        }
      },
      "GeForce RTX 5060": {
        "1440p": {
          "avg": 373,
          "low": 169
        },
        "4K": {
          "avg": 345,
          "low": 151
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 372,
          "low": 172
        },
        "1440p": {
          "avg": 372,
          "low": 169
        },
        "4K": {
          "avg": 345,
          "low": 151
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 364,
          "low": 164
        },
        "1440p": {
          "avg": 364,
          "low": 162
        },
        "4K": {
          "avg": 336,
          "low": 143
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 367,
          "low": 167
        },
        "1440p": {
          "avg": 367,
          "low": 164
        },
        "4K": {
          "avg": 340,
          "low": 146
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 367,
          "low": 167
        },
        "1440p": {
          "avg": 367,
          "low": 164
        },
        "4K": {
          "avg": 340,
          "low": 146
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 362,
          "low": 163
        },
        "1440p": {
          "avg": 362,
          "low": 161
        },
        "4K": {
          "avg": 335,
          "low": 142
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 400,
          "low": 196
        },
        "1440p": {
          "avg": 400,
          "low": 193
        },
        "4K": {
          "avg": 372,
          "low": 175
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 396,
          "low": 193
        },
        "1440p": {
          "avg": 396,
          "low": 190
        },
        "4K": {
          "avg": 369,
          "low": 172
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 391,
          "low": 188
        },
        "1440p": {
          "avg": 391,
          "low": 185
        },
        "4K": {
          "avg": 363,
          "low": 167
        }
      },
      "Radeon RX 7800 XT": {
        "4K": {
          "avg": 359,
          "low": 163
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 381,
          "low": 179
        },
        "1440p": {
          "avg": 381,
          "low": 176
        },
        "4K": {
          "avg": 353,
          "low": 158
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 365,
          "low": 166
        },
        "1440p": {
          "avg": 365,
          "low": 163
        },
        "4K": {
          "avg": 338,
          "low": 145
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 365,
          "low": 165
        },
        "1440p": {
          "avg": 365,
          "low": 162
        },
        "4K": {
          "avg": 337,
          "low": 144
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 360,
          "low": 162
        },
        "1440p": {
          "avg": 360,
          "low": 159
        },
        "4K": {
          "avg": 333,
          "low": 141
        }
      }
    }
  },
  "守望先锋 2": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 551,
          "low": 325
        },
        "1440p": {
          "avg": 507,
          "low": 300
        },
        "4K": {
          "avg": 403,
          "low": 240
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 551,
          "low": 325
        },
        "1440p": {
          "avg": 507,
          "low": 300
        },
        "4K": {
          "avg": 403,
          "low": 240
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 519,
          "low": 291
        },
        "1440p": {
          "avg": 476,
          "low": 266
        },
        "4K": {
          "avg": 371,
          "low": 206
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 527,
          "low": 299
        },
        "1440p": {
          "avg": 483,
          "low": 273
        },
        "4K": {
          "avg": 379,
          "low": 213
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 506,
          "low": 279
        },
        "1440p": {
          "avg": 462,
          "low": 254
        },
        "4K": {
          "avg": 358,
          "low": 193
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 501,
          "low": 275
        },
        "1440p": {
          "avg": 457,
          "low": 250
        },
        "4K": {
          "avg": 353,
          "low": 189
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 533,
          "low": 305
        },
        "1440p": {
          "avg": 489,
          "low": 279
        },
        "4K": {
          "avg": 385,
          "low": 219
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 534,
          "low": 306
        },
        "1440p": {
          "avg": 490,
          "low": 280
        },
        "4K": {
          "avg": 386,
          "low": 220
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 533,
          "low": 305
        },
        "1440p": {
          "avg": 489,
          "low": 279
        },
        "4K": {
          "avg": 385,
          "low": 219
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 507,
          "low": 279
        },
        "1440p": {
          "avg": 463,
          "low": 254
        },
        "4K": {
          "avg": 359,
          "low": 194
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 512,
          "low": 284
        },
        "1440p": {
          "avg": 468,
          "low": 259
        },
        "4K": {
          "avg": 364,
          "low": 199
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 515,
          "low": 287
        },
        "1440p": {
          "avg": 471,
          "low": 262
        },
        "4K": {
          "avg": 367,
          "low": 202
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 512,
          "low": 284
        },
        "1440p": {
          "avg": 468,
          "low": 259
        },
        "4K": {
          "avg": 364,
          "low": 199
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 506,
          "low": 279
        },
        "1440p": {
          "avg": 463,
          "low": 254
        },
        "4K": {
          "avg": 358,
          "low": 194
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 512,
          "low": 284
        },
        "1440p": {
          "avg": 468,
          "low": 259
        },
        "4K": {
          "avg": 364,
          "low": 199
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 508,
          "low": 281
        },
        "1440p": {
          "avg": 464,
          "low": 256
        },
        "4K": {
          "avg": 360,
          "low": 195
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 508,
          "low": 281
        },
        "1440p": {
          "avg": 464,
          "low": 256
        },
        "4K": {
          "avg": 360,
          "low": 195
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 502,
          "low": 275
        },
        "1440p": {
          "avg": 458,
          "low": 250
        },
        "4K": {
          "avg": 354,
          "low": 190
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 503,
          "low": 276
        },
        "1440p": {
          "avg": 459,
          "low": 251
        },
        "4K": {
          "avg": 355,
          "low": 191
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 501,
          "low": 275
        },
        "1440p": {
          "avg": 457,
          "low": 250
        },
        "4K": {
          "avg": 353,
          "low": 189
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 491,
          "low": 267
        },
        "1440p": {
          "avg": 447,
          "low": 242
        },
        "4K": {
          "avg": 343,
          "low": 182
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 484,
          "low": 262
        },
        "1440p": {
          "avg": 440,
          "low": 237
        },
        "4K": {
          "avg": 336,
          "low": 177
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 484,
          "low": 262
        },
        "1440p": {
          "avg": 440,
          "low": 237
        },
        "4K": {
          "avg": 336,
          "low": 177
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 512,
          "low": 284
        },
        "1440p": {
          "avg": 468,
          "low": 259
        },
        "4K": {
          "avg": 364,
          "low": 199
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 509,
          "low": 281
        },
        "1440p": {
          "avg": 465,
          "low": 256
        },
        "4K": {
          "avg": 361,
          "low": 196
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 509,
          "low": 281
        },
        "1440p": {
          "avg": 465,
          "low": 256
        },
        "4K": {
          "avg": 361,
          "low": 196
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 500,
          "low": 274
        },
        "1440p": {
          "avg": 457,
          "low": 249
        },
        "4K": {
          "avg": 352,
          "low": 189
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 495,
          "low": 270
        },
        "1440p": {
          "avg": 452,
          "low": 245
        },
        "4K": {
          "avg": 347,
          "low": 185
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 504,
          "low": 277
        },
        "1440p": {
          "avg": 460,
          "low": 252
        },
        "4K": {
          "avg": 356,
          "low": 192
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 505,
          "low": 278
        },
        "1440p": {
          "avg": 461,
          "low": 253
        },
        "4K": {
          "avg": 357,
          "low": 193
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 498,
          "low": 272
        },
        "1440p": {
          "avg": 454,
          "low": 247
        },
        "4K": {
          "avg": 350,
          "low": 187
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 488,
          "low": 265
        },
        "1440p": {
          "avg": 444,
          "low": 240
        },
        "4K": {
          "avg": 340,
          "low": 180
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 552,
          "low": 326
        },
        "1440p": {
          "avg": 508,
          "low": 301
        },
        "4K": {
          "avg": 404,
          "low": 240
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 481,
          "low": 297
        },
        "1440p": {
          "avg": 437,
          "low": 272
        },
        "4K": {
          "avg": 333,
          "low": 211
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 481,
          "low": 297
        },
        "1440p": {
          "avg": 481,
          "low": 297
        },
        "4K": {
          "avg": 333,
          "low": 211
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 422,
          "low": 272
        },
        "1440p": {
          "avg": 379,
          "low": 246
        },
        "4K": {
          "avg": 274,
          "low": 186
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 352,
          "low": 239
        },
        "1440p": {
          "avg": 308,
          "low": 214
        },
        "4K": {
          "avg": 204,
          "low": 153
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 334,
          "low": 230
        },
        "1440p": {
          "avg": 290,
          "low": 205
        },
        "4K": {
          "avg": 186,
          "low": 139
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 419,
          "low": 270
        },
        "1440p": {
          "avg": 375,
          "low": 245
        },
        "4K": {
          "avg": 271,
          "low": 185
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 378,
          "low": 251
        },
        "1440p": {
          "avg": 334,
          "low": 226
        },
        "4K": {
          "avg": 230,
          "low": 166
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 378,
          "low": 251
        },
        "1440p": {
          "avg": 334,
          "low": 226
        },
        "4K": {
          "avg": 230,
          "low": 166
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 378,
          "low": 251
        },
        "1440p": {
          "avg": 334,
          "low": 226
        },
        "4K": {
          "avg": 230,
          "low": 166
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 378,
          "low": 252
        },
        "1440p": {
          "avg": 335,
          "low": 226
        },
        "4K": {
          "avg": 230,
          "low": 166
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 335,
          "low": 231
        },
        "1440p": {
          "avg": 291,
          "low": 206
        },
        "4K": {
          "avg": 187,
          "low": 140
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 307,
          "low": 217
        },
        "1440p": {
          "avg": 263,
          "low": 191
        },
        "4K": {
          "avg": 159,
          "low": 119
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 294,
          "low": 210
        },
        "1440p": {
          "avg": 250,
          "low": 185
        },
        "4K": {
          "avg": 146,
          "low": 109
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 315,
          "low": 221
        },
        "1440p": {
          "avg": 271,
          "low": 195
        },
        "4K": {
          "avg": 167,
          "low": 125
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 295,
          "low": 210
        },
        "1440p": {
          "avg": 251,
          "low": 185
        },
        "4K": {
          "avg": 147,
          "low": 110
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 292,
          "low": 209
        },
        "1440p": {
          "avg": 249,
          "low": 184
        },
        "4K": {
          "avg": 144,
          "low": 108
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 260,
          "low": 192
        },
        "1440p": {
          "avg": 216,
          "low": 162
        },
        "4K": {
          "avg": 112,
          "low": 84
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 273,
          "low": 199
        },
        "1440p": {
          "avg": 229,
          "low": 172
        },
        "4K": {
          "avg": 125,
          "low": 93
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 273,
          "low": 199
        },
        "1440p": {
          "avg": 229,
          "low": 172
        },
        "4K": {
          "avg": 125,
          "low": 93
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 256,
          "low": 189
        },
        "1440p": {
          "avg": 212,
          "low": 159
        },
        "4K": {
          "avg": 108,
          "low": 81
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 441,
          "low": 280
        },
        "1440p": {
          "avg": 397,
          "low": 255
        },
        "4K": {
          "avg": 293,
          "low": 194
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 413,
          "low": 267
        },
        "1440p": {
          "avg": 369,
          "low": 242
        },
        "4K": {
          "avg": 265,
          "low": 182
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 376,
          "low": 251
        },
        "1440p": {
          "avg": 333,
          "low": 225
        },
        "4K": {
          "avg": 228,
          "low": 165
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 376,
          "low": 251
        },
        "1440p": {
          "avg": 333,
          "low": 225
        },
        "4K": {
          "avg": 228,
          "low": 165
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 376,
          "low": 251
        },
        "1440p": {
          "avg": 333,
          "low": 225
        },
        "4K": {
          "avg": 228,
          "low": 165
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 376,
          "low": 251
        },
        "1440p": {
          "avg": 333,
          "low": 225
        },
        "4K": {
          "avg": 228,
          "low": 165
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 376,
          "low": 251
        },
        "1440p": {
          "avg": 333,
          "low": 225
        },
        "4K": {
          "avg": 228,
          "low": 165
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 356,
          "low": 241
        },
        "1440p": {
          "avg": 312,
          "low": 216
        },
        "4K": {
          "avg": 208,
          "low": 155
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 329,
          "low": 228
        },
        "1440p": {
          "avg": 285,
          "low": 202
        },
        "4K": {
          "avg": 180,
          "low": 135
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 266,
          "low": 195
        },
        "1440p": {
          "avg": 223,
          "low": 167
        },
        "4K": {
          "avg": 118,
          "low": 89
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 264,
          "low": 194
        },
        "1440p": {
          "avg": 220,
          "low": 165
        },
        "4K": {
          "avg": 116,
          "low": 87
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 248,
          "low": 185
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 100,
          "low": 75
        }
      }
    }
  },
  "绝地求生": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 439,
          "low": 103
        },
        "1440p": {
          "avg": 415,
          "low": 89
        },
        "4K": {
          "avg": 356,
          "low": 54
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 439,
          "low": 103
        },
        "1440p": {
          "avg": 415,
          "low": 89
        },
        "4K": {
          "avg": 356,
          "low": 54
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 405,
          "low": 102
        },
        "1440p": {
          "avg": 381,
          "low": 89
        },
        "4K": {
          "avg": 321,
          "low": 54
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 413,
          "low": 104
        },
        "1440p": {
          "avg": 389,
          "low": 90
        },
        "4K": {
          "avg": 329,
          "low": 55
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 390,
          "low": 93
        },
        "1440p": {
          "avg": 366,
          "low": 79
        },
        "4K": {
          "avg": 306,
          "low": 44
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 386,
          "low": 91
        },
        "1440p": {
          "avg": 361,
          "low": 78
        },
        "4K": {
          "avg": 302,
          "low": 43
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 417,
          "low": 98
        },
        "1440p": {
          "avg": 393,
          "low": 84
        },
        "4K": {
          "avg": 333,
          "low": 49
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 418,
          "low": 98
        },
        "1440p": {
          "avg": 394,
          "low": 84
        },
        "4K": {
          "avg": 335,
          "low": 50
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 417,
          "low": 98
        },
        "1440p": {
          "avg": 393,
          "low": 84
        },
        "4K": {
          "avg": 333,
          "low": 49
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 392,
          "low": 99
        },
        "1440p": {
          "avg": 368,
          "low": 85
        },
        "4K": {
          "avg": 309,
          "low": 51
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 396,
          "low": 95
        },
        "1440p": {
          "avg": 372,
          "low": 81
        },
        "4K": {
          "avg": 312,
          "low": 47
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 399,
          "low": 96
        },
        "4K": {
          "avg": 315,
          "low": 48
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 396,
          "low": 95
        },
        "1440p": {
          "avg": 372,
          "low": 81
        },
        "4K": {
          "avg": 312,
          "low": 47
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 391,
          "low": 94
        },
        "1440p": {
          "avg": 367,
          "low": 80
        },
        "4K": {
          "avg": 307,
          "low": 46
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 396,
          "low": 95
        },
        "1440p": {
          "avg": 372,
          "low": 81
        },
        "4K": {
          "avg": 312,
          "low": 47
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 392,
          "low": 94
        },
        "1440p": {
          "avg": 368,
          "low": 80
        },
        "4K": {
          "avg": 308,
          "low": 45
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 392,
          "low": 94
        },
        "1440p": {
          "avg": 368,
          "low": 80
        },
        "4K": {
          "avg": 308,
          "low": 45
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 386,
          "low": 92
        },
        "1440p": {
          "avg": 362,
          "low": 78
        },
        "4K": {
          "avg": 302,
          "low": 44
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 386,
          "low": 89
        },
        "1440p": {
          "avg": 362,
          "low": 75
        },
        "4K": {
          "avg": 302,
          "low": 41
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 385,
          "low": 89
        },
        "1440p": {
          "avg": 361,
          "low": 75
        },
        "4K": {
          "avg": 301,
          "low": 40
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 376,
          "low": 86
        },
        "1440p": {
          "avg": 352,
          "low": 72
        },
        "4K": {
          "avg": 292,
          "low": 38
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 370,
          "low": 83
        },
        "1440p": {
          "avg": 346,
          "low": 69
        },
        "4K": {
          "avg": 286,
          "low": 35
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 370,
          "low": 83
        },
        "1440p": {
          "avg": 346,
          "low": 69
        },
        "4K": {
          "avg": 286,
          "low": 35
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 396,
          "low": 95
        },
        "1440p": {
          "avg": 372,
          "low": 82
        },
        "4K": {
          "avg": 312,
          "low": 47
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 393,
          "low": 94
        },
        "1440p": {
          "avg": 369,
          "low": 81
        },
        "4K": {
          "avg": 309,
          "low": 46
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 393,
          "low": 94
        },
        "1440p": {
          "avg": 369,
          "low": 81
        },
        "4K": {
          "avg": 309,
          "low": 46
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 385,
          "low": 91
        },
        "1440p": {
          "avg": 360,
          "low": 77
        },
        "4K": {
          "avg": 301,
          "low": 42
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 380,
          "low": 89
        },
        "1440p": {
          "avg": 356,
          "low": 75
        },
        "4K": {
          "avg": 296,
          "low": 41
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 388,
          "low": 92
        },
        "1440p": {
          "avg": 364,
          "low": 78
        },
        "4K": {
          "avg": 304,
          "low": 43
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 389,
          "low": 92
        },
        "1440p": {
          "avg": 365,
          "low": 78
        },
        "4K": {
          "avg": 305,
          "low": 43
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 382,
          "low": 88
        },
        "1440p": {
          "avg": 358,
          "low": 74
        },
        "4K": {
          "avg": 298,
          "low": 40
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 373,
          "low": 84
        },
        "1440p": {
          "avg": 349,
          "low": 70
        },
        "4K": {
          "avg": 289,
          "low": 36
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1440p": {
          "avg": 415,
          "low": 89
        },
        "4K": {
          "avg": 356,
          "low": 55
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 374,
          "low": 135
        },
        "1440p": {
          "avg": 350,
          "low": 121
        },
        "4K": {
          "avg": 290,
          "low": 86
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 374,
          "low": 135
        },
        "1440p": {
          "avg": 350,
          "low": 121
        },
        "4K": {
          "avg": 290,
          "low": 86
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 325,
          "low": 144
        },
        "1440p": {
          "avg": 301,
          "low": 130
        },
        "4K": {
          "avg": 242,
          "low": 95
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 273,
          "low": 139
        },
        "1440p": {
          "avg": 249,
          "low": 125
        },
        "4K": {
          "avg": 189,
          "low": 91
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 260,
          "low": 136
        },
        "1440p": {
          "avg": 236,
          "low": 122
        },
        "4K": {
          "avg": 177,
          "low": 87
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 322,
          "low": 144
        },
        "1440p": {
          "avg": 298,
          "low": 130
        },
        "4K": {
          "avg": 239,
          "low": 96
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 291,
          "low": 143
        },
        "1440p": {
          "avg": 267,
          "low": 129
        },
        "4K": {
          "avg": 208,
          "low": 94
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 291,
          "low": 143
        },
        "1440p": {
          "avg": 267,
          "low": 129
        },
        "4K": {
          "avg": 208,
          "low": 94
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 291,
          "low": 143
        },
        "1440p": {
          "avg": 267,
          "low": 129
        },
        "4K": {
          "avg": 208,
          "low": 94
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 292,
          "low": 143
        },
        "1440p": {
          "avg": 268,
          "low": 129
        },
        "4K": {
          "avg": 208,
          "low": 94
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 261,
          "low": 136
        },
        "1440p": {
          "avg": 237,
          "low": 122
        },
        "4K": {
          "avg": 177,
          "low": 88
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 242,
          "low": 129
        },
        "1440p": {
          "avg": 218,
          "low": 115
        },
        "4K": {
          "avg": 159,
          "low": 81
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 234,
          "low": 126
        },
        "1440p": {
          "avg": 210,
          "low": 112
        },
        "4K": {
          "avg": 150,
          "low": 77
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 248,
          "low": 131
        },
        "1440p": {
          "avg": 224,
          "low": 117
        },
        "4K": {
          "avg": 164,
          "low": 83
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 235,
          "low": 126
        },
        "1440p": {
          "avg": 211,
          "low": 112
        },
        "4K": {
          "avg": 151,
          "low": 78
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 233,
          "low": 125
        },
        "1440p": {
          "avg": 209,
          "low": 111
        },
        "4K": {
          "avg": 149,
          "low": 77
        }
      },
      "GeForce RTX 4060": {
        "1440p": {
          "avg": 189,
          "low": 101
        },
        "4K": {
          "avg": 129,
          "low": 67
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 221,
          "low": 119
        },
        "1440p": {
          "avg": 197,
          "low": 105
        },
        "4K": {
          "avg": 137,
          "low": 71
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 221,
          "low": 119
        },
        "1440p": {
          "avg": 197,
          "low": 105
        },
        "4K": {
          "avg": 137,
          "low": 71
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 211,
          "low": 114
        },
        "1440p": {
          "avg": 187,
          "low": 100
        },
        "4K": {
          "avg": 127,
          "low": 65
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 340,
          "low": 142
        },
        "1440p": {
          "avg": 316,
          "low": 128
        },
        "4K": {
          "avg": 256,
          "low": 94
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 318,
          "low": 144
        },
        "1440p": {
          "avg": 294,
          "low": 130
        },
        "4K": {
          "avg": 234,
          "low": 96
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 290,
          "low": 142
        },
        "1440p": {
          "avg": 266,
          "low": 129
        },
        "4K": {
          "avg": 207,
          "low": 94
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 290,
          "low": 142
        },
        "1440p": {
          "avg": 266,
          "low": 129
        },
        "4K": {
          "avg": 207,
          "low": 94
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 290,
          "low": 142
        },
        "1440p": {
          "avg": 266,
          "low": 129
        },
        "4K": {
          "avg": 207,
          "low": 94
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 290,
          "low": 142
        },
        "1440p": {
          "avg": 266,
          "low": 129
        },
        "4K": {
          "avg": 207,
          "low": 94
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 290,
          "low": 142
        },
        "1440p": {
          "avg": 266,
          "low": 129
        },
        "4K": {
          "avg": 207,
          "low": 94
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 276,
          "low": 140
        },
        "1440p": {
          "avg": 251,
          "low": 126
        },
        "4K": {
          "avg": 192,
          "low": 91
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 257,
          "low": 135
        },
        "1440p": {
          "avg": 233,
          "low": 121
        },
        "4K": {
          "avg": 173,
          "low": 86
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 217,
          "low": 117
        },
        "1440p": {
          "avg": 193,
          "low": 103
        },
        "4K": {
          "avg": 133,
          "low": 69
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 216,
          "low": 116
        },
        "1440p": {
          "avg": 191,
          "low": 103
        },
        "4K": {
          "avg": 132,
          "low": 68
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 206,
          "low": 111
        },
        "1440p": {
          "avg": 182,
          "low": 97
        },
        "4K": {
          "avg": 122,
          "low": 63
        }
      }
    }
  },
  "荒野大镖客：救赎 2": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 219,
          "low": 164
        },
        "1440p": {
          "avg": 205,
          "low": 154
        },
        "4K": {
          "avg": 170,
          "low": 128
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 152
        },
        "4K": {
          "avg": 169,
          "low": 126
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 217,
          "low": 161
        },
        "1440p": {
          "avg": 203,
          "low": 151
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 152
        },
        "4K": {
          "avg": 169,
          "low": 126
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 218,
          "low": 163
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 219,
          "low": 163
        },
        "1440p": {
          "avg": 205,
          "low": 153
        },
        "4K": {
          "avg": 170,
          "low": 127
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 218,
          "low": 163
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 152
        },
        "4K": {
          "avg": 169,
          "low": 126
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 218,
          "low": 163
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 217,
          "low": 161
        },
        "1440p": {
          "avg": 203,
          "low": 151
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 217,
          "low": 161
        },
        "1440p": {
          "avg": 203,
          "low": 152
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 217,
          "low": 161
        },
        "1440p": {
          "avg": 203,
          "low": 151
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 215,
          "low": 159
        },
        "1440p": {
          "avg": 201,
          "low": 149
        },
        "4K": {
          "avg": 166,
          "low": 124
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 213,
          "low": 157
        },
        "1440p": {
          "avg": 199,
          "low": 148
        },
        "4K": {
          "avg": 164,
          "low": 123
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 213,
          "low": 157
        },
        "1440p": {
          "avg": 199,
          "low": 148
        },
        "4K": {
          "avg": 164,
          "low": 123
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 218,
          "low": 163
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 218,
          "low": 162
        },
        "1440p": {
          "avg": 204,
          "low": 153
        },
        "4K": {
          "avg": 169,
          "low": 127
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 217,
          "low": 161
        },
        "1440p": {
          "avg": 203,
          "low": 151
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 216,
          "low": 160
        },
        "1440p": {
          "avg": 202,
          "low": 150
        },
        "4K": {
          "avg": 167,
          "low": 125
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 217,
          "low": 162
        },
        "1440p": {
          "avg": 203,
          "low": 152
        },
        "4K": {
          "avg": 168,
          "low": 126
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 217,
          "low": 162
        },
        "1440p": {
          "avg": 203,
          "low": 152
        },
        "4K": {
          "avg": 169,
          "low": 126
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 216,
          "low": 160
        },
        "1440p": {
          "avg": 202,
          "low": 151
        },
        "4K": {
          "avg": 167,
          "low": 125
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 214,
          "low": 158
        },
        "1440p": {
          "avg": 200,
          "low": 149
        },
        "4K": {
          "avg": 165,
          "low": 124
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 220,
          "low": 165
        },
        "1440p": {
          "avg": 206,
          "low": 154
        },
        "4K": {
          "avg": 171,
          "low": 128
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 172,
          "low": 129
        },
        "1440p": {
          "avg": 158,
          "low": 118
        },
        "4K": {
          "avg": 123,
          "low": 92
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 172,
          "low": 129
        },
        "1440p": {
          "avg": 158,
          "low": 118
        },
        "4K": {
          "avg": 123,
          "low": 92
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 138,
          "low": 104
        },
        "1440p": {
          "avg": 125,
          "low": 93
        },
        "4K": {
          "avg": 90,
          "low": 67
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 103,
          "low": 77
        },
        "1440p": {
          "avg": 89,
          "low": 67
        },
        "4K": {
          "avg": 54,
          "low": 41
        }
      },
      "GeForce RTX 3080": {
        "4K": {
          "avg": 46,
          "low": 35
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 136,
          "low": 102
        },
        "1440p": {
          "avg": 123,
          "low": 92
        },
        "4K": {
          "avg": 88,
          "low": 66
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 116,
          "low": 87
        },
        "1440p": {
          "avg": 102,
          "low": 76
        },
        "4K": {
          "avg": 67,
          "low": 50
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 116,
          "low": 87
        },
        "1440p": {
          "avg": 102,
          "low": 76
        },
        "4K": {
          "avg": 67,
          "low": 50
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 116,
          "low": 87
        },
        "1440p": {
          "avg": 102,
          "low": 76
        },
        "4K": {
          "avg": 67,
          "low": 50
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 116,
          "low": 87
        },
        "1440p": {
          "avg": 102,
          "low": 76
        },
        "4K": {
          "avg": 67,
          "low": 50
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 96,
          "low": 72
        },
        "1440p": {
          "avg": 82,
          "low": 61
        },
        "4K": {
          "avg": 47,
          "low": 35
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 84,
          "low": 63
        },
        "1440p": {
          "avg": 70,
          "low": 52
        },
        "4K": {
          "avg": 35,
          "low": 26
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 78,
          "low": 59
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 29,
          "low": 22
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 87,
          "low": 65
        },
        "1440p": {
          "avg": 73,
          "low": 55
        },
        "4K": {
          "avg": 38,
          "low": 28
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 79,
          "low": 59
        },
        "1440p": {
          "avg": 65,
          "low": 48
        },
        "4K": {
          "avg": 30,
          "low": 22
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 78,
          "low": 58
        },
        "1440p": {
          "avg": 64,
          "low": 48
        },
        "4K": {
          "avg": 29,
          "low": 21
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 65,
          "low": 48
        },
        "1440p": {
          "avg": 51,
          "low": 38
        },
        "4K": {
          "avg": 16,
          "low": 12
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 70,
          "low": 52
        },
        "1440p": {
          "avg": 56,
          "low": 42
        },
        "4K": {
          "avg": 21,
          "low": 15
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 70,
          "low": 52
        },
        "1440p": {
          "avg": 56,
          "low": 42
        },
        "4K": {
          "avg": 21,
          "low": 15
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 63,
          "low": 47
        },
        "1440p": {
          "avg": 49,
          "low": 37
        },
        "4K": {
          "avg": 14,
          "low": 10
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 149,
          "low": 111
        },
        "1440p": {
          "avg": 135,
          "low": 101
        },
        "4K": {
          "avg": 100,
          "low": 75
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 133,
          "low": 100
        },
        "1440p": {
          "avg": 119,
          "low": 89
        },
        "4K": {
          "avg": 84,
          "low": 63
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 101,
          "low": 76
        },
        "4K": {
          "avg": 66,
          "low": 49
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 101,
          "low": 76
        },
        "4K": {
          "avg": 66,
          "low": 49
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 101,
          "low": 76
        },
        "4K": {
          "avg": 66,
          "low": 49
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 101,
          "low": 76
        },
        "4K": {
          "avg": 66,
          "low": 49
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 115,
          "low": 86
        },
        "1440p": {
          "avg": 101,
          "low": 76
        },
        "4K": {
          "avg": 66,
          "low": 49
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 105,
          "low": 79
        },
        "1440p": {
          "avg": 91,
          "low": 68
        },
        "4K": {
          "avg": 56,
          "low": 42
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 93,
          "low": 70
        },
        "1440p": {
          "avg": 79,
          "low": 59
        },
        "4K": {
          "avg": 44,
          "low": 33
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 67,
          "low": 50
        },
        "1440p": {
          "avg": 53,
          "low": 40
        },
        "4K": {
          "avg": 18,
          "low": 13
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 66,
          "low": 49
        },
        "1440p": {
          "avg": 52,
          "low": 39
        },
        "4K": {
          "avg": 17,
          "low": 13
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 60,
          "low": 45
        },
        "1440p": {
          "avg": 46,
          "low": 34
        },
        "4K": {
          "avg": 11,
          "low": 10
        }
      }
    }
  },
  "腐蚀": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 380,
          "low": 47
        },
        "1440p": {
          "avg": 367,
          "low": 38
        },
        "4K": {
          "avg": 328,
          "low": 10
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 380,
          "low": 47
        },
        "1440p": {
          "avg": 367,
          "low": 38
        },
        "4K": {
          "avg": 328,
          "low": 10
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 343,
          "low": 19
        },
        "1440p": {
          "avg": 331,
          "low": 10
        },
        "4K": {
          "avg": 291,
          "low": 10
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 352,
          "low": 25
        },
        "1440p": {
          "avg": 339,
          "low": 16
        },
        "4K": {
          "avg": 300,
          "low": 10
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 328,
          "low": 10
        },
        "1440p": {
          "avg": 315,
          "low": 10
        },
        "4K": {
          "avg": 276,
          "low": 10
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 323,
          "low": 10
        },
        "1440p": {
          "avg": 310,
          "low": 10
        },
        "4K": {
          "avg": 271,
          "low": 10
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 359,
          "low": 30
        },
        "1440p": {
          "avg": 346,
          "low": 21
        },
        "4K": {
          "avg": 307,
          "low": 10
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 360,
          "low": 31
        },
        "1440p": {
          "avg": 347,
          "low": 22
        },
        "4K": {
          "avg": 308,
          "low": 10
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 359,
          "low": 30
        },
        "1440p": {
          "avg": 346,
          "low": 21
        },
        "4K": {
          "avg": 307,
          "low": 10
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 329,
          "low": 10
        },
        "1440p": {
          "avg": 316,
          "low": 10
        },
        "4K": {
          "avg": 277,
          "low": 10
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 335,
          "low": 12
        },
        "1440p": {
          "avg": 322,
          "low": 10
        },
        "4K": {
          "avg": 283,
          "low": 10
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 339,
          "low": 15
        },
        "1440p": {
          "avg": 326,
          "low": 10
        },
        "4K": {
          "avg": 287,
          "low": 10
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 335,
          "low": 12
        },
        "1440p": {
          "avg": 322,
          "low": 10
        },
        "4K": {
          "avg": 283,
          "low": 10
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 329,
          "low": 10
        },
        "1440p": {
          "avg": 316,
          "low": 10
        },
        "4K": {
          "avg": 277,
          "low": 10
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 335,
          "low": 12
        },
        "1440p": {
          "avg": 322,
          "low": 10
        },
        "4K": {
          "avg": 283,
          "low": 10
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 331,
          "low": 10
        },
        "1440p": {
          "avg": 318,
          "low": 10
        },
        "4K": {
          "avg": 279,
          "low": 10
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 331,
          "low": 10
        },
        "1440p": {
          "avg": 318,
          "low": 10
        },
        "4K": {
          "avg": 279,
          "low": 10
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 323,
          "low": 10
        },
        "1440p": {
          "avg": 311,
          "low": 10
        },
        "4K": {
          "avg": 272,
          "low": 10
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 324,
          "low": 10
        },
        "1440p": {
          "avg": 312,
          "low": 10
        },
        "4K": {
          "avg": 273,
          "low": 10
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 323,
          "low": 10
        },
        "1440p": {
          "avg": 310,
          "low": 10
        },
        "4K": {
          "avg": 271,
          "low": 10
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 311,
          "low": 10
        },
        "1440p": {
          "avg": 299,
          "low": 10
        },
        "4K": {
          "avg": 259,
          "low": 10
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 303,
          "low": 10
        },
        "1440p": {
          "avg": 291,
          "low": 10
        },
        "4K": {
          "avg": 252,
          "low": 10
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 303,
          "low": 10
        },
        "1440p": {
          "avg": 291,
          "low": 10
        },
        "4K": {
          "avg": 252,
          "low": 10
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 335,
          "low": 13
        },
        "1440p": {
          "avg": 322,
          "low": 10
        },
        "4K": {
          "avg": 283,
          "low": 10
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 331,
          "low": 10
        },
        "1440p": {
          "avg": 318,
          "low": 10
        },
        "4K": {
          "avg": 279,
          "low": 10
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 331,
          "low": 10
        },
        "1440p": {
          "avg": 318,
          "low": 10
        },
        "4K": {
          "avg": 279,
          "low": 10
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 322,
          "low": 10
        },
        "1440p": {
          "avg": 309,
          "low": 10
        },
        "4K": {
          "avg": 270,
          "low": 10
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 316,
          "low": 10
        },
        "1440p": {
          "avg": 303,
          "low": 10
        },
        "4K": {
          "avg": 264,
          "low": 10
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 326,
          "low": 10
        },
        "1440p": {
          "avg": 313,
          "low": 10
        },
        "4K": {
          "avg": 274,
          "low": 10
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 327,
          "low": 10
        },
        "1440p": {
          "avg": 314,
          "low": 10
        },
        "4K": {
          "avg": 275,
          "low": 10
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 319,
          "low": 10
        },
        "1440p": {
          "avg": 306,
          "low": 10
        },
        "4K": {
          "avg": 267,
          "low": 10
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 308,
          "low": 10
        },
        "1440p": {
          "avg": 295,
          "low": 10
        },
        "4K": {
          "avg": 256,
          "low": 10
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 380,
          "low": 47
        },
        "1440p": {
          "avg": 367,
          "low": 38
        },
        "4K": {
          "avg": 328,
          "low": 10
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 309,
          "low": 103
        },
        "1440p": {
          "avg": 297,
          "low": 94
        },
        "4K": {
          "avg": 257,
          "low": 66
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 309,
          "low": 103
        },
        "1440p": {
          "avg": 297,
          "low": 94
        },
        "4K": {
          "avg": 257,
          "low": 66
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 263,
          "low": 130
        },
        "1440p": {
          "avg": 250,
          "low": 121
        },
        "4K": {
          "avg": 211,
          "low": 93
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 219,
          "low": 143
        },
        "1440p": {
          "avg": 206,
          "low": 134
        },
        "4K": {
          "avg": 167,
          "low": 106
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 210,
          "low": 143
        },
        "1440p": {
          "avg": 197,
          "low": 134
        },
        "4K": {
          "avg": 158,
          "low": 107
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 260,
          "low": 131
        },
        "1440p": {
          "avg": 248,
          "low": 122
        },
        "4K": {
          "avg": 209,
          "low": 94
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 234,
          "low": 140
        },
        "1440p": {
          "avg": 221,
          "low": 131
        },
        "4K": {
          "avg": 182,
          "low": 104
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 234,
          "low": 140
        },
        "1440p": {
          "avg": 221,
          "low": 131
        },
        "4K": {
          "avg": 182,
          "low": 104
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 234,
          "low": 140
        },
        "1440p": {
          "avg": 221,
          "low": 131
        },
        "4K": {
          "avg": 182,
          "low": 104
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 234,
          "low": 140
        },
        "1440p": {
          "avg": 222,
          "low": 131
        },
        "4K": {
          "avg": 182,
          "low": 104
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 210,
          "low": 143
        },
        "1440p": {
          "avg": 197,
          "low": 134
        },
        "4K": {
          "avg": 158,
          "low": 107
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 196,
          "low": 142
        },
        "1440p": {
          "avg": 184,
          "low": 133
        },
        "4K": {
          "avg": 145,
          "low": 106
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 191,
          "low": 141
        },
        "1440p": {
          "avg": 178,
          "low": 132
        },
        "4K": {
          "avg": 139,
          "low": 104
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 200,
          "low": 143
        },
        "1440p": {
          "avg": 187,
          "low": 134
        },
        "4K": {
          "avg": 148,
          "low": 106
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 191,
          "low": 141
        },
        "1440p": {
          "avg": 178,
          "low": 132
        },
        "4K": {
          "avg": 139,
          "low": 104
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 190,
          "low": 141
        },
        "1440p": {
          "avg": 177,
          "low": 132
        },
        "4K": {
          "avg": 138,
          "low": 103
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 177,
          "low": 132
        },
        "1440p": {
          "avg": 164,
          "low": 123
        },
        "4K": {
          "avg": 125,
          "low": 93
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 182,
          "low": 136
        },
        "1440p": {
          "avg": 169,
          "low": 127
        },
        "4K": {
          "avg": 130,
          "low": 97
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 182,
          "low": 136
        },
        "1440p": {
          "avg": 169,
          "low": 127
        },
        "4K": {
          "avg": 130,
          "low": 97
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 175,
          "low": 131
        },
        "1440p": {
          "avg": 162,
          "low": 121
        },
        "4K": {
          "avg": 123,
          "low": 92
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 277,
          "low": 123
        },
        "1440p": {
          "avg": 264,
          "low": 114
        },
        "4K": {
          "avg": 225,
          "low": 86
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 256,
          "low": 133
        },
        "1440p": {
          "avg": 244,
          "low": 124
        },
        "4K": {
          "avg": 204,
          "low": 96
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 233,
          "low": 141
        },
        "1440p": {
          "avg": 220,
          "low": 131
        },
        "4K": {
          "avg": 181,
          "low": 104
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 233,
          "low": 141
        },
        "1440p": {
          "avg": 220,
          "low": 131
        },
        "4K": {
          "avg": 181,
          "low": 104
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 233,
          "low": 141
        },
        "1440p": {
          "avg": 220,
          "low": 131
        },
        "4K": {
          "avg": 181,
          "low": 104
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 233,
          "low": 141
        },
        "1440p": {
          "avg": 220,
          "low": 131
        },
        "4K": {
          "avg": 181,
          "low": 104
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 233,
          "low": 141
        },
        "1440p": {
          "avg": 220,
          "low": 131
        },
        "4K": {
          "avg": 181,
          "low": 104
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 221,
          "low": 143
        },
        "1440p": {
          "avg": 208,
          "low": 134
        },
        "4K": {
          "avg": 169,
          "low": 106
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 207,
          "low": 143
        },
        "1440p": {
          "avg": 194,
          "low": 134
        },
        "4K": {
          "avg": 155,
          "low": 107
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 179,
          "low": 134
        },
        "1440p": {
          "avg": 166,
          "low": 125
        },
        "4K": {
          "avg": 127,
          "low": 95
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 178,
          "low": 133
        },
        "1440p": {
          "avg": 165,
          "low": 124
        },
        "4K": {
          "avg": 126,
          "low": 95
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 172,
          "low": 129
        },
        "1440p": {
          "avg": 159,
          "low": 119
        },
        "4K": {
          "avg": 120,
          "low": 90
        }
      }
    }
  },
  "反恐精英 2": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 797,
          "low": 480
        },
        "1440p": {
          "avg": 766,
          "low": 461
        },
        "4K": {
          "avg": 679,
          "low": 405
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 682,
          "low": 415
        },
        "1440p": {
          "avg": 651,
          "low": 396
        },
        "4K": {
          "avg": 564,
          "low": 340
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 670,
          "low": 409
        },
        "1440p": {
          "avg": 640,
          "low": 389
        },
        "4K": {
          "avg": 553,
          "low": 334
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 655,
          "low": 400
        },
        "1440p": {
          "avg": 624,
          "low": 381
        },
        "4K": {
          "avg": 537,
          "low": 325
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 705,
          "low": 428
        },
        "1440p": {
          "avg": 675,
          "low": 409
        },
        "4K": {
          "avg": 587,
          "low": 353
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 727,
          "low": 440
        },
        "1440p": {
          "avg": 696,
          "low": 421
        },
        "4K": {
          "avg": 609,
          "low": 365
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 650,
          "low": 398
        },
        "1440p": {
          "avg": 620,
          "low": 378
        },
        "4K": {
          "avg": 533,
          "low": 323
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 592,
          "low": 366
        },
        "1440p": {
          "avg": 561,
          "low": 347
        },
        "4K": {
          "avg": 474,
          "low": 291
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 665,
          "low": 406
        },
        "1440p": {
          "avg": 634,
          "low": 386
        },
        "4K": {
          "avg": 547,
          "low": 331
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 692,
          "low": 421
        },
        "1440p": {
          "avg": 662,
          "low": 402
        },
        "4K": {
          "avg": 575,
          "low": 346
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 666,
          "low": 407
        },
        "1440p": {
          "avg": 636,
          "low": 387
        },
        "4K": {
          "avg": 549,
          "low": 332
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 683,
          "low": 416
        },
        "1440p": {
          "avg": 652,
          "low": 396
        },
        "4K": {
          "avg": 565,
          "low": 341
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 672,
          "low": 410
        },
        "1440p": {
          "avg": 641,
          "low": 390
        },
        "4K": {
          "avg": 554,
          "low": 335
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 652,
          "low": 399
        },
        "1440p": {
          "avg": 622,
          "low": 379
        },
        "4K": {
          "avg": 534,
          "low": 324
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 650,
          "low": 398
        },
        "1440p": {
          "avg": 620,
          "low": 379
        },
        "4K": {
          "avg": 533,
          "low": 323
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 618,
          "low": 380
        },
        "1440p": {
          "avg": 587,
          "low": 361
        },
        "4K": {
          "avg": 500,
          "low": 305
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 595,
          "low": 368
        },
        "1440p": {
          "avg": 564,
          "low": 348
        },
        "4K": {
          "avg": 477,
          "low": 293
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 684,
          "low": 416
        },
        "1440p": {
          "avg": 653,
          "low": 397
        },
        "4K": {
          "avg": 566,
          "low": 341
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 673,
          "low": 410
        },
        "1440p": {
          "avg": 643,
          "low": 391
        },
        "4K": {
          "avg": 555,
          "low": 335
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 659,
          "low": 403
        },
        "1440p": {
          "avg": 629,
          "low": 383
        },
        "4K": {
          "avg": 542,
          "low": 328
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 744,
          "low": 450
        },
        "1440p": {
          "avg": 713,
          "low": 430
        },
        "4K": {
          "avg": 626,
          "low": 375
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 747,
          "low": 452
        },
        "1440p": {
          "avg": 716,
          "low": 432
        },
        "4K": {
          "avg": 629,
          "low": 377
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 663,
          "low": 405
        },
        "1440p": {
          "avg": 633,
          "low": 386
        },
        "4K": {
          "avg": 546,
          "low": 330
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 637,
          "low": 391
        },
        "1440p": {
          "avg": 606,
          "low": 371
        },
        "4K": {
          "avg": 519,
          "low": 316
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 797,
          "low": 480
        },
        "1440p": {
          "avg": 766,
          "low": 461
        },
        "4K": {
          "avg": 679,
          "low": 405
        }
      },
      "GeForce RTX 5080": {
        "1080p": {
          "avg": 590,
          "low": 369
        },
        "1440p": {
          "avg": 559,
          "low": 349
        },
        "4K": {
          "avg": 472,
          "low": 294
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 528,
          "low": 335
        },
        "1440p": {
          "avg": 498,
          "low": 315
        },
        "4K": {
          "avg": 410,
          "low": 260
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 477,
          "low": 306
        },
        "1440p": {
          "avg": 446,
          "low": 286
        },
        "4K": {
          "avg": 359,
          "low": 231
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 425,
          "low": 274
        },
        "1440p": {
          "avg": 394,
          "low": 255
        },
        "4K": {
          "avg": 307,
          "low": 199
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 414,
          "low": 267
        },
        "1440p": {
          "avg": 384,
          "low": 248
        },
        "4K": {
          "avg": 297,
          "low": 192
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 403,
          "low": 258
        },
        "1440p": {
          "avg": 372,
          "low": 238
        },
        "4K": {
          "avg": 285,
          "low": 183
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 503,
          "low": 319
        },
        "1440p": {
          "avg": 473,
          "low": 300
        },
        "4K": {
          "avg": 385,
          "low": 244
        }
      },
      "GeForce RTX 4080 SUPER": {
        "1080p": {
          "avg": 534,
          "low": 338
        },
        "1440p": {
          "avg": 503,
          "low": 318
        },
        "4K": {
          "avg": 416,
          "low": 263
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 531,
          "low": 336
        },
        "1440p": {
          "avg": 500,
          "low": 317
        },
        "4K": {
          "avg": 413,
          "low": 261
        }
      },
      "GeForce RTX 4070 Ti SUPER": {
        "1080p": {
          "avg": 491,
          "low": 314
        },
        "1440p": {
          "avg": 461,
          "low": 295
        },
        "4K": {
          "avg": 374,
          "low": 239
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 351,
          "low": 235
        },
        "1440p": {
          "avg": 320,
          "low": 215
        },
        "4K": {
          "avg": 233,
          "low": 160
        }
      },
      "GeForce RTX 4070 SUPER": {
        "1080p": {
          "avg": 461,
          "low": 297
        },
        "1440p": {
          "avg": 431,
          "low": 277
        },
        "4K": {
          "avg": 344,
          "low": 222
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 437,
          "low": 282
        },
        "1440p": {
          "avg": 406,
          "low": 263
        },
        "4K": {
          "avg": 319,
          "low": 207
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 412,
          "low": 266
        },
        "1440p": {
          "avg": 382,
          "low": 248
        },
        "4K": {
          "avg": 294,
          "low": 191
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 404,
          "low": 258
        },
        "1440p": {
          "avg": 373,
          "low": 239
        },
        "4K": {
          "avg": 286,
          "low": 183
        }
      },
      "GeForce RTX 3090": {
        "1080p": {
          "avg": 327,
          "low": 221
        },
        "1440p": {
          "avg": 297,
          "low": 201
        },
        "4K": {
          "avg": 210,
          "low": 146
        }
      },
      "GeForce RTX 3090 Ti": {
        "1080p": {
          "avg": 343,
          "low": 230
        },
        "1440p": {
          "avg": 312,
          "low": 211
        },
        "4K": {
          "avg": 225,
          "low": 155
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 325,
          "low": 220
        },
        "1440p": {
          "avg": 295,
          "low": 200
        },
        "4K": {
          "avg": 208,
          "low": 145
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 312,
          "low": 211
        },
        "1440p": {
          "avg": 281,
          "low": 192
        },
        "4K": {
          "avg": 194,
          "low": 136
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 296,
          "low": 201
        },
        "1440p": {
          "avg": 266,
          "low": 182
        },
        "4K": {
          "avg": 178,
          "low": 126
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 291,
          "low": 197
        },
        "1440p": {
          "avg": 260,
          "low": 178
        },
        "4K": {
          "avg": 173,
          "low": 122
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 284,
          "low": 192
        },
        "1440p": {
          "avg": 254,
          "low": 173
        },
        "4K": {
          "avg": 167,
          "low": 117
        }
      },
      "GeForce RTX 3060 Ti GDDR6X": {
        "1080p": {
          "avg": 286,
          "low": 193
        },
        "1440p": {
          "avg": 255,
          "low": 174
        },
        "4K": {
          "avg": 168,
          "low": 118
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 282,
          "low": 185
        },
        "1440p": {
          "avg": 252,
          "low": 166
        },
        "4K": {
          "avg": 165,
          "low": 110
        }
      },
      "Radeon RX 9070 XT": {
        "1080p": {
          "avg": 550,
          "low": 347
        },
        "1440p": {
          "avg": 520,
          "low": 328
        },
        "4K": {
          "avg": 432,
          "low": 272
        }
      },
      "Radeon RX 9070": {
        "1080p": {
          "avg": 518,
          "low": 329
        },
        "1440p": {
          "avg": 487,
          "low": 310
        },
        "4K": {
          "avg": 400,
          "low": 254
        }
      },
      "Radeon RX 9060 XT": {
        "1080p": {
          "avg": 426,
          "low": 275
        },
        "1440p": {
          "avg": 395,
          "low": 256
        },
        "4K": {
          "avg": 308,
          "low": 200
        }
      },
      "Radeon RX 9060 XT 16GB": {
        "1080p": {
          "avg": 428,
          "low": 276
        },
        "1440p": {
          "avg": 397,
          "low": 257
        },
        "4K": {
          "avg": 310,
          "low": 201
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 561,
          "low": 353
        },
        "1440p": {
          "avg": 530,
          "low": 333
        },
        "4K": {
          "avg": 443,
          "low": 278
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 519,
          "low": 330
        },
        "1440p": {
          "avg": 488,
          "low": 310
        },
        "4K": {
          "avg": 401,
          "low": 255
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 474,
          "low": 304
        },
        "1440p": {
          "avg": 444,
          "low": 285
        },
        "4K": {
          "avg": 357,
          "low": 229
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 454,
          "low": 292
        },
        "1440p": {
          "avg": 423,
          "low": 273
        },
        "4K": {
          "avg": 336,
          "low": 217
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 432,
          "low": 279
        },
        "1440p": {
          "avg": 402,
          "low": 260
        },
        "4K": {
          "avg": 314,
          "low": 204
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 404,
          "low": 259
        },
        "1440p": {
          "avg": 373,
          "low": 240
        },
        "4K": {
          "avg": 286,
          "low": 184
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 403,
          "low": 258
        },
        "1440p": {
          "avg": 373,
          "low": 239
        },
        "4K": {
          "avg": 286,
          "low": 184
        }
      },
      "Radeon RX 7650 GRE": {
        "1080p": {
          "avg": 403,
          "low": 258
        },
        "1440p": {
          "avg": 372,
          "low": 239
        },
        "4K": {
          "avg": 285,
          "low": 183
        }
      },
      "Radeon RX 6900 XT": {
        "1080p": {
          "avg": 334,
          "low": 225
        },
        "1440p": {
          "avg": 304,
          "low": 206
        },
        "4K": {
          "avg": 216,
          "low": 150
        }
      },
      "Radeon RX 6800 XT": {
        "1080p": {
          "avg": 323,
          "low": 219
        },
        "1440p": {
          "avg": 293,
          "low": 199
        },
        "4K": {
          "avg": 206,
          "low": 144
        }
      },
      "Radeon RX 6800": {
        "1080p": {
          "avg": 303,
          "low": 206
        },
        "1440p": {
          "avg": 273,
          "low": 186
        },
        "4K": {
          "avg": 185,
          "low": 131
        }
      },
      "Radeon RX 6700 XT": {
        "1080p": {
          "avg": 288,
          "low": 195
        },
        "1440p": {
          "avg": 257,
          "low": 175
        },
        "4K": {
          "avg": 170,
          "low": 120
        }
      },
      "Radeon RX 6700": {
        "1080p": {
          "avg": 283,
          "low": 191
        },
        "1440p": {
          "avg": 253,
          "low": 171
        },
        "4K": {
          "avg": 165,
          "low": 116
        }
      },
      "Radeon RX 6650 XT": {
        "1080p": {
          "avg": 281,
          "low": 188
        },
        "1440p": {
          "avg": 251,
          "low": 169
        },
        "4K": {
          "avg": 163,
          "low": 113
        }
      },
      "Radeon RX 6600 XT": {
        "1080p": {
          "avg": 281,
          "low": 188
        },
        "1440p": {
          "avg": 250,
          "low": 168
        },
        "4K": {
          "avg": 163,
          "low": 113
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 281,
          "low": 186
        },
        "1440p": {
          "avg": 251,
          "low": 166
        },
        "4K": {
          "avg": 164,
          "low": 111
        }
      },
      "Radeon RX 6400": {
        "1080p": {
          "avg": 305,
          "low": 188
        },
        "1440p": {
          "avg": 274,
          "low": 169
        },
        "4K": {
          "avg": 187,
          "low": 113
        }
      },
      "GeForce RTX 3050 6 GB": {
        "1080p": {
          "avg": 408,
          "low": 251
        },
        "1440p": {
          "avg": 378,
          "low": 232
        },
        "4K": {
          "avg": 290,
          "low": 176
        }
      },
      "RTX 3060 8 GB": {
        "1440p": {
          "avg": 370,
          "low": 233
        },
        "4K": {
          "avg": 283,
          "low": 177
        }
      },
      "RTX 4070 Super": {
        "1080p": {
          "avg": 461,
          "low": 296
        },
        "1440p": {
          "avg": 430,
          "low": 277
        },
        "4K": {
          "avg": 343,
          "low": 222
        }
      },
      "RTX 4070 Ti Super": {
        "1080p": {
          "avg": 491,
          "low": 314
        },
        "1440p": {
          "avg": 460,
          "low": 294
        },
        "4K": {
          "avg": 373,
          "low": 239
        }
      },
      "RTX 4080 Super": {
        "1080p": {
          "avg": 533,
          "low": 338
        },
        "1440p": {
          "avg": 502,
          "low": 318
        },
        "4K": {
          "avg": 415,
          "low": 263
        }
      },
      "RX 6500 XT": {
        "1080p": {
          "avg": 408,
          "low": 251
        },
        "1440p": {
          "avg": 378,
          "low": 232
        },
        "4K": {
          "avg": 290,
          "low": 176
        }
      },
      "RX 970": {
        "1080p": {
          "avg": 408,
          "low": 251
        },
        "1440p": {
          "avg": 378,
          "low": 232
        },
        "4K": {
          "avg": 290,
          "low": 176
        }
      }
    }
  },
  "三角洲行动": {
    "cpu": {},
    "gpu": {}
  },
  "我的世界": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 1014,
          "low": 424
        },
        "1440p": {
          "avg": 991,
          "low": 419
        },
        "4K": {
          "avg": 930,
          "low": 405
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 848,
          "low": 271
        },
        "1440p": {
          "avg": 825,
          "low": 266
        },
        "4K": {
          "avg": 764,
          "low": 253
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 832,
          "low": 257
        },
        "1440p": {
          "avg": 809,
          "low": 253
        },
        "4K": {
          "avg": 748,
          "low": 239
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 806,
          "low": 235
        },
        "1440p": {
          "avg": 782,
          "low": 230
        },
        "4K": {
          "avg": 721,
          "low": 217
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 881,
          "low": 300
        },
        "1440p": {
          "avg": 857,
          "low": 295
        },
        "4K": {
          "avg": 796,
          "low": 281
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 909,
          "low": 325
        },
        "1440p": {
          "avg": 886,
          "low": 320
        },
        "4K": {
          "avg": 825,
          "low": 307
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 806,
          "low": 236
        },
        "1440p": {
          "avg": 783,
          "low": 231
        },
        "4K": {
          "avg": 722,
          "low": 218
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 740,
          "low": 183
        },
        "1440p": {
          "avg": 717,
          "low": 178
        },
        "4K": {
          "avg": 656,
          "low": 165
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 824,
          "low": 251
        },
        "1440p": {
          "avg": 801,
          "low": 246
        },
        "4K": {
          "avg": 740,
          "low": 233
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 1014,
          "low": 423
        },
        "1440p": {
          "avg": 991,
          "low": 418
        },
        "4K": {
          "avg": 929,
          "low": 405
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 864,
          "low": 285
        },
        "1440p": {
          "avg": 840,
          "low": 280
        },
        "4K": {
          "avg": 779,
          "low": 266
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 849,
          "low": 272
        },
        "1440p": {
          "avg": 825,
          "low": 267
        },
        "4K": {
          "avg": 764,
          "low": 254
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 851,
          "low": 273
        },
        "1440p": {
          "avg": 827,
          "low": 268
        },
        "4K": {
          "avg": 766,
          "low": 255
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 836,
          "low": 261
        },
        "1440p": {
          "avg": 812,
          "low": 256
        },
        "4K": {
          "avg": 751,
          "low": 242
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 803,
          "low": 233
        },
        "1440p": {
          "avg": 779,
          "low": 228
        },
        "4K": {
          "avg": 718,
          "low": 215
        }
      },
      "Core i9-12900": {
        "1080p": {
          "avg": 783,
          "low": 217
        },
        "1440p": {
          "avg": 760,
          "low": 212
        },
        "4K": {
          "avg": 699,
          "low": 199
        }
      },
      "Core i9-11900K": {
        "1080p": {
          "avg": 726,
          "low": 172
        },
        "1440p": {
          "avg": 703,
          "low": 167
        },
        "4K": {
          "avg": 642,
          "low": 154
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 934,
          "low": 347
        },
        "1440p": {
          "avg": 910,
          "low": 343
        },
        "4K": {
          "avg": 849,
          "low": 329
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 934,
          "low": 347
        },
        "1440p": {
          "avg": 910,
          "low": 343
        },
        "4K": {
          "avg": 849,
          "low": 329
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 938,
          "low": 351
        },
        "1440p": {
          "avg": 915,
          "low": 346
        },
        "4K": {
          "avg": 854,
          "low": 333
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 827,
          "low": 254
        },
        "1440p": {
          "avg": 804,
          "low": 249
        },
        "4K": {
          "avg": 743,
          "low": 235
        }
      },
      "Ryzen 9 5950X": {
        "1080p": {
          "avg": 722,
          "low": 169
        },
        "1440p": {
          "avg": 698,
          "low": 164
        },
        "4K": {
          "avg": 637,
          "low": 150
        }
      },
      "Ryzen 9 5900X": {
        "1080p": {
          "avg": 721,
          "low": 168
        },
        "1440p": {
          "avg": 698,
          "low": 163
        },
        "4K": {
          "avg": 636,
          "low": 150
        }
      },
      "Ryzen 7 7700": {
        "1080p": {
          "avg": 814,
          "low": 243
        },
        "1440p": {
          "avg": 791,
          "low": 238
        },
        "4K": {
          "avg": 730,
          "low": 224
        }
      },
      "Ryzen 7 5800X3D": {
        "1080p": {
          "avg": 812,
          "low": 241
        },
        "1440p": {
          "avg": 789,
          "low": 236
        },
        "4K": {
          "avg": 728,
          "low": 223
        }
      },
      "Ryzen 7 5800X": {
        "1080p": {
          "avg": 714,
          "low": 163
        },
        "1440p": {
          "avg": 691,
          "low": 158
        },
        "4K": {
          "avg": 630,
          "low": 145
        }
      },
      "Core i7-14700": {
        "1080p": {
          "avg": 808,
          "low": 237
        },
        "1440p": {
          "avg": 785,
          "low": 233
        },
        "4K": {
          "avg": 724,
          "low": 219
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 818,
          "low": 245
        },
        "1440p": {
          "avg": 794,
          "low": 240
        },
        "4K": {
          "avg": 733,
          "low": 227
        }
      },
      "Core i7-13700": {
        "1080p": {
          "avg": 792,
          "low": 224
        },
        "1440p": {
          "avg": 768,
          "low": 219
        },
        "4K": {
          "avg": 707,
          "low": 206
        }
      },
      "Core i7-12700K": {
        "1080p": {
          "avg": 771,
          "low": 207
        },
        "1440p": {
          "avg": 747,
          "low": 202
        },
        "4K": {
          "avg": 686,
          "low": 189
        }
      },
      "Core i7-12700": {
        "1080p": {
          "avg": 712,
          "low": 162
        },
        "1440p": {
          "avg": 689,
          "low": 157
        },
        "4K": {
          "avg": 628,
          "low": 144
        }
      },
      "Core i7-11700K": {
        "1080p": {
          "avg": 724,
          "low": 171
        },
        "1440p": {
          "avg": 701,
          "low": 166
        },
        "4K": {
          "avg": 640,
          "low": 152
        }
      },
      "Ryzen 5 7600": {
        "1080p": {
          "avg": 806,
          "low": 236
        },
        "1440p": {
          "avg": 783,
          "low": 231
        },
        "4K": {
          "avg": 722,
          "low": 218
        }
      },
      "Ryzen 5 7500F": {
        "1080p": {
          "avg": 787,
          "low": 220
        },
        "1440p": {
          "avg": 764,
          "low": 215
        },
        "4K": {
          "avg": 703,
          "low": 202
        }
      },
      "Ryzen 5 5600X3D": {
        "1080p": {
          "avg": 797,
          "low": 228
        },
        "1440p": {
          "avg": 774,
          "low": 223
        },
        "4K": {
          "avg": 712,
          "low": 210
        }
      },
      "Ryzen 5 5600X": {
        "1080p": {
          "avg": 698,
          "low": 151
        },
        "1440p": {
          "avg": 675,
          "low": 147
        },
        "4K": {
          "avg": 614,
          "low": 133
        }
      },
      "Ryzen 5 5600": {
        "1080p": {
          "avg": 698,
          "low": 151
        },
        "1440p": {
          "avg": 675,
          "low": 147
        },
        "4K": {
          "avg": 614,
          "low": 133
        }
      },
      "Ryzen 5 5500": {
        "1080p": {
          "avg": 670,
          "low": 131
        },
        "1440p": {
          "avg": 647,
          "low": 126
        },
        "4K": {
          "avg": 586,
          "low": 113
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 812,
          "low": 240
        },
        "1440p": {
          "avg": 788,
          "low": 235
        },
        "4K": {
          "avg": 727,
          "low": 222
        }
      },
      "Core i5-14600": {
        "1080p": {
          "avg": 812,
          "low": 240
        },
        "1440p": {
          "avg": 788,
          "low": 235
        },
        "4K": {
          "avg": 727,
          "low": 222
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 767,
          "low": 204
        },
        "1440p": {
          "avg": 743,
          "low": 199
        },
        "4K": {
          "avg": 682,
          "low": 185
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 794,
          "low": 226
        },
        "1440p": {
          "avg": 770,
          "low": 221
        },
        "4K": {
          "avg": 709,
          "low": 207
        }
      },
      "Core i5-13600": {
        "1080p": {
          "avg": 794,
          "low": 226
        },
        "1440p": {
          "avg": 770,
          "low": 221
        },
        "4K": {
          "avg": 709,
          "low": 207
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 794,
          "low": 226
        },
        "1440p": {
          "avg": 770,
          "low": 221
        },
        "4K": {
          "avg": 709,
          "low": 207
        }
      },
      "Core i5-12600": {
        "1080p": {
          "avg": 755,
          "low": 195
        },
        "1440p": {
          "avg": 732,
          "low": 190
        },
        "4K": {
          "avg": 671,
          "low": 177
        }
      },
      "Core i5-11600K": {
        "1080p": {
          "avg": 705,
          "low": 156
        },
        "1440p": {
          "avg": 681,
          "low": 151
        },
        "4K": {
          "avg": 620,
          "low": 138
        }
      },
      "Core i5-11600": {
        "1080p": {
          "avg": 705,
          "low": 156
        },
        "1440p": {
          "avg": 681,
          "low": 151
        },
        "4K": {
          "avg": 620,
          "low": 138
        }
      },
      "Core i3-14100": {
        "1080p": {
          "avg": 719,
          "low": 167
        },
        "1440p": {
          "avg": 695,
          "low": 162
        },
        "4K": {
          "avg": 634,
          "low": 148
        }
      },
      "Core i3-13100": {
        "1080p": {
          "avg": 709,
          "low": 160
        },
        "1440p": {
          "avg": 686,
          "low": 155
        },
        "4K": {
          "avg": 625,
          "low": 141
        }
      },
      "Core i3-12300": {
        "1080p": {
          "avg": 706,
          "low": 157
        },
        "1440p": {
          "avg": 683,
          "low": 152
        },
        "4K": {
          "avg": 622,
          "low": 139
        }
      },
      "Core i3-12100": {
        "1080p": {
          "avg": 698,
          "low": 151
        },
        "1440p": {
          "avg": 675,
          "low": 147
        },
        "4K": {
          "avg": 614,
          "low": 133
        }
      },
      "Ryzen 3 5300G": {
        "1080p": {
          "avg": 645,
          "low": 114
        },
        "1440p": {
          "avg": 622,
          "low": 109
        },
        "4K": {
          "avg": 561,
          "low": 96
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 1012,
          "low": 421
        },
        "1440p": {
          "avg": 989,
          "low": 416
        },
        "4K": {
          "avg": 928,
          "low": 403
        }
      },
      "GeForce RTX 5080": {
        "1080p": {
          "avg": 1004,
          "low": 415
        },
        "1440p": {
          "avg": 981,
          "low": 410
        },
        "4K": {
          "avg": 920,
          "low": 397
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 997,
          "low": 412
        },
        "1440p": {
          "avg": 973,
          "low": 407
        },
        "4K": {
          "avg": 912,
          "low": 394
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 986,
          "low": 409
        },
        "1440p": {
          "avg": 962,
          "low": 404
        },
        "4K": {
          "avg": 901,
          "low": 391
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 866,
          "low": 383
        },
        "1440p": {
          "avg": 927,
          "low": 396
        },
        "4K": {
          "avg": 866,
          "low": 383
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 876,
          "low": 385
        },
        "1440p": {
          "avg": 937,
          "low": 398
        },
        "4K": {
          "avg": 876,
          "low": 385
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 842,
          "low": 378
        },
        "1440p": {
          "avg": 903,
          "low": 391
        },
        "4K": {
          "avg": 842,
          "low": 378
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 923,
          "low": 398
        },
        "1440p": {
          "avg": 984,
          "low": 412
        },
        "4K": {
          "avg": 923,
          "low": 398
        }
      },
      "GeForce RTX 4080 SUPER": {
        "1080p": {
          "avg": 913,
          "low": 394
        },
        "1440p": {
          "avg": 974,
          "low": 408
        },
        "4K": {
          "avg": 913,
          "low": 394
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 913,
          "low": 394
        },
        "1440p": {
          "avg": 974,
          "low": 408
        },
        "4K": {
          "avg": 913,
          "low": 394
        }
      },
      "GeForce RTX 4070 Ti SUPER": {
        "1080p": {
          "avg": 905,
          "low": 392
        },
        "1440p": {
          "avg": 966,
          "low": 405
        },
        "4K": {
          "avg": 905,
          "low": 392
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 901,
          "low": 391
        },
        "1440p": {
          "avg": 962,
          "low": 404
        },
        "4K": {
          "avg": 901,
          "low": 391
        }
      },
      "GeForce RTX 4070 SUPER": {
        "1080p": {
          "avg": 896,
          "low": 389
        },
        "1440p": {
          "avg": 957,
          "low": 403
        },
        "4K": {
          "avg": 896,
          "low": 389
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 888,
          "low": 389
        },
        "1440p": {
          "avg": 949,
          "low": 403
        },
        "4K": {
          "avg": 888,
          "low": 389
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 867,
          "low": 385
        },
        "1440p": {
          "avg": 928,
          "low": 398
        },
        "4K": {
          "avg": 867,
          "low": 385
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 848,
          "low": 381
        },
        "1440p": {
          "avg": 909,
          "low": 394
        },
        "4K": {
          "avg": 848,
          "low": 381
        }
      },
      "GeForce RTX 3090": {
        "1080p": {
          "avg": 895,
          "low": 391
        },
        "1440p": {
          "avg": 956,
          "low": 404
        },
        "4K": {
          "avg": 895,
          "low": 391
        }
      },
      "GeForce RTX 3090 Ti": {
        "1080p": {
          "avg": 901,
          "low": 393
        },
        "1440p": {
          "avg": 962,
          "low": 406
        },
        "4K": {
          "avg": 901,
          "low": 393
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 894,
          "low": 391
        },
        "1440p": {
          "avg": 956,
          "low": 404
        },
        "4K": {
          "avg": 894,
          "low": 391
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 887,
          "low": 389
        },
        "1440p": {
          "avg": 948,
          "low": 402
        },
        "4K": {
          "avg": 887,
          "low": 389
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 875,
          "low": 386
        },
        "1440p": {
          "avg": 936,
          "low": 400
        },
        "4K": {
          "avg": 875,
          "low": 386
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 868,
          "low": 385
        },
        "1440p": {
          "avg": 929,
          "low": 398
        },
        "4K": {
          "avg": 868,
          "low": 385
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 856,
          "low": 383
        },
        "1440p": {
          "avg": 917,
          "low": 396
        },
        "4K": {
          "avg": 856,
          "low": 383
        }
      },
      "GeForce RTX 3060 Ti GDDR6X": {
        "1080p": {
          "avg": 859,
          "low": 383
        },
        "1440p": {
          "avg": 920,
          "low": 397
        },
        "4K": {
          "avg": 859,
          "low": 383
        }
      },
      "GeForce RTX 3060 8 GB": {
        "1080p": {
          "avg": 817,
          "low": 375
        },
        "1440p": {
          "avg": 878,
          "low": 389
        },
        "4K": {
          "avg": 817,
          "low": 375
        }
      },
      "GeForce RTX 3050 6 GB": {
        "1080p": {
          "avg": 779,
          "low": 368
        },
        "1440p": {
          "avg": 841,
          "low": 382
        },
        "4K": {
          "avg": 779,
          "low": 368
        }
      },
      "Radeon RX 9070 XT": {
        "1080p": {
          "avg": 918,
          "low": 398
        },
        "1440p": {
          "avg": 979,
          "low": 411
        },
        "4K": {
          "avg": 918,
          "low": 398
        }
      },
      "Radeon RX 9070": {
        "1080p": {
          "avg": 913,
          "low": 396
        },
        "1440p": {
          "avg": 974,
          "low": 409
        },
        "4K": {
          "avg": 913,
          "low": 396
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 919,
          "low": 398
        },
        "1440p": {
          "avg": 981,
          "low": 411
        },
        "4K": {
          "avg": 919,
          "low": 398
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 913,
          "low": 396
        },
        "1440p": {
          "avg": 975,
          "low": 409
        },
        "4K": {
          "avg": 913,
          "low": 396
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 896,
          "low": 391
        },
        "1440p": {
          "avg": 957,
          "low": 405
        },
        "4K": {
          "avg": 896,
          "low": 391
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 885,
          "low": 389
        },
        "1440p": {
          "avg": 946,
          "low": 402
        },
        "4K": {
          "avg": 885,
          "low": 389
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 850,
          "low": 381
        },
        "1440p": {
          "avg": 911,
          "low": 395
        },
        "4K": {
          "avg": 850,
          "low": 381
        }
      },
      "Radeon RX 6600 XT": {
        "1080p": {
          "avg": 924,
          "low": 398
        },
        "1440p": {
          "avg": 901,
          "low": 393
        },
        "4K": {
          "avg": 840,
          "low": 379
        }
      },
      "Radeon RX 6600": {
        "1440p": {
          "avg": 886,
          "low": 390
        },
        "1080p": {
          "avg": 909,
          "low": 395
        },
        "4K": {
          "avg": 825,
          "low": 377
        }
      },
      "Radeon RX 6400": {
        "4K": {
          "avg": 752,
          "low": 363
        },
        "1080p": {
          "avg": 837,
          "low": 381
        },
        "1440p": {
          "avg": 814,
          "low": 377
        }
      },
      "Radeon RX 6700 XT": {
        "1440p": {
          "avg": 924,
          "low": 397
        },
        "1080p": {
          "avg": 947,
          "low": 402
        },
        "4K": {
          "avg": 863,
          "low": 384
        }
      },
      "Radeon RX 6800 XT": {
        "4K": {
          "avg": 894,
          "low": 391
        },
        "1080p": {
          "avg": 978,
          "low": 409
        },
        "1440p": {
          "avg": 955,
          "low": 404
        }
      },
      "Radeon RX 6800": {
        "1440p": {
          "avg": 942,
          "low": 401
        },
        "1080p": {
          "avg": 965,
          "low": 406
        },
        "4K": {
          "avg": 881,
          "low": 388
        }
      },
      "Radeon RX 6900 XT": {
        "4K": {
          "avg": 898,
          "low": 392
        },
        "1080p": {
          "avg": 983,
          "low": 410
        },
        "1440p": {
          "avg": 959,
          "low": 405
        }
      },
      "Radeon RX 6650 XT": {
        "1440p": {
          "avg": 903,
          "low": 393
        },
        "1080p": {
          "avg": 926,
          "low": 398
        },
        "4K": {
          "avg": 842,
          "low": 380
        }
      },
      "Radeon RX 7600 XT": {
        "4K": {
          "avg": 852,
          "low": 382
        },
        "1080p": {
          "avg": 936,
          "low": 400
        },
        "1440p": {
          "avg": 913,
          "low": 395
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 1000,
          "low": 414
        },
        "1440p": {
          "avg": 976,
          "low": 410
        },
        "4K": {
          "avg": 915,
          "low": 396
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 991,
          "low": 412
        },
        "1440p": {
          "avg": 968,
          "low": 407
        },
        "4K": {
          "avg": 907,
          "low": 394
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 982,
          "low": 410
        },
        "1440p": {
          "avg": 959,
          "low": 405
        },
        "4K": {
          "avg": 898,
          "low": 391
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 940,
          "low": 400
        },
        "1440p": {
          "avg": 916,
          "low": 395
        },
        "4K": {
          "avg": 855,
          "low": 382
        }
      },
      "GeForce RTX 3050": {
        "1080p": {
          "avg": 863,
          "low": 386
        },
        "1440p": {
          "avg": 840,
          "low": 381
        },
        "4K": {
          "avg": 779,
          "low": 368
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 987,
          "low": 411
        },
        "1440p": {
          "avg": 964,
          "low": 406
        },
        "4K": {
          "avg": 903,
          "low": 392
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 1002,
          "low": 415
        },
        "1440p": {
          "avg": 979,
          "low": 410
        },
        "4K": {
          "avg": 918,
          "low": 397
        }
      },
      "Radeon RX 6500 XT": {
        "1080p": {
          "avg": 865,
          "low": 386
        },
        "1440p": {
          "avg": 842,
          "low": 381
        },
        "4K": {
          "avg": 781,
          "low": 368
        }
      }
    }
  },
  "无畏契约": {
    "cpu": {
      "Ryzen 9 9950X3D": {
        "1080p": {
          "avg": 969,
          "low": 724
        },
        "1440p": {
          "avg": 916,
          "low": 687
        },
        "4K": {
          "avg": 785,
          "low": 589
        }
      },
      "Ryzen 9 9950X": {
        "1080p": {
          "avg": 969,
          "low": 724
        },
        "1440p": {
          "avg": 916,
          "low": 687
        },
        "4K": {
          "avg": 785,
          "low": 589
        }
      },
      "Ryzen 9 9900X": {
        "1080p": {
          "avg": 839,
          "low": 610
        },
        "1440p": {
          "avg": 786,
          "low": 586
        },
        "4K": {
          "avg": 656,
          "low": 492
        }
      },
      "Ryzen 7 7800X3D": {
        "1080p": {
          "avg": 868,
          "low": 635
        },
        "1440p": {
          "avg": 815,
          "low": 611
        },
        "4K": {
          "avg": 685,
          "low": 514
        }
      },
      "Ryzen 7 7700X": {
        "1080p": {
          "avg": 786,
          "low": 565
        },
        "1440p": {
          "avg": 733,
          "low": 541
        },
        "4K": {
          "avg": 603,
          "low": 452
        }
      },
      "Ryzen 5 7600X": {
        "1080p": {
          "avg": 769,
          "low": 550
        },
        "1440p": {
          "avg": 716,
          "low": 526
        },
        "4K": {
          "avg": 586,
          "low": 439
        }
      },
      "Ryzen 9 7950X3D": {
        "1080p": {
          "avg": 892,
          "low": 656
        },
        "1440p": {
          "avg": 839,
          "low": 629
        },
        "4K": {
          "avg": 709,
          "low": 531
        }
      },
      "Ryzen 9 7900X3D": {
        "1080p": {
          "avg": 896,
          "low": 660
        },
        "1440p": {
          "avg": 843,
          "low": 632
        },
        "4K": {
          "avg": 713,
          "low": 535
        }
      },
      "Ryzen 9 7950X": {
        "1080p": {
          "avg": 892,
          "low": 656
        },
        "1440p": {
          "avg": 839,
          "low": 629
        },
        "4K": {
          "avg": 709,
          "low": 531
        }
      },
      "Ryzen 9 7900X": {
        "1080p": {
          "avg": 789,
          "low": 567
        },
        "1440p": {
          "avg": 736,
          "low": 543
        },
        "4K": {
          "avg": 606,
          "low": 454
        }
      },
      "Core i9-14900K": {
        "1080p": {
          "avg": 809,
          "low": 584
        },
        "1440p": {
          "avg": 756,
          "low": 560
        },
        "4K": {
          "avg": 626,
          "low": 469
        }
      },
      "Core i9-14900KS": {
        "1080p": {
          "avg": 822,
          "low": 596
        },
        "1440p": {
          "avg": 769,
          "low": 572
        },
        "4K": {
          "avg": 639,
          "low": 479
        }
      },
      "Core i9-14900": {
        "1080p": {
          "avg": 809,
          "low": 584
        },
        "1440p": {
          "avg": 756,
          "low": 560
        },
        "4K": {
          "avg": 626,
          "low": 469
        }
      },
      "Core i9-14900F": {
        "1080p": {
          "avg": 789,
          "low": 567
        },
        "1440p": {
          "avg": 736,
          "low": 543
        },
        "4K": {
          "avg": 605,
          "low": 454
        }
      },
      "Core i9-14900KF": {
        "1080p": {
          "avg": 809,
          "low": 584
        },
        "1440p": {
          "avg": 756,
          "low": 560
        },
        "4K": {
          "avg": 626,
          "low": 469
        }
      },
      "Core i7-14700K": {
        "1080p": {
          "avg": 796,
          "low": 573
        },
        "1440p": {
          "avg": 742,
          "low": 549
        },
        "4K": {
          "avg": 612,
          "low": 459
        }
      },
      "Core i7-14700KF": {
        "1080p": {
          "avg": 796,
          "low": 573
        },
        "1440p": {
          "avg": 742,
          "low": 549
        },
        "4K": {
          "avg": 612,
          "low": 459
        }
      },
      "Core i7-14700F": {
        "1080p": {
          "avg": 771,
          "low": 552
        },
        "1440p": {
          "avg": 718,
          "low": 528
        },
        "4K": {
          "avg": 588,
          "low": 441
        }
      },
      "Core i5-14600K": {
        "1080p": {
          "avg": 774,
          "low": 555
        },
        "1440p": {
          "avg": 721,
          "low": 531
        },
        "4K": {
          "avg": 591,
          "low": 443
        }
      },
      "Core i5-14600KF": {
        "1080p": {
          "avg": 769,
          "low": 550
        },
        "1440p": {
          "avg": 716,
          "low": 526
        },
        "4K": {
          "avg": 586,
          "low": 439
        }
      },
      "Core i5-14500": {
        "1080p": {
          "avg": 731,
          "low": 519
        },
        "1440p": {
          "avg": 678,
          "low": 495
        },
        "4K": {
          "avg": 548,
          "low": 411
        }
      },
      "Core i5-14400": {
        "1080p": {
          "avg": 706,
          "low": 498
        },
        "1440p": {
          "avg": 653,
          "low": 474
        },
        "4K": {
          "avg": 523,
          "low": 392
        }
      },
      "Core i5-14400F": {
        "1080p": {
          "avg": 706,
          "low": 498
        },
        "1440p": {
          "avg": 653,
          "low": 474
        },
        "4K": {
          "avg": 523,
          "low": 392
        }
      },
      "Core i9-13900KS": {
        "1080p": {
          "avg": 811,
          "low": 586
        },
        "1440p": {
          "avg": 758,
          "low": 562
        },
        "4K": {
          "avg": 627,
          "low": 470
        }
      },
      "Core i9-13900K": {
        "1080p": {
          "avg": 797,
          "low": 574
        },
        "1440p": {
          "avg": 744,
          "low": 550
        },
        "4K": {
          "avg": 614,
          "low": 460
        }
      },
      "Core i9-13900": {
        "1080p": {
          "avg": 797,
          "low": 574
        },
        "1440p": {
          "avg": 744,
          "low": 550
        },
        "4K": {
          "avg": 614,
          "low": 460
        }
      },
      "Core i9-12900KS": {
        "1080p": {
          "avg": 766,
          "low": 548
        },
        "1440p": {
          "avg": 713,
          "low": 524
        },
        "4K": {
          "avg": 583,
          "low": 437
        }
      },
      "Core i9-12900K": {
        "1080p": {
          "avg": 747,
          "low": 532
        },
        "1440p": {
          "avg": 694,
          "low": 508
        },
        "4K": {
          "avg": 564,
          "low": 423
        }
      },
      "Core i7-13700K": {
        "1080p": {
          "avg": 780,
          "low": 559
        },
        "1440p": {
          "avg": 727,
          "low": 535
        },
        "4K": {
          "avg": 597,
          "low": 447
        }
      },
      "Core i7-13700KF": {
        "1080p": {
          "avg": 784,
          "low": 563
        },
        "1440p": {
          "avg": 731,
          "low": 539
        },
        "4K": {
          "avg": 601,
          "low": 450
        }
      },
      "Core i5-13600K": {
        "1080p": {
          "avg": 757,
          "low": 540
        },
        "1440p": {
          "avg": 704,
          "low": 516
        },
        "4K": {
          "avg": 574,
          "low": 430
        }
      },
      "Core i5-12600K": {
        "1080p": {
          "avg": 720,
          "low": 510
        },
        "1440p": {
          "avg": 667,
          "low": 486
        },
        "4K": {
          "avg": 537,
          "low": 403
        }
      }
    },
    "gpu": {
      "GeForce RTX 5090": {
        "1080p": {
          "avg": 969,
          "low": 725
        },
        "1440p": {
          "avg": 916,
          "low": 687
        },
        "4K": {
          "avg": 786,
          "low": 589
        }
      },
      "GeForce RTX 4090": {
        "1080p": {
          "avg": 902,
          "low": 665
        },
        "1440p": {
          "avg": 849,
          "low": 636
        },
        "4K": {
          "avg": 718,
          "low": 539
        }
      },
      "GeForce RTX 4080 Super": {
        "1080p": {
          "avg": 846,
          "low": 618
        },
        "1440p": {
          "avg": 793,
          "low": 594
        },
        "4K": {
          "avg": 663,
          "low": 497
        }
      },
      "GeForce RTX 4080": {
        "1080p": {
          "avg": 845,
          "low": 617
        },
        "1440p": {
          "avg": 792,
          "low": 593
        },
        "4K": {
          "avg": 662,
          "low": 496
        }
      },
      "GeForce RTX 3080 Ti": {
        "1080p": {
          "avg": 778,
          "low": 565
        },
        "1440p": {
          "avg": 725,
          "low": 541
        },
        "4K": {
          "avg": 595,
          "low": 446
        }
      },
      "GeForce RTX 3080": {
        "1080p": {
          "avg": 761,
          "low": 552
        },
        "1440p": {
          "avg": 708,
          "low": 528
        },
        "4K": {
          "avg": 578,
          "low": 433
        }
      },
      "GeForce RTX 5070 Ti": {
        "1080p": {
          "avg": 842,
          "low": 615
        },
        "1440p": {
          "avg": 789,
          "low": 591
        },
        "4K": {
          "avg": 659,
          "low": 494
        }
      },
      "GeForce RTX 5070": {
        "1080p": {
          "avg": 803,
          "low": 584
        },
        "1440p": {
          "avg": 750,
          "low": 560
        },
        "4K": {
          "avg": 620,
          "low": 465
        }
      },
      "GeForce RTX 4070 Ti Super": {
        "1080p": {
          "avg": 815,
          "low": 593
        },
        "1440p": {
          "avg": 762,
          "low": 569
        },
        "4K": {
          "avg": 632,
          "low": 474
        }
      },
      "GeForce RTX 4070 Super": {
        "1080p": {
          "avg": 789,
          "low": 573
        },
        "1440p": {
          "avg": 736,
          "low": 549
        },
        "4K": {
          "avg": 605,
          "low": 454
        }
      },
      "GeForce RTX 4070 Ti": {
        "1080p": {
          "avg": 804,
          "low": 584
        },
        "1440p": {
          "avg": 751,
          "low": 560
        },
        "4K": {
          "avg": 621,
          "low": 465
        }
      },
      "GeForce RTX 4070": {
        "1080p": {
          "avg": 762,
          "low": 553
        },
        "1440p": {
          "avg": 709,
          "low": 529
        },
        "4K": {
          "avg": 579,
          "low": 434
        }
      },
      "GeForce RTX 3070 Ti": {
        "1080p": {
          "avg": 735,
          "low": 534
        },
        "1440p": {
          "avg": 682,
          "low": 510
        },
        "4K": {
          "avg": 552,
          "low": 414
        }
      },
      "GeForce RTX 3070": {
        "1080p": {
          "avg": 723,
          "low": 526
        },
        "1440p": {
          "avg": 670,
          "low": 502
        },
        "4K": {
          "avg": 539,
          "low": 404
        }
      },
      "GeForce RTX 5060 Ti": {
        "1080p": {
          "avg": 743,
          "low": 539
        },
        "1440p": {
          "avg": 690,
          "low": 515
        },
        "4K": {
          "avg": 560,
          "low": 420
        }
      },
      "GeForce RTX 5060": {
        "1080p": {
          "avg": 724,
          "low": 526
        },
        "1440p": {
          "avg": 670,
          "low": 502
        },
        "4K": {
          "avg": 540,
          "low": 405
        }
      },
      "GeForce RTX 4060 Ti": {
        "1080p": {
          "avg": 724,
          "low": 526
        },
        "1440p": {
          "avg": 670,
          "low": 502
        },
        "4K": {
          "avg": 540,
          "low": 405
        }
      },
      "GeForce RTX 4060": {
        "1080p": {
          "avg": 690,
          "low": 504
        },
        "1440p": {
          "avg": 637,
          "low": 477
        },
        "4K": {
          "avg": 506,
          "low": 380
        }
      },
      "GeForce RTX 3060 Ti": {
        "1080p": {
          "avg": 702,
          "low": 512
        },
        "1440p": {
          "avg": 649,
          "low": 487
        },
        "4K": {
          "avg": 519,
          "low": 389
        }
      },
      "GeForce RTX 3060": {
        "1080p": {
          "avg": 702,
          "low": 512
        },
        "1440p": {
          "avg": 649,
          "low": 487
        },
        "4K": {
          "avg": 519,
          "low": 389
        }
      },
      "GeForce RTX 5050": {
        "1080p": {
          "avg": 685,
          "low": 501
        },
        "1440p": {
          "avg": 632,
          "low": 474
        },
        "4K": {
          "avg": 502,
          "low": 376
        }
      },
      "Radeon RX 7900 XTX": {
        "1080p": {
          "avg": 863,
          "low": 632
        },
        "1440p": {
          "avg": 810,
          "low": 608
        },
        "4K": {
          "avg": 680,
          "low": 510
        }
      },
      "Radeon RX 7900 XT": {
        "1080p": {
          "avg": 837,
          "low": 610
        },
        "1440p": {
          "avg": 784,
          "low": 586
        },
        "4K": {
          "avg": 653,
          "low": 490
        }
      },
      "Radeon RX 7900 GRE": {
        "1080p": {
          "avg": 802,
          "low": 583
        },
        "1440p": {
          "avg": 749,
          "low": 559
        },
        "4K": {
          "avg": 619,
          "low": 464
        }
      },
      "Radeon RX 9800 XT": {
        "1080p": {
          "avg": 802,
          "low": 583
        },
        "1440p": {
          "avg": 749,
          "low": 559
        },
        "4K": {
          "avg": 619,
          "low": 464
        }
      },
      "Radeon RX 9700 XT": {
        "1080p": {
          "avg": 802,
          "low": 583
        },
        "1440p": {
          "avg": 749,
          "low": 559
        },
        "4K": {
          "avg": 619,
          "low": 464
        }
      },
      "Radeon RX 970": {
        "1080p": {
          "avg": 802,
          "low": 583
        },
        "1440p": {
          "avg": 749,
          "low": 559
        },
        "4K": {
          "avg": 619,
          "low": 464
        }
      },
      "Radeon RX 8800 XT": {
        "1080p": {
          "avg": 802,
          "low": 583
        },
        "1440p": {
          "avg": 749,
          "low": 559
        },
        "4K": {
          "avg": 619,
          "low": 464
        }
      },
      "Radeon RX 7800 XT": {
        "1080p": {
          "avg": 782,
          "low": 568
        },
        "1440p": {
          "avg": 729,
          "low": 544
        },
        "4K": {
          "avg": 599,
          "low": 449
        }
      },
      "Radeon RX 7700 XT": {
        "1080p": {
          "avg": 756,
          "low": 549
        },
        "1440p": {
          "avg": 703,
          "low": 525
        },
        "4K": {
          "avg": 573,
          "low": 429
        }
      },
      "Radeon RX 7600 XT": {
        "1080p": {
          "avg": 696,
          "low": 508
        },
        "1440p": {
          "avg": 643,
          "low": 482
        },
        "4K": {
          "avg": 512,
          "low": 384
        }
      },
      "Radeon RX 7600": {
        "1080p": {
          "avg": 693,
          "low": 506
        },
        "1440p": {
          "avg": 640,
          "low": 480
        },
        "4K": {
          "avg": 510,
          "low": 382
        }
      },
      "Radeon RX 6600": {
        "1080p": {
          "avg": 657,
          "low": 484
        },
        "1440p": {
          "avg": 604,
          "low": 453
        },
        "4K": {
          "avg": 474,
          "low": 355
        }
      },
      "GeForce RTX 4090 D": {
        "1080p": {
          "avg": 969,
          "low": 725
        },
        "1440p": {
          "avg": 916,
          "low": 687
        },
        "4K": {
          "avg": 786,
          "low": 589
        }
      },
      "GeForce RTX 3090 Ti": {
        "1080p": {
          "avg": 796,
          "low": 578
        },
        "1440p": {
          "avg": 743,
          "low": 554
        },
        "4K": {
          "avg": 613,
          "low": 460
        }
      },
      "GeForce RTX 3090": {
        "1080p": {
          "avg": 780,
          "low": 566
        },
        "1440p": {
          "avg": 727,
          "low": 542
        },
        "4K": {
          "avg": 597,
          "low": 448
        }
      },
      "GeForce RTX 5080": {
        "1080p": {
          "avg": 879,
          "low": 645
        },
        "1440p": {
          "avg": 825,
          "low": 619
        },
        "4K": {
          "avg": 695,
          "low": 521
        }
      },
      "GeForce RTX 3050": {
        "1080p": {
          "avg": 602,
          "low": 451
        },
        "1440p": {
          "avg": 549,
          "low": 411
        },
        "4K": {
          "avg": 418,
          "low": 314
        }
      },
      "Radeon RX 6500 XT": {
        "1080p": {
          "avg": 604,
          "low": 453
        },
        "1440p": {
          "avg": 551,
          "low": 413
        },
        "4K": {
          "avg": 420,
          "low": 315
        }
      },
      "Radeon RX 6400": {
        "1080p": {
          "avg": 573,
          "low": 429
        },
        "1440p": {
          "avg": 520,
          "low": 390
        },
        "4K": {
          "avg": 389,
          "low": 292
        }
      }
    }
  }
};
