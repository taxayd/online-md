exports.main = async (event, context) => {
  // local console log
  // const filelog = (...args) => {
  //     const fs = require('fs')
  //     fs.writeFileSync('./local.log', '\n' + JSON.stringify(args), {flag: 'a'})
  // }
  // global.console.log = filelog

  // deploy console log
  // global.console.log = () => {}

  let path = ''
  if ('headers' in event) {
    path = event.headers.api
  } else {
    path = event.api
  }
  const file_func = path.split('/')
  const file = file_func[0]
  const func = file_func[1]
  console.log(`calling ${file}/${func}`)
  const ret = await require(`./api/${file}`)[func](event)
  console.log(`${file}/${func} return: `, ret)
  return ret
};
