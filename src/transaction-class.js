import { decodeBase58 } from "./base58.js";
import { PROGRAMS, TRANSACTION_CLASSES } from "./constants.js";

function instructions(transaction) {
  return transaction.rpcJson?.message?.instructions || [];
}

function instructionProgramId(transaction, instruction) {
  const keys = transaction.rpcJson?.message?.accountKeys || [];
  return instruction.programId || keys[instruction.programIdIndex];
}

function isSystemTransfer(transaction, instruction) {
  if (instructionProgramId(transaction, instruction) !== PROGRAMS.SYSTEM) return false;
  const data = decodeBase58(instruction.data || "");
  return data.length >= 4 && data.readUInt32LE(0) === 2;
}

function classicSplDetails(transaction, metadata) {
  if (metadata.err != null || metadata.addressTableLookups?.length || metadata.innerInstructions?.length) return null;
  const allowed = new Set([PROGRAMS.TOKEN, PROGRAMS.COMPUTE_BUDGET]);
  if (!metadata.programIds.every((programId) => allowed.has(programId))) return null;
  const tokenInstructions = instructions(transaction)
    .map((instruction) => ({ instruction, programId: instructionProgramId(transaction, instruction) }))
    .filter(({ programId }) => programId === PROGRAMS.TOKEN);
  if (tokenInstructions.length !== 1) return null;
  const instruction = tokenInstructions[0].instruction;
  const data = decodeBase58(instruction.data || "");
  const kind = data[0];
  const accounts = instruction.accounts || [];
  if (kind !== 3 && kind !== 12) return null;
  if ((kind === 3 && accounts.length !== 3) || (kind === 12 && accounts.length !== 4)) return null;
  const sourceIndex = accounts[0];
  const destinationIndex = kind === 12 ? accounts[2] : accounts[1];
  const authorityIndex = kind === 12 ? accounts[3] : accounts[2];
  const mintIndex = kind === 12 ? accounts[1] : null;
  const source = metadata.preTokenBalances.find((balance) => balance.accountIndex === sourceIndex);
  const destination = metadata.preTokenBalances.find((balance) => balance.accountIndex === destinationIndex);
  const sourcePost = metadata.postTokenBalances.find((balance) => balance.accountIndex === sourceIndex);
  const destinationPost = metadata.postTokenBalances.find((balance) => balance.accountIndex === destinationIndex);
  if (!source || !destination || !sourcePost || !destinationPost || !source.owner || !destination.owner || source.mint !== destination.mint) return null;
  if (source.mint === PROGRAMS.WRAPPED_SOL_MINT) return null;
  const authority = metadata.accountRoles.find((role) => role.index === authorityIndex);
  if (!authority?.signer || source.owner !== authority.pubkey) return null;
  if (kind === 12) {
    const mint = metadata.accountRoles.find((role) => role.index === mintIndex);
    if (mint?.pubkey !== source.mint || data.length !== 10 || data[9] !== source.uiTokenAmount.decimals) return null;
  } else if (data.length !== 9) return null;
  return { kind: kind === 12 ? "TRANSFER_CHECKED" : "TRANSFER", sourceIndex, destinationIndex, authorityIndex, mintIndex, mint: source.mint };
}

export function classifyTransaction(transaction, metadata) {
  const systemAllowed = new Set([PROGRAMS.SYSTEM, PROGRAMS.COMPUTE_BUDGET]);
  const systemOnly = metadata.programIds.length > 0 && metadata.programIds.every((programId) => systemAllowed.has(programId));
  const hasSystemTransfer = instructions(transaction).some((instruction) => isSystemTransfer(transaction, instruction));
  if (systemOnly && hasSystemTransfer) {
    return {
      transactionClass: metadata.err == null
        ? TRANSACTION_CLASSES.SYSTEM_TRANSFER
        : TRANSACTION_CLASSES.SUPPORTED_DETERMINISTIC_FAILURE,
      details: { systemTransfer: true },
    };
  }
  const spl = classicSplDetails(transaction, metadata);
  if (spl) return { transactionClass: TRANSACTION_CLASSES.CLASSIC_SPL_TRANSFER, details: spl };
  return { transactionClass: TRANSACTION_CLASSES.UNSUPPORTED, details: {} };
}

export const transactionClassInternals = { instructions, instructionProgramId, isSystemTransfer, classicSplDetails };
