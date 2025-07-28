import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { createCreateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata";
import ImagePicker from "./ImagePicker";
import { uploadToPinata } from "@/utils/pinata";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export default function CreateToken() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    supply: "1000000000",
    twitter: "",
    discord: "",
    website: "",
    extra: "",
    fakeCreator: "",
    fakeToken: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [realMint, setRealMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [solPrice, setSolPrice] = useState(0);

  useEffect(() => {
    fetch("/api/sol-price")
      .then((r) => r.json())
      .then((d) => setSolPrice(d.price));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    try {
      let logoUri = "";
      if (logoFile) logoUri = await uploadToPinata(logoFile, logoFile.name);

      const metadataJson = {
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        image: logoUri,
        external_url: form.website,
        extensions: {
          twitter: form.twitter,
          discord: form.discord,
          extra: form.extra,
          fakeCreator: form.fakeCreator,
          fakeToken: form.fakeToken,
        },
        properties: { category: "image", files: [{ uri: logoUri, type: "image/png" }] },
        seller_fee_basis_points: 0,
        creators: form.fakeCreator
          ? [{ address: form.fakeCreator, verified: false, share: 100 }]
          : null,
      };
      const metadataBlob = new Blob([JSON.stringify(metadataJson)], {
        type: "application/json",
      });
      const metadataUri = await uploadToPinata(metadataBlob, "metadata.json");

      const mintKeypair = Keypair.generate();
      const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const decimals = 6;
      const amount = parseInt(form.supply) * 10 ** decimals;
      const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);

      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          lamports: mintRent,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKeypair.publicKey, decimals, publicKey, null, TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(publicKey, ata, publicKey, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, ata, publicKey, amount, [], TOKEN_PROGRAM_ID),
        createCreateMetadataAccountV2Instruction(
          {
            metadata: metadataPDA,
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
          },
          {
            data: {
              name: form.name,
              symbol: form.symbol,
              uri: metadataUri,
              sellerFeeBasisPoints: 0,
              creators: form.fakeCreator
                ? [
                    {
                      address: new PublicKey(form.fakeCreator),
                      verified: false,
                      share: 100,
                    },
                  ]
                : null,
              collection: null,
              uses: null,
            },
            isMutable: false,
            updateAuthority: publicKey.toBase58(), // <-- THIS LINE FIXES THE ERROR
          }
        ),
        createSetAuthorityInstruction(mintKeypair.publicKey, publicKey, AuthorityType.MintTokens, null)
      );

      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.partialSign(mintKeypair);
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setRealMint(mintKeypair.publicKey.toString());
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(realMint);
    alert("Copied!");
  };

  return (
    <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 space-y-4 text-white">
      <h1 className="text-2xl font-bold text-center">Create Solana Memecoin</h1>

      <div className="flex justify-between">
        <span>SOL Price:</span>
        <span>${solPrice.toFixed(2)}</span>
      </div>

      {!connected && <WalletMultiButton className="w-full !rounded-lg" />}

      {connected && (
        <>
          <ImagePicker onImage={setLogoFile} />

          {["name", "symbol", "description", "supply", "fakeCreator", "fakeToken"].map((k) =>
            k === "description" ? (
              <textarea
                key={k}
                name={k}
                placeholder={k}
                value={form[k as keyof typeof form]}
                onChange={handleChange}
                className="w-full rounded-lg p-2 bg-gray-700"
              />
            ) : (
              <input
                key={k}
                name={k}
                type={k === "supply" ? "number" : "text"}
                placeholder={k}
                value={form[k as keyof typeof form]}
                onChange={handleChange}
                className="w-full rounded-lg p-2 bg-gray-700"
              />
            )
          )}

          {["twitter", "discord", "website", "extra"].map((k) => (
            <input
              key={k}
              name={k}
              placeholder={k}
              value={form[k as keyof typeof form]}
              onChange={handleChange}
              className="w-full rounded-lg p-2 bg-gray-700"
            />
          ))}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
          >
            {loading ? "Creating..." : "Create Token"}
          </button>

          {realMint && (
            <div>
              <p className="text-sm break-all">Real Token Address:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={realMint}
                  className="w-full rounded-lg p-2 bg-gray-700 text-xs"
                />
                <button onClick={copyToClipboard} className="px-3 py-1 bg-green-600 rounded-lg">
                  Copy
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
