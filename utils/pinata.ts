import axios from "axios";

const PINATA_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export async function uploadToPinata(file: File | Blob, name: string) {
  const formData = new FormData();
  formData.append("file", file, name);

  const res = await axios.post(PINATA_API, formData, {
    maxContentLength: Infinity,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${(formData as any)._boundary}`,
      pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
      pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!,
    },
  });

  return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
}