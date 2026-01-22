import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BASE_URL } from '../../constants';
import type { paths } from '../../lib/generated/types';

export class GetContactById implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Get Contact By ID',
		name: 'getContactById',
		icon: 'file:../../static/customermates.svg',
		group: ['transform'],
		version: 1,
		description: 'Retrieve a single contact from Customermates by ID',
		defaults: {
			name: 'Get Contact By ID',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'customermatesApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'ID',
				name: 'contactId',
				type: 'string',
				default: '',
				required: true,
				description: 'The unique identifier (UUID) of the contact to retrieve',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const credentials = await this.getCredentials('customermatesApi');
				const contactId = this.getNodeParameter('contactId', itemIndex, '') as string;

				type GetContactSuccessResponse =
					paths['/v1/contacts/{id}']['get']['responses']['200']['content']['application/json'];

				try {
					const response = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/api/v1/contacts/${contactId}`,
						headers: {
							'x-api-key': credentials.apiKey,
							Accept: 'application/json',
						},
						json: true,
					})) as GetContactSuccessResponse;

					if (response.contact) {
						const result: INodeExecutionData = {
							json: response.contact,
							pairedItem: { item: itemIndex },
						};

						if (response.customColumns) {
							result.json._meta = {
								customColumns: response.customColumns,
							};
						}

						returnData.push(result);
					}
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error.response?.data || error.message, { itemIndex });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}

					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
