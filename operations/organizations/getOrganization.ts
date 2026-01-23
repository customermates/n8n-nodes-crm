import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

type GetOrganizationSuccessResponse =
	paths['/v1/organizations/{id}']['get']['responses']['200']['content']['application/json'];

export async function getOrganization(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const organizationId = this.getNodeParameter('organizationId', itemIndex) as string;

	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${BASE_URL}/api/v1/organizations/${organizationId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as GetOrganizationSuccessResponse;

	if (!response.organization) {
		throw new NodeOperationError(
			this.getNode(),
			`Organization with ID "${organizationId}" not found`,
			{ itemIndex },
		);
	}

	const organization = response.organization as IDataObject;
	const result: INodeExecutionData = {
		json: organization,
		pairedItem: { item: itemIndex },
	};

	if (response.customColumns) {
		result.json._meta = {
			customColumns: response.customColumns,
		};
	}

	return result;
}

export const getOrganizationProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'organizationId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['organization'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the organization to retrieve',
	},
];
