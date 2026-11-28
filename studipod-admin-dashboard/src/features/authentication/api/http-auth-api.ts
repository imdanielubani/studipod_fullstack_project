import type { HttpClient } from '@/services/http/http-client';

import {
  AUTH_ENDPOINTS,
  codeResentSchema,
  resetTokenInfoSchema,
  sessionSchema,
  signInChallengeSchema,
  type AuthApi,
} from './contract';

/** AuthApi backed by the Studipod REST API. */
export function createHttpAuthApi(http: HttpClient): AuthApi {
  return {
    signIn: (input) =>
      http.request(AUTH_ENDPOINTS.signIn, {
        method: 'POST',
        body: input,
        schema: signInChallengeSchema,
      }),
    verifyCode: (input) =>
      http.request(AUTH_ENDPOINTS.verifyCode, {
        method: 'POST',
        body: input,
        schema: sessionSchema,
      }),
    resendCode: (input) =>
      http.request(AUTH_ENDPOINTS.resendCode, {
        method: 'POST',
        body: input,
        schema: codeResentSchema,
      }),
    refresh: () => http.request(AUTH_ENDPOINTS.refresh, { method: 'POST', schema: sessionSchema }),
    signOut: ({ accessToken }) =>
      http.request(AUTH_ENDPOINTS.signOut, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }),
    forgotPassword: (input) =>
      http.request(AUTH_ENDPOINTS.forgotPassword, { method: 'POST', body: input }),
    validateResetToken: (input) =>
      http.request(AUTH_ENDPOINTS.validateResetToken, {
        method: 'POST',
        body: input,
        schema: resetTokenInfoSchema,
      }),
    resetPassword: (input) =>
      http.request(AUTH_ENDPOINTS.resetPassword, { method: 'POST', body: input }),
    requestAccess: (input) =>
      http.request(AUTH_ENDPOINTS.accessRequests, { method: 'POST', body: input }),
  };
}
