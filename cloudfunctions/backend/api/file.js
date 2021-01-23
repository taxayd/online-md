const cloud = require("@cloudbase/node-sdk")
const app = cloud.init({})
const db = app.database()
const COS_PATH = 'mdarticle'

exports.list = async function (event) {
  console.log('get file list query start')
  const data = await db.collection('file')
    .orderBy('updated_at', 'desc')
    .limit(100)//后期可以做个搜索文件的接口
    .get()
  console.log('get file list query end')
  return {
    code: 0,
    msg: 'success',
    data: data.data,
  }
}

exports.detail = async function(event) {
  const { _id = '' } = event
  let data = null
  if (!_id) {
    // 未指定的情况下，取最近编辑的那个
    data = await db.collection('file')
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get()
      .then(res => {
        return res.data
      })
    console.log('without _id got data: ', data)
  } else {
    data = await db.collection('file')
      .where({
        _id: _id,
      })
      .limit(1)
      .get()
      .then(res => {
        return res.data
      })
    console.log('with _id got data: ', data)
  }
  if (data.length === 0) {
    return {
      code: 0,
      data: null
    }
  }
  data = data[0]
  console.log('file download start', data)
  const content = await app.downloadFile({
    fileID: data.fileID
  })
  .then(res => {
    return res.fileContent.toString()
  })
  console.log('file download end')
  return {
    code: 0,
    data: {
      ...data,
      content,
    }
  }
}

exports.update = async function(event) {
  let { _id, title, content } = event
  if (!title || !content) {
    if (_id) {
      return {
        code: 0,
        msg: '无效内容',
        data: {
          _id: _id
        }
      }
    }
    return {
      code: 1,
      msg: '无效内容'
    }
  }
  const fs = require('fs')
  const tmpFile = '/tmp/' + Date.now() + '.md'
  fs.writeFileSync(tmpFile, content)
  const stream = fs.createReadStream(tmpFile)
  const randomNumber = Math.random()
  const encodedTitle = encodeURI(title)
  console.log('file upload start')
  const fileID = await app.uploadFile({
    cloudPath: `${COS_PATH}/${encodedTitle}_${randomNumber}.md`,
    fileContent: stream,
  })
  .then(res => {
    return res.fileID
  })
  console.log('file upload end.')
  if (_id) {
    const oldFileID = await db.collection('file')
    .where({_id})
    .get()
    .then(res => {
      return res.data[0].fileID
    })
    await db.collection('file')
      .where({ _id })
      .update({
        fileID,
        title,
        updated_at: Date.now(),
      })
      .then(res => {
        if (res.updated === 0) {
          return Promise.reject('未找到对应文件')
        }
        return app.deleteFile({
          fileList: [oldFileID],
        })
      })
  } else {
    _id = await db.collection('file')
      .add({
        fileID,
        title,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
      .then(res => {
        return res.id
      })
  }
  console.log('update database end.')
  return {
    code: 0,
    msg: 'success',
    data: {
      _id: _id,
    },
  }
}

exports.destory = async function(event) {
  const { _id } = event
  if (!_id) {
    return {
      code: 1,
      msg: 'no _id'
    }
  }
  await db.collection('file')
  .where({
    _id
  })
  .remove()
  return {
    code: 0,
    msg: 'success'
  }
}