export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Email or password is incorrect. (If you recently signed up, please ensure your email is confirmed, or check that your account was registered on this Supabase project).';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Your password must be at least 6 characters.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the activation link.';
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Network error. Please check your internet connection or verify the Supabase service URL.';
  }
  if (lower.includes('token has expired') || lower.includes('otp_expired') || lower.includes('token is expired')) {
    return 'This reset or verification link has expired or has already been used. Please request a new one.';
  }
  if (lower.includes('auth session missing')) {
    return 'Your session has expired or the reset link was already used. Please request a new link.';
  }

  return message || 'Something went wrong. Please try again.';
}
