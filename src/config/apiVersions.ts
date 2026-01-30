/**
 * API Version Configuration
 * 
 * This file manages the available API versions and their settings.
 * To add a new version:
 * 1. Add the version to the API_VERSIONS array
 * 2. Create a new route file in src/routes/{version}/index.ts
 * 3. Import and mount it in src/routes/index.ts
 */

export const API_VERSIONS = ['v1', 'v2'] as const;

export type ApiVersion = typeof API_VERSIONS[number];

export const DEFAULT_API_VERSION: ApiVersion = 'v1';

export const API_VERSION_PREFIX = '/api';

/**
 * Get the full path for an API version
 * @param version - The API version (e.g., 'v1', 'v2')
 * @returns The full path (e.g., '/api/v1')
 */
export const getApiVersionPath = (version: ApiVersion): string => {
  return `${API_VERSION_PREFIX}/${version}`;
};

/**
 * Check if a version is valid
 * @param version - The version to check
 * @returns True if the version is valid
 */
export const isValidApiVersion = (version: string): version is ApiVersion => {
  return API_VERSIONS.includes(version as ApiVersion);
};
