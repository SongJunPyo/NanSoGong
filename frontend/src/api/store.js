import { request } from './client.js'

export const updateStoreBasics = (storeId, input) => request(`/stores/${storeId}`, { method: 'PUT', body: JSON.stringify(input) })
