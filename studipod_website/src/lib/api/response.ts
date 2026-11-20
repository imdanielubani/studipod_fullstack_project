import "server-only";
import { NextResponse } from "next/server";
import type {
  FieldErrors,
  WaitlistErrorCode,
  WaitlistErrorResponse,
  WaitlistSuccessResponse,
} from "@/types/waitlist";

/** API responses relate to personal data; never let them be cached. */
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export function successResponse(
  message: string,
  status = 201,
): NextResponse<WaitlistSuccessResponse> {
  return NextResponse.json(
    { success: true, data: { message }, error: null },
    { status, headers: NO_STORE_HEADERS },
  );
}

interface ErrorOptions {
  fieldErrors?: FieldErrors;
  headers?: Record<string, string>;
}

export function errorResponse(
  code: WaitlistErrorCode,
  message: string,
  status: number,
  { fieldErrors, headers }: ErrorOptions = {},
): NextResponse<WaitlistErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: fieldErrors ? { code, message, fieldErrors } : { code, message },
    },
    { status, headers: { ...NO_STORE_HEADERS, ...headers } },
  );
}
