import dotenv from "dotenv";

dotenv.config();

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is not set");
}

export const config = {
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: "https://api.devnet.solana.com",
  explorerUrl: "https://explorer.solana.com",
  cluster: "devnet",
};

export const collectionConfig = {
  name: "Bullievers",
  symbol: "BULL",
  mintAmount: 1,
  baseUri:
    "https://gateway.pinata.cloud/ipfs/bafybeigqqtyg64xaw2lksco45jl3yuk7pcc7hfj45zjl2nvj3fii4ex6bq",
};
