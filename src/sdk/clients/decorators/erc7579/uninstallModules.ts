import {
  type Chain,
  type Client,
  type Hex,
  type Transport,
  encodeFunctionData,
  getAddress
} from "viem"
import {
  type GetSmartAccountParameter,
  type SmartAccount,
  sendUserOperation
} from "viem/account-abstraction"
import { getAction } from "viem/utils"
import { parseAccount } from "viem/utils"
import type { Module } from "."
import { AccountNotFoundError } from "../../../account/utils/AccountNotFound"
import { parseModuleTypeId } from "./supportsModule"

export type UninstallModulesParameters<
  TSmartAccount extends SmartAccount | undefined
> = GetSmartAccountParameter<TSmartAccount> & {
  modules: Module[]
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: bigint
}

/**
 * Uninstalls multiple modules from a smart account.
 *
 * @param client - The client instance.
 * @param parameters - Parameters including the smart account, modules to uninstall, and optional gas settings.
 * @returns The hash of the user operation as a hexadecimal string.
 * @throws {AccountNotFoundError} If the account is not found.
 *
 * @example
 * import { uninstallModules } from '@biconomy/sdk'
 *
 * const userOpHash = await uninstallModules(nexusClient, {
 *   modules: [
 *     { type: 'executor', address: '0x...', context: '0x' },
 *     { type: 'validator', address: '0x...', context: '0x' }
 *   ]
 * })
 * console.log(userOpHash) // '0x...'
 */
export async function uninstallModules<
  TSmartAccount extends SmartAccount | undefined
>(
  client: Client<Transport, Chain | undefined, TSmartAccount>,
  parameters: UninstallModulesParameters<TSmartAccount>
): Promise<Hex> {
  const {
    account: account_ = client.account,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    modules
  } = parameters

  if (!account_) {
    throw new AccountNotFoundError({
      docsPath: "/docs/actions/wallet/sendTransaction"
    })
  }

  const account = parseAccount(account_) as SmartAccount

  return getAction(
    client,
    sendUserOperation,
    "sendUserOperation"
  )({
    calls: modules.map(({ type, address, data }) => ({
      to: account.address,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: [
          {
            name: "uninstallModule",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              {
                type: "uint256",
                name: "moduleTypeId"
              },
              {
                type: "address",
                name: "module"
              },
              {
                type: "bytes",
                name: "deInitData"
              }
            ],
            outputs: []
          }
        ],
        functionName: "uninstallModule",
        args: [parseModuleTypeId(type), getAddress(address), data ?? "0x"]
      })
    })),
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    account
  })
}