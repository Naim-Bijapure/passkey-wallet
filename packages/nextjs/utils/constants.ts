import { Redis } from "@upstash/redis";

export const DB_TYPE = "passKeyUsers";
export const isLocal = false;

export const redis = new Redis({
  url: process.env.UPSTASH_URL as string,
  token: process.env.UPSTASH_TOKEN as string,
});

export const TX_COLLECTION_NAME = "passKeyData_v3";

// const MOCK_WALLET = [
//   {
//     credentialPublicKey: {
//       "0": 165,
//       "1": 1,
//       "2": 2,
//       "3": 3,
//       "4": 38,
//       "5": 32,
//       "6": 1,
//       "7": 33,
//       "8": 88,
//       "9": 32,
//       "10": 163,
//       "11": 201,
//       "12": 9,
//       "13": 246,
//       "14": 179,
//       "15": 11,
//       "16": 91,
//       "17": 222,
//       "18": 219,
//       "19": 57,
//       "20": 251,
//       "21": 135,
//       "22": 157,
//       "23": 190,
//       "24": 46,
//       "25": 215,
//       "26": 181,
//       "27": 61,
//       "28": 110,
//       "29": 204,
//       "30": 255,
//       "31": 204,
//       "32": 246,
//       "33": 80,
//       "34": 4,
//       "35": 220,
//       "36": 153,
//       "37": 206,
//       "38": 210,
//       "39": 43,
//       "40": 154,
//       "41": 169,
//       "42": 34,
//       "43": 88,
//       "44": 32,
//       "45": 58,
//       "46": 119,
//       "47": 184,
//       "48": 224,
//       "49": 163,
//       "50": 247,
//       "51": 9,
//       "52": 60,
//       "53": 169,
//       "54": 103,
//       "55": 138,
//       "56": 76,
//       "57": 186,
//       "58": 195,
//       "59": 67,
//       "60": 188,
//       "61": 194,
//       "62": 210,
//       "63": 44,
//       "64": 176,
//       "65": 152,
//       "66": 56,
//       "67": 20,
//       "68": 152,
//       "69": 161,
//       "70": 249,
//       "71": 192,
//       "72": 123,
//       "73": 64,
//       "74": 166,
//       "75": 151,
//       "76": 80,
//     },
//     credentialID: {
//       "0": 210,
//       "1": 165,
//       "2": 205,
//       "3": 105,
//       "4": 90,
//       "5": 242,
//       "6": 125,
//       "7": 3,
//       "8": 234,
//       "9": 230,
//       "10": 133,
//       "11": 183,
//       "12": 109,
//       "13": 163,
//       "14": 113,
//       "15": 72,
//       "16": 191,
//       "17": 8,
//       "18": 244,
//       "19": 229,
//       "20": 12,
//       "21": 201,
//       "22": 236,
//       "23": 28,
//       "24": 42,
//       "25": 134,
//       "26": 80,
//       "27": 179,
//       "28": 37,
//       "29": 184,
//       "30": 25,
//       "31": 15,
//     },
//     counter: 1,
//     transports: ["internal"],
//     address: "0x09d22Dc312B2a53acE121dBced3368f7d2831D13",
//   },
// ];

// export const UserData: any = { "0x0fAb64624733a7020D332203568754EB1a37DB89": MOCK_WALLET };
export const UserData: any = {};
