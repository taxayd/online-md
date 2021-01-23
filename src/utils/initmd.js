
let md = null
const getInitMD = async function() {
  if (!md) {
    md = await require('axios').get('/init.md')
      .then(res => {
        console.log('fetch init md', res)
        return res.data
      })
  }
  return md
}
export default getInitMD