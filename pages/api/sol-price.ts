import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await r.json();
    res.status(200).json({ price: data.solana.usd });
  } catch {
    res.status(500).json({ price: 0 });
  }
}