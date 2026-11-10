import "server-only";

import { headers } from "next/headers";
import { clientIpFromHeaders } from "./rate-limit";

export function getRequestClientIp(): string {
  return clientIpFromHeaders(headers());
}
