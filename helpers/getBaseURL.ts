import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { BASE_URL } from '../constants';

/**
 * Resolve the Customermates instance base URL from credentials, with normalization.
 * - Falls back to the cloud BASE_URL when no override is set or the value is empty.
 * - Strips trailing slashes so callers can safely concatenate `/api/v1/...`.
 */
export function getBaseURL(credentials: ICredentialDataDecryptedObject): string {
	const raw = (credentials.baseURL as string) || '';
	return (raw || BASE_URL).replace(/\/+$/, '');
}
