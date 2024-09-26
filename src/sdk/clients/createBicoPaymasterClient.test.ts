import {
  http,
  type Address,
  type Chain,
  type PrivateKeyAccount,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient
} from "viem"
import {
  type PaymasterClient,
  entryPoint07Address
} from "viem/account-abstraction"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { paymasterTruthy, toNetwork } from "../../test/testSetup"
import { killNetwork } from "../../test/testUtils"
import type { NetworkConfig } from "../../test/testUtils"
import { type NexusAccount, toNexusAccount } from "../account/toNexusAccount"
import { safeMultiplier } from "../account/utils"
import {
  type BicoBundlerClient,
  createBicoBundlerClient
} from "./createBicoBundlerClient"
import {
  biconomyPaymasterContext,
  createBicoPaymasterClient
} from "./createBicoPaymasterClient"
import { type NexusClient, createNexusClient } from "./createNexusClient"

// Remove the following lines to use the default factory and validator addresses
// These are relevant only for now on base sopelia chain and are likely to change
const k1ValidatorAddress = "0x663E709f60477f07885230E213b8149a7027239B"
const factoryAddress = "0x887Ca6FaFD62737D0E79A2b8Da41f0B15A864778"

describe.runIf(paymasterTruthy).skip("bico.paymaster", async () => {
  let network: NetworkConfig
  // Nexus Config
  let chain: Chain
  let bundlerUrl: string
  let paymasterUrl: undefined | string
  let walletClient: WalletClient

  // Test utils
  let publicClient: PublicClient // testClient not available on public testnets
  let account: PrivateKeyAccount
  let recipientAddress: Address
  let bicoBundler: BicoBundlerClient
  let nexusAccountAddress: Address
  let paymaster: PaymasterClient
  let nexusAccount: NexusAccount
  let nexusClient: NexusClient

  beforeAll(async () => {
    network = await toNetwork("PUBLIC_TESTNET")

    chain = network.chain
    bundlerUrl = network.bundlerUrl
    paymasterUrl = network.paymasterUrl
    account = network.account as PrivateKeyAccount

    recipientAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" // vitalik.eth

    walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    })

    publicClient = createPublicClient({
      chain,
      transport: http()
    })

    paymaster = createBicoPaymasterClient({
      transport: http(paymasterUrl)
    })

    nexusAccount = await toNexusAccount({
      signer: account,
      chain,
      transport: http(),
      k1ValidatorAddress,
      factoryAddress
    })

    bicoBundler = createBicoBundlerClient({
      bundlerUrl,
      chain,
      account: nexusAccount
    })
    nexusAccountAddress = await nexusAccount.getCounterFactualAddress()

    nexusClient = await createNexusClient({
      signer: account,
      chain,
      transport: http(),
      bundlerTransport: http(bundlerUrl),
      k1ValidatorAddress,
      factoryAddress,
      paymaster,
      // For "PUBLIC_TESTNET" network, the userOperation we can hardcode estimates
      userOperation: {
        estimateFeesPerGas: async (_) => {
          const feeData = await publicClient.estimateFeesPerGas()
          return {
            maxFeePerGas: safeMultiplier(feeData.maxFeePerGas, 1.25),
            maxPriorityFeePerGas: safeMultiplier(
              feeData.maxPriorityFeePerGas,
              1.25
            )
          }
        }
      }
    })
  })
  afterAll(async () => {
    await killNetwork([network?.rpcPort, network?.bundlerPort])
  })

  test("should provide paymasterStubData", async () => {
    const paymasterStubData = await paymaster.getPaymasterStubData({
      chainId: chain.id,
      entryPointAddress: entryPoint07Address,
      callData: "0x",
      nonce: 0n,
      sender: nexusAccountAddress,
      context: biconomyPaymasterContext
    })

    expect(paymasterStubData).toHaveProperty("paymaster")
    expect(paymasterStubData).toHaveProperty("paymasterData")
    expect(paymasterStubData).toHaveProperty("paymasterVerificationGasLimit")
    expect(paymasterStubData).toHaveProperty("paymasterPostOpGasLimit")
  })
})