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

type GetContactSuccessResponse =
	paths['/v1/contacts/{id}']['get']['responses']['200']['content']['application/json'];

export async function getContact(
	this: IExecuteFunctions,
	itemIndex: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const contactId = this.getNodeParameter('contactId', itemIndex) as string;

	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${BASE_URL}/api/v1/contacts/${contactId}`,
		headers: {
			'x-api-key': credentials.apiKey as string,
			Accept: 'application/json',
		},
		json: true,
	})) as GetContactSuccessResponse;

	if (!response.contact) {
		throw new NodeOperationError(this.getNode(), `Contact with ID "${contactId}" not found`, {
			itemIndex,
		});
	}

	const contact = response.contact as IDataObject;
	const result: INodeExecutionData = {
		json: contact,
		pairedItem: { item: itemIndex },
	};

	if (response.customColumns) {
		result.json._meta = {
			customColumns: response.customColumns,
		};
	}

	return result;
}

export const getContactProperties: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: '',
		required: true,
		description: 'The unique identifier (UUID) of the contact to retrieve',
	},
];
