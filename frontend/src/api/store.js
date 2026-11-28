import { request } from './client.js'
import { createStoreApi } from './store-server.js'

export const { getStore, updateStoreBasics } = createStoreApi(request)
