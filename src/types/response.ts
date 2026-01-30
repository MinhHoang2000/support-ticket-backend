export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  /** Internal error code (e.g. VALIDATION_ERROR). Never includes stack or internal details. */
  errorCode?: string | null;
  timestamp?: string;
}
