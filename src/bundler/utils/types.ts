import type { Address, Hash, Hex } from "viem"
import type { PartialBy } from "viem/chains"
import type { UserOperationStruct } from "../../accounts"
import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "../../accounts/utils/types"

export type BundlerRpcSchema = [
  {
    Method: "eth_sendUserOperation"
    Parameters: [
      userOperation: UserOperationStruct,
      entryPointAddress: ENTRYPOINT_ADDRESS_V06_TYPE
    ]
    ReturnType: Hash
  },
  {
    Method: "eth_estimateUserOperationGas"
    Parameters: [
      userOperation: PartialBy<
        UserOperationStruct,
        "callGasLimit" | "preVerificationGas" | "verificationGasLimit"
      >,
      entryPointAddress: ENTRYPOINT_ADDRESS_V06_TYPE,
      stateOverrides?: StateOverrides
    ]
    ReturnType: {
      preVerificationGas: string
      verificationGasLimit: string
      callGasLimit?: string
      maxPriorityFeePerGas: string
      maxFeePerGas: string
    }
  },
  {
    Method: "eth_supportedEntryPoints"
    Parameters: []
    ReturnType: Address[]
  },
  {
    Method: "eth_chainId"
    Parameters: []
    ReturnType: Hex
  },
  {
    Method: "eth_getUserOperationByHash"
    Parameters: [hash: Hash]
    ReturnType: UserOperationStruct & {
      entryPoint: ENTRYPOINT_ADDRESS_V06_TYPE
      transactionHash: Hash
      blockHash: Hash
      blockNumber: Hex
    }
  },
  {
    Method: "eth_getUserOperationReceipt"
    Parameters: [hash: Hash]
    ReturnType: UserOpReceipt
  },
  {
    Method: "biconomy_getGasFeeValues"
    Parameters: []
    ReturnType: GasFeeValues
  },
  {
    Method: "biconomy_getUserOperationStatus"
    Parameters: [userOpHash: Hash]
    ReturnType: UserOpStatus
  }
]

export type StateOverrides = {
  [x: string]: {
    balance?: bigint | undefined
    nonce?: bigint | number | undefined
    code?: Hex | undefined
    state?: {
      [x: Hex]: Hex
    }
    stateDiff?: {
      [x: Hex]: Hex
    }
  }
}

export type EstimateUserOperationGasParameters = {
  userOperation: UserOperationStruct
}

export type TStatus = "success" | "reverted"

export type UserOpReceipt = {
  /* The request hash of the UserOperation. */
  userOpHash: string
  /* The entry point address used for the UserOperation. */
  entryPoint: string
  /* The paymaster used for this UserOperation (or empty). */
  paymaster: string
  /* The actual amount paid (by account or paymaster) for this UserOperation. */
  actualGasCost: Hex
  /* The total gas used by this UserOperation (including preVerification, creation, validation, and execution). */
  actualGasUsed: Hex
  /* Indicates whether the execution completed without reverting. */
  success: "true" | "false"
  /* In case of revert, this is the revert reason. */
  reason: string
  /* The logs generated by this UserOperation (not including logs of other UserOperations in the same bundle). */
  // biome-ignore lint/suspicious/noExplicitAny: difficult to type
  logs: Array<any> // The logs generated by this UserOperation (not including logs of other UserOperations in the same bundle)
  /* The TransactionReceipt object for the entire bundle, not only for this UserOperation. */
  // biome-ignore lint/suspicious/noExplicitAny: difficult to type
  receipt: any
}

export type GetGasFeeValuesReturnType = GasFeeValues

export type GasFeeValues = {
  maxPriorityFeePerGas: string
  maxFeePerGas: string
}

export type JsonRpcError = {
  code: string
  message: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  data: any
}

export type SendUserOpResponse = {
  /** The JSON-RPC url */
  jsonrpc: string
  /** Request id */
  id: number
  result: string
  /** The error if the request failed */
  error?: JsonRpcError
}

export type UserOpStatus = {
  state: string // for now // could be an enum
  transactionHash?: string
  userOperationReceipt?: UserOpReceipt
}
