import { baseSepolia } from "viem/chains"
import { beforeAll, describe, expect, test } from "vitest"

import {
  http,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  parseAbi,
  zeroAddress
} from "viem"
import type { Client, PublicClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import {
  type UserOperation,
  walletClientToSmartAccountSigner
} from "permissionless"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import { DEFAULT_ECDSA_OWNERSHIP_MODULE } from "../../src/accounts/utils/constants.js"
import { validateUserOp } from "../../src/accounts/utils/helpers.js"
import {
  createSmartAccountClient,
  signerToSmartAccount
} from "../../src/index.js"
import { checkBalance } from "../utils.js"

describe("Biconomy Smart Account V2 EP v6 tests", () => {
  let smartAccount: Awaited<ReturnType<typeof signerToSmartAccount>>
  let walletClient: Client
  let publicClient: PublicClient
  let smartAccountClient: Awaited<ReturnType<typeof createSmartAccountClient>>

  const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e"
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)
  const bundlerUrl = process.env.BUNDLER_URL ?? ""
  // const chainId = extractChainIdFromBundlerUrl(bundlerUrl)
  // const chain = getChain(baseSepolia.id)
  const chain = baseSepolia

  beforeAll(async () => {
    publicClient = createPublicClient({
      transport: http("https://public.stackup.sh/api/v1/node/base-sepolia")
    })

    walletClient = createWalletClient({
      account,
      chain,
      transport: http("https://public.stackup.sh/api/v1/node/base-sepolia")
    })

    smartAccount = await signerToSmartAccount(publicClient, {
      signer: walletClientToSmartAccountSigner(walletClient)
    })

    smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      chain,
      bundlerTransport: http(bundlerUrl)
    })
  })

  test("Should get the init code", async () => {
    const initCode = await smartAccount.getInitCode()
    console.log("Init Code: ", initCode)
    expect(initCode).toBeDefined()
  })

  test("Should get account address + nonce", async () => {
    const address = smartAccount.address
    console.log("Smart Account Address: ", address)

    const nonce = await smartAccount.getNonce()
    console.log("Smart Account Nonce: ", nonce)
  })

  test("Should send an empty tx", async () => {
    const txHash = await smartAccountClient.sendTransaction({
      to: "0xd3C85Fdd3695Aee3f0A12B3376aCD8DC54020549",
      data: "0x1234"
    })

    console.log("Transaction Hash: ", txHash)
  }, 15000)

  test("Should mint an NFT and pay for the gas", async () => {
    const encodedCall = encodeFunctionData({
      abi: parseAbi(["function safeMint(address to) public"]),
      functionName: "safeMint",
      args: [smartAccount.address]
    })

    const txHash = await smartAccountClient.sendTransaction({
      to: nftAddress,
      data: encodedCall
    })

    console.log("Transaction Hash for NFT Mint: ", txHash)
  }, 50000)

  test("Should build a user operation manually and validate it", async () => {
    const mintNftData = encodeFunctionData({
      abi: parseAbi(["function safeMint(address to) public"]),
      functionName: "safeMint",
      args: [smartAccount.address]
    })

    const userOp = await smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        callData: await smartAccountClient.account.encodeCallData({
          to: zeroAddress,
          value: 0n,
          data: mintNftData
        })
      }
    })

    const isValid = validateUserOp(userOp)

    expect(isValid).toBe(true)
  }, 15000)

  test("Should send a batch of user ops", async () => {
    const encodedCall1 = encodeFunctionData({
      abi: parseAbi(["function safeMint(address to) public"]),
      functionName: "safeMint",
      args: [smartAccount.address]
    })

    const encodedCall2 = encodeFunctionData({
      abi: parseAbi(["function safeMint(address to) public"]),
      functionName: "safeMint",
      args: ["0xfCF6Eb210E5Fd84D679b14fe170f9aB05C9B21e7"]
    })

    const balanceBefore1 = await checkBalance(
      publicClient,
      smartAccount.address,
      nftAddress
    )
    const balanceBefore2 = await checkBalance(
      publicClient,
      "0xfCF6Eb210E5Fd84D679b14fe170f9aB05C9B21e7",
      nftAddress
    )

    const txHash = await smartAccountClient.sendTransactions({
      transactions: [
        {
          to: nftAddress,
          data: encodedCall1,
          value: 0n
        },
        {
          to: nftAddress,
          data: encodedCall2,
          value: 0n
        }
      ]
    })

    const balanceAfter1 = await checkBalance(
      publicClient,
      smartAccount.address,
      nftAddress
    )
    const balanceAfter2 = await checkBalance(
      publicClient,
      "0xfCF6Eb210E5Fd84D679b14fe170f9aB05C9B21e7",
      nftAddress
    )

    expect(balanceAfter1).toBeGreaterThan(balanceBefore1)
    expect(balanceAfter2).toBeGreaterThan(balanceBefore2)
  }, 50000)

  test("Should sign a user operation", async () => {
    const userOp: UserOperation<"v0.6"> = {
      sender: "0x99F3Bc8058503960364Ef3fDBF6407C9b0BbefCc",
      nonce: BigInt(0),
      initCode:
        "0x000000a56Aaca3e9a4C479ea6b6CD0DbcB6634F5df20ffbc0000000000000000000000000000001c5b32f37f5bea87bdd5374eb2ac54ea8e0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000242ede3bc0000000000000000000000000d3c85fdd3695aee3f0a12b3376acd8dc5402054900000000000000000000000000000000000000000000000000000000",
      callData:
        "0x0000189a000000000000000000000000463cd2b5e4f059265b9520ef878bda456d8a350600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000006442842e0e00000000000000000000000099f3bc8058503960364ef3fdbf6407c9b0bbefcc000000000000000000000000c7f0ea744e33fe599fb4d25ecb7440ccbc3cf9b2000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000",
      signature:
        "0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000001c5b32F37F5beA87BDD5374eB2aC54eA8e000000000000000000000000000000000000000000000000000000000000004181d4b4981670cb18f99f0b4a66446df1bf5b204d24cfcb659bf38ba27a4359b5711649ec2423c5e1247245eba2964679b6a1dbb85c992ae40b9b00c6935b02ff1b00000000000000000000000000000000000000000000000000000000000000",
      paymasterAndData: "0x",
      callGasLimit: 0n,
      verificationGasLimit: 0n,
      preVerificationGas: 0n,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n
    }

    const sig = await smartAccount.signUserOperation(userOp)
    expect(sig).toBeDefined()
  })

  test("Client signMessage", async () => {
    const response = await smartAccount.signMessage({
      message: "hello world"
    })

    expect(response).toBeTypeOf("string")
    expect(response).toHaveLength(386)
  })

  test("smart account should have ECDSA as default & active validation module", async () => {
    const defaultValidationModule = smartAccount.defaultValidationModule
    const activeValidationModule = smartAccount.activeValidationModule
    expect(defaultValidationModule.getModuleAddress()).toBe(
      DEFAULT_ECDSA_OWNERSHIP_MODULE
    )
    expect(activeValidationModule.getModuleAddress()).toBe(
      DEFAULT_ECDSA_OWNERSHIP_MODULE
    )
  })

  test("should check active module", async () => {
    const activeValidationModule = smartAccount.activeValidationModule
    const signer = await activeValidationModule.getSigner()
    expect(signer.address).toEqual(walletClient.account?.address)
  })

  test("Smart account client signTypedData", async () => {
    const response = await smartAccount.signTypedData({
      domain: {
        chainId: 1,
        name: "Test",
        verifyingContract: zeroAddress
      },
      primaryType: "Test",
      types: {
        Test: [
          {
            name: "test",
            type: "string"
          }
        ]
      },
      message: {
        test: "hello world"
      }
    })

    expect(response).toBeTypeOf("string")
    expect(response).toHaveLength(386)
  })

  test("should throw with custom error SignTransactionNotSupportedBySmartAccount", async () => {
    const response = smartAccount.signTransaction({
      to: zeroAddress,
      value: 0n,
      data: "0x"
    })
    expect(response).rejects.toThrow(SignTransactionNotSupportedBySmartAccount)
  })

  test("Should build a user operation manually and send it", async () => {
    const mintNftData = encodeFunctionData({
      abi: parseAbi(["function safeMint(address to) public"]),
      functionName: "safeMint",
      args: [smartAccount.address]
    })

    const userOp = await smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        callData: await smartAccountClient.account.encodeCallData({
          to: zeroAddress,
          value: 0n,
          data: mintNftData
        })
      }
    })

    const isValid = validateUserOp(userOp)

    expect(isValid).toBe(true)

    const txHash = await smartAccountClient.sendUserOperation({
      userOperation: userOp
    })

    console.log("Transaction Hash for NFT Mint: ", txHash)
  }, 50000)
})