import axios from 'axios'

export async function obterToken() {
  const clientId = 'SEU_CLIENT_ID'
  const clientSecret = 'SEU_CLIENT_SECRET'

  const response = await axios.post(
    'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
    null,
    {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      params: {
        grant_type: 'client_credentials',
      },
    },
  )

  return response.data.access_token
}

export async function obterPedidos() {
  const token = await obterToken()

  const response = await axios.get(
    'https://merchant-api.ifood.com.br/orders/v1.0/orders',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  return response.data
}
