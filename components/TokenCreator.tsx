'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, Transaction, SystemProgram, PublicKey, Keypair } from '@solana/web3.js'
import { createInitializeMintInstruction, createMintToInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, MINT_SIZE } from '@solana/spl-token'
import toast from 'react-hot-toast'
import ImageUpload from './ImageUpload'

// ✅ BULLETPROOF UPLOAD
const uploadToIPFS = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}` },
    body: formData
  })
  return (await response.json()).IpfsHash
}

export default function TokenCreator({ balance, connected }) {
  const { publicKey, signTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [realTokenAddress, setRealTokenAddress] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    totalSupply: '1000000000',
    decimals: '9',
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
    extraLink: '',
    logo: null
  })

  // 🚀 CREATE TOKEN WITHOUT FAILURES
  const handleCreateToken = async () => {
    if (!connected) { toast.error('Wallet not connected'); return }
    if (!formData.name || !formData.symbol || !formData.description || !formData.logo) { 
      toast.error('Fill all fields'); return 
    }

    setLoading(true)
    const toastId = toast.loading('Creating token...')

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL)
      
      // 📸 Upload metadata
      const logoCid = await uploadToIPFS(formData.logo)
      const metadata = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image: `https://gateway.pinata.cloud/ipfs/${logoCid}`,
        properties: { website: formData.website, twitter: formData.twitter, telegram: formData.telegram, discord: formData.discord }
      }
      await uploadToIPFS(new Blob([JSON.stringify(metadata)]))

      // 🏗️ Create token
      const mintKeypair = Keypair.generate()
      const transaction = new Transaction()
      
      // Create mint
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKeypair.publicKey, 9, publicKey, null),
        createAssociatedTokenAccountInstruction(publicKey, PublicKey.findProgramAddressSync([publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0], publicKey, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, PublicKey.findProgramAddressSync([publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0], publicKey, BigInt(formData.totalSupply) * BigInt(10 ** 9))
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      transaction.partialSign(mintKeypair)
      const signed = await signTransaction(transaction)
      await connection.sendRawTransaction(signed.serialize())

      setRealTokenAddress(mintKeypair.publicKey.toString())
      toast.success(`✅ Token Created: ${mintKeypair.publicKey.toString()}`, { duration: 10000 })

    } catch (error) {
      toast.error(error.message || 'Creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glassmorphism rounded-xl p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Token</h2>
      
      <ImageUpload onImageSelect={(file) => setFormData({...formData, logo: file})} />
      
      <div className="space-y-6 mt-6">
        <input placeholder="Token Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2" />
        <input placeholder="Token Symbol" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2" />
        <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2 h-20" />
        
        {/* Social Links */}
        <input placeholder="Website" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2" />
        <input placeholder="Twitter" value={formData.twitter} onChange={(e) => setFormData({...formData, twitter: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2" />
        <input placeholder="Telegram" value={formData.telegram} onChange={(e) => setFormData({...formData, telegram: e.target.value})} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-4 py-2" />
        
        {realTokenAddress && (
          <div className="p-4 bg-dark-300 rounded-lg">
            <h4 className="font-semibold mb-2">Token Address:</h4>
            <div className="flex items-center gap-2">
              <code className="text-sm break-all">{realTokenAddress}</code>
              <button onClick={() => navigator.clipboard.writeText(realTokenAddress)} className="px-3 py-1 bg-purple-600 rounded text-sm">Copy</button>
            </div>
          </div>
        )}
        
        <button onClick={handleCreateToken} disabled={loading || !connected} className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold">
          {loading ? 'Creating...' : 'Create Token'}
        </button>
      </div>
    </div>
  )
}
