import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { apiRequest } from '../helpers/api';

type Loader = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

function searchLoader(path: string, toName: (item: IDataObject) => string): Loader {
	return async function (this: ILoadOptionsFunctions) {
		try {
			const response = await apiRequest(this, 'POST', `/${path}/search`, {
				pagination: { page: 1, pageSize: 100 },
			});
			return ((response.items as IDataObject[]) ?? []).map((item) => ({
				name: toName(item) || (item.id as string),
				value: item.id as string,
			}));
		} catch {
			return [];
		}
	};
}

function customColumnLoader(path: string): Loader {
	return async function (this: ILoadOptionsFunctions) {
		try {
			const response = await apiRequest(this, 'GET', `/${path}/configuration`);
			return ((response.customColumns as IDataObject[]) ?? []).map((column) => ({
				name: (column.label as string) || (column.id as string),
				value: column.id as string,
			}));
		} catch {
			return [];
		}
	};
}

async function loadConnectedAccountOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const accounts = await apiRequest<IDataObject[]>(this, 'GET', '/messaging/connected-accounts');
		return accounts.map((account) => ({
			name: `${account.displayName ?? account.emailAddress ?? account.id} (${account.provider})`,
			value: account.id as string,
		}));
	} catch {
		return [];
	}
}

const fullName = (item: IDataObject) => `${item.firstName} ${item.lastName}`.trim();
const plainName = (item: IDataObject) => item.name as string;

export const loadOptions: Record<string, Loader> = {
	loadConnectedAccountOptions,
	loadContactOptions: searchLoader('contacts', fullName),
	loadDealOptions: searchLoader('deals', plainName),
	loadOrganizationOptions: searchLoader('organizations', plainName),
	loadServiceOptions: searchLoader('services', plainName),
	loadTaskOptions: searchLoader('tasks', plainName),
	loadUserOptions: searchLoader('users', (user) => fullName(user) || (user.email as string)),
	loadContactCustomColumnOptions: customColumnLoader('contacts'),
	loadDealCustomColumnOptions: customColumnLoader('deals'),
	loadOrganizationCustomColumnOptions: customColumnLoader('organizations'),
	loadServiceCustomColumnOptions: customColumnLoader('services'),
	loadTaskCustomColumnOptions: customColumnLoader('tasks'),
};
