/** Stable error codes returned by the waitlist API. Never leak internal details. */
export type WaitlistErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "BOT_VERIFICATION_FAILED"
  | "ALREADY_REGISTERED"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "SERVER_ERROR";

export type FieldErrors = Partial<Record<"fullName" | "email" | "examinationCategory", string>>;

export interface WaitlistSuccessResponse {
  success: true;
  data: { message: string };
  error: null;
}

export interface WaitlistErrorResponse {
  success: false;
  data: null;
  error: {
    code: WaitlistErrorCode;
    message: string;
    fieldErrors?: FieldErrors;
  };
}

export type WaitlistResponse = WaitlistSuccessResponse | WaitlistErrorResponse;
