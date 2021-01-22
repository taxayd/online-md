// import axios from 'axios'

// const BASE_URL = 'http://172.21.35.2:8090'

// const API = {
//   login: '/user/login',
//   file: {
//     list: '/file/list',
//     detail: '/file/detail',
//     update: '/file/update',
//     destory: '/file/destory'
//   },
// }

// const http = axios.create({
//   baseURL: BASE_URL
// });

// http.interceptors.request.use(async (request) => {
//   let { params = {} } = request
//   if (window.localStorage.getItem('auth') && !('auth' in params)) {
//     params['auth'] = window.localStorage.getItem('auth');
//   }
//   request.params = params
//   request.params['api'] = request.url.replace('/', '')//replace first
//   request.url = '/backend'
//   return request;
// }, error => {
//   return Promise.reject(error);
// });

// http.interceptors.response.use(response => {
//   // if (response.data.status !== 1) {
//   //   return Promise.reject(response.data);
//   // }
//   return Promise.resolve(response.data);
// }, error => {
//   return Promise.reject(error);
// });

// export { API, http }

/** call backend through sdk */
const API = {
  login: '/user/login',
  file: {
    list: '/file/list',
    detail: '/file/detail',
    update: '/file/update',
    destory: '/file/destory'
  },
}
let envID = ''
let app = null
const http = {
  async get(api, options = {}) {
    if (app === null) {
      envID = await require('axios').get('/cloudbaseenv.json')
        .then(res => {
          return res.ENV_ID
        })
        .catch(err => {
          console.error('get env err: ', err)
          return Promise.reject('获取环境ID失败')
        })
      app = require('@cloudbase/js-sdk').init({env: envID})
    }
    let { params = {} } = options
    params.api = api.replace('/', '')
    if (window.localStorage.getItem('auth') && !('auth' in params)) {
      params.auth = window.localStorage.getItem('auth')
    }
    return app.callFunction({
      name: 'backend',
      data: params
    })
  },

  async post(api, options = {}) {
    const { data = {} } = options
    options = {
      ...options,
      params: data
    }
    return this.get(api, options)
  },
}

export { API, http }