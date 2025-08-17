import axios from 'axios';

export function setAcceptLanguageHeader(value: string): void {
  axios.defaults.headers.common['Accept-Language'] = value;
}

export function setTokenHeader(token: string) {
  console.log('setTokenHeader: Setting Authorization header with token:', token.substring(0, 20) + '...');
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
  console.log('setTokenHeader: Authorization header set to:', axios.defaults.headers.common['Authorization']?.substring(0, 20) + '...');
}
