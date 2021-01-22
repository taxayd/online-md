exports.main = async (event, context) => {
  if ('queryStringParameters' in event) {
    event = {
      ...event,
      ...event.queryStringParameters,
    }
  }
  const { auth } = event
  const envPwd = require("crypto-js/sha256")(process.env.PASSWORD)
  if (auth !== envPwd) {
    console.log('login failed, event', event, 'envPwd', envPwd)
    return {
      code: 1,
      msg: '密码错误',
    }
  }
  const { api } = event
  const file_func = api.split('/')
  const file = file_func[0]
  const func = file_func[1]
  console.log(`calling ${file}/${func}`)
  const ret = await require(`./api/${file}`)[func](event)
  console.log(`${file}/${func} return: `, ret)
  return ret
};
