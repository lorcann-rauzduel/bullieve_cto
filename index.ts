import {
  AuthorityType,
  createAssociatedTokenAccountIdempotent,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createSetAuthorityInstruction,
  ExtensionType,
  getMintLen,
  LENGTH_SIZE,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { collectionConfig, config } from "./config";
import { convertPrivateKeyToArray } from "./generate-key-pair";
import { generateExplorerUrl } from "./utils/generate-explorer-url";

const connection = new Connection(config.rpcUrl, "confirmed");
const uniqueKeypair = convertPrivateKeyToArray(config.privateKey);
const payer = uniqueKeypair ?? Keypair.generate();
const authority = Keypair.generate();
const owner = Keypair.generate();
const mintKeypair = Keypair.generate();
const mint = mintKeypair.publicKey;

function generateNFTMetadata(index: number): TokenMetadata {
  return {
    updateAuthority: authority.publicKey,
    mint: mint,
    name: `${collectionConfig.name} #${index}`,
    symbol: collectionConfig.symbol,
    uri: `${collectionConfig.baseUri}/${index}.json`,
    additionalMetadata: [["Edition", index.toString()]],
  };
}

async function createNFTCollection(count: number = 10) {
  const nfts = [];

  for (let i = 0; i < count; i++) {
    const newMintKeypair = Keypair.generate();
    const newMint = newMintKeypair.publicKey;
    const metadata = generateNFTMetadata(i + 1);
    metadata.mint = newMint;

    try {
      const [initSig, mintSig] = await createTokenAndMint(
        newMintKeypair,
        metadata
      );

      // Remove authority from the mint
      const removeAuthTxId = await removeTokenAuthority(newMint);

      nfts.push({
        mint: newMint.toBase58(),
        initSig,
        mintSig,
        removeAuthTxId,
      });

      console.log(`NFT #${i + 1} created:`);
      console.log(`   Mint: ${generateExplorerUrl(newMint.toBase58(), true)}`);
    } catch (err) {
      console.error(`Error creating NFT #${i + 1}:`, err);
    }
  }

  return nfts;
}

async function createTokenAndMint(
  mintKeypair: Keypair,
  tokenMetadata: TokenMetadata
): Promise<[string, string]> {
  const mint = mintKeypair.publicKey;

  // Calculate the minimum balance for the mint account
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;
  const mintLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  );

  // Prepare transaction
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint,
      authority.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint,
      0,
      authority.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: authority.publicKey,
      mint: mint,
      mintAuthority: authority.publicKey,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      uri: tokenMetadata.uri,
    }),
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: authority.publicKey,
      field: tokenMetadata.additionalMetadata[0][0],
      value: tokenMetadata.additionalMetadata[0][1],
    })
  );

  // Initialize NFT with metadata
  const initSig = await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
    authority,
  ]);

  // Create associated token account
  const sourceAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    owner.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );

  // Mint NFT to associated token account
  const mintSig = await mintTo(
    connection,
    payer,
    mint,
    sourceAccount,
    authority,
    collectionConfig.mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  return [initSig, mintSig];
}

async function removeTokenAuthority(mint: PublicKey): Promise<string> {
  const transaction = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      authority.publicKey,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  return await sendAndConfirmTransaction(connection, transaction, [
    payer,
    authority,
  ]);
}

async function main() {
  try {
    const collection = await createNFTCollection(1);
    console.log("Collection created:", collection);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
