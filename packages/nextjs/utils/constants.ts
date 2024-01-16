import { Redis } from "@upstash/redis";

export const DB_TYPE = "passKeyUsers";
export const isLocal = false;

export const redis = new Redis({
  url: process.env.UPSTASH_URL as string,
  token: process.env.UPSTASH_TOKEN as string,
});

export const TX_COLLECTION_NAME = "passKeyData";

export const UserData: any = {};

// export const base64url = {
//   encode: function (buffer) {
//     if (window != undefined) {
//       console.log(`n-🔴 => window:`, window);
//       const base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
//       return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
//     }
//   },
//   decode: function (base64url) {
//     if (window != undefined) {
//       const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
//       const binStr = window.atob(base64);
//       const bin = new Uint8Array(binStr.length);
//       for (let i = 0; i < binStr.length; i++) {
//         bin[i] = binStr.charCodeAt(i);
//       }
//       return bin.buffer;
//     }
//   },
// };
