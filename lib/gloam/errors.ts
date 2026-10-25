import { BaseError, UserRejectedRequestError } from "viem";
import { WrongNetworkError } from "../robinhood/network";

export function isUserRejection(e: unknown): boolean {
  if (e instanceof BaseError) {
    return (
      Boolean(e.walk((x) => x instanceof UserRejectedRequestError)) || /rejected|denied|cancel/i.test(e.shortMessage)
    );
  }
  return e instanceof Error && /user rejected|user denied|rejected the request/i.test(e.message);
}

/** A plain-language message for an error, without leaking request payloads. */
export function userMessage(e: unknown): string {
  if (isUserRejection(e)) return "You cancelled the request in your wallet. Nothing was sent.";
  if (e instanceof WrongNetworkError) return e.message;
  if (e instanceof BaseError) {
    if (/insufficient funds/i.test(e.message)) return "Your wallet does not have enough test ETH to pay for gas.";
    return e.shortMessage;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
