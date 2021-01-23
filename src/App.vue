<template>
  <v-app>
    <v-main>
      <v-dialog persistent v-if="dialog" v-model="dialog" max-width="300">
        <v-card>
          <v-card-title>输入访问密码</v-card-title>
          <v-card-text>
            <v-text-field v-model="password" :autofocus="true" type="password" v-on:keyup.enter="onLogin"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn :loading="dialog && btn_loading" v-on:click="onLogin"
              color="primary darken-1" dark>登录</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-if="dialogSelect" v-model="dialogSelect" max-width="300">
        <v-list color="white">
          <v-list-item color="white" v-for="(file, index) in fileList" :key="file._id">
            <v-list-item-title>
              <v-row>
                <v-col cols="9" class="flex-grow-1 text-truncate" v-on:click="onSelectFile(file)">
                  {{file.title}}
                </v-col>
              <v-col cols="2" v-on:click="onDeleteFile(file, index)">
                <v-btn :loading="file.deleting" icon>
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
              </v-row>
            </v-list-item-title>
          </v-list-item>
          <v-list-item key="addnew" v-on:click="onSelectFile('addnew')">
            <v-list-item-title>
              新建文件
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-dialog>
      <v-btn icon dense v-if="!loadingDetail"
        style="position: fixed; z-index: 100; left: 50%; margin-left: -50px; top: -5px;">
        <v-icon :color="syncStatus" small>mdi-sync</v-icon>
      </v-btn>
      <v-row no-gutters style="height: 100%;">
        <v-col cols="6" id="editor-col" class="flex-grow-1" style="height: 100%;">
          <v-skeleton-loader v-if="loadingDetail" type="article@4">
          </v-skeleton-loader>
          <MonacoEditor
            v-else
            height="100%"
            id="editor-real"
            ref="editor"
            class="mr-2 mt-2"
            theme="vs"
            language="markdown"
            :options="options"
            :value="file.content"
            @change="onChange"
          ></MonacoEditor>
        </v-col>
        <v-col cols="6" id="preview-col" class="flex-grow-1">
          <v-skeleton-loader v-if="loadingDetail" type="article@4">
          </v-skeleton-loader>
          <div v-html="preview" class="ml-2 mr-2 mt-2 markdown-body" v-else></div>
        </v-col>
      </v-row>
      <v-snackbar class="mb-2" v-model="showSnackbar" :timeout="snackbarTimeOut">{{snackbarText}}</v-snackbar>
    </v-main>
  </v-app>
</template>
<script>
import MonacoEditor from 'monaco-editor-vue';
import _ from 'loadsh'
import marked from 'marked'
import {API, http} from './utils/http'
import DOMPurify from 'dompurify'
import eol from "eol";
import getInitMD from "./utils/initmd";
const sha256 = require('crypto-js/sha256')
const KEY_STORAGE_FILE_ID = 'lastEditFile_ID'
const FILE_TEMPLATE = {
  _id: '',
  title: 'Title here',
  content: '# Title here\n'
}

export default {
  name: "App",
  components: {
    MonacoEditor
  },
  data() {
    return {
      // manoco editor options
      options: {
        minimap: { enabled: false },
        scrollbar: {
          vertical: 'hidden',
          handleMouseWheel: false,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: false,
        peekWidgetDefaultFocus: true,
      },
      // current file editing
      file: Object.assign({}, FILE_TEMPLATE),
      loadingDetail: true,
      // file list
      dialogSelect: false,
      fileList: null,
      // login dialog
      dialog: false,
      btn_loading: false,
      password: '',
      // sync status
      syncStatus: 'green',
      // global snackbar
      showSnackbar: false,
      snackbarText: '',
      snackbarTimeOut: 2000,
    }
  },
  computed: {
    preview: function() {
      return DOMPurify.sanitize(marked(this.file.content))
    },
  },
  watch: {
    'file._id': function(newValue) {
      window.localStorage.setItem(KEY_STORAGE_FILE_ID, newValue)
    },
    'file.title': function(newValue) {
      document.title = newValue
    },
  },
  methods: {
    getTitleFromPreview(preview) {
      const arr = eol.split(preview)
      for(let i=0; i<arr.length; i++) {
        const tmp = DOMPurify.sanitize(arr[i], {
          ALLOWED_TAGS: []
        })
        if (tmp) {
          return tmp
        }
      }
      return ''
    },
    onChange: _.debounce(function(value) {
      const preview = DOMPurify.sanitize(marked(value))
      this.file.title = this.getTitleFromPreview(preview)
      this.file.content = value
      this.onChangeUpload()
    }, 200),
    onChangeUpload: _.debounce(function() {
      this.uploadImpl()
    }, 1000),
    ctrlSUpload: _.debounce(function(){
      this.uploadImpl()
    }, 1200),// 同步算法还不完善，同步频率过快会导致错乱
    async uploadImpl() {
      if (!this.file._id && !this.file.content) {
        return
      }
      this.syncStatus = 'yellow'
      if (!this.file.content) {
        // 清空内容，则删除当前文件
        await http.get(API.file.destory, {
          params: {
            _id: this.file._id
          }
        })
        .then(() => {
          this.syncStatus = 'green'
        })
        .catch(err => {
          this.syncStatus = 'red'
          window.showSnackbar('更新失败: ' + err + '\n按ctrl+s重试')
        })
        return
      }
      const { _id, title, content } = this.file
      await http
      .post(API.file.update, {
        data: {_id, title, content}
      })
      .then((res) => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        console.log('update finished: ', res)
        this.syncStatus = 'green'
        this.file._id = res.data._id
      })
      .catch(err => {
        console.error(err)
        this.syncStatus = 'red'
        window.showSnackbar('保存失败：' + err + '\n按ctrl+s进行保存')
      })
    },
    onLogin: _.debounce(function() {
      this.btn_loading = true
      http
      .get(API.login, {
        params: {
          auth: sha256(this.password).toString()
        }
      })
      .then(res => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        window.localStorage.setItem('auth', sha256(this.password).toString())
        this.dialog = false
        this.getFileDetail()
      })
      .catch(err => {
        this.btn_loading = false
        this.dialog = true
        window.showSnackbar('登录失败：' + err + '\n请重试。')
      })
    }, 300),
    async getFileList() {
      // 获取文件列表
      await http
      .get(API.file.list)
      .then(res => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        res.data.forEach(element => {
          element.deleting = false
        });
        this.fileList = res.data
      })
      .catch(err => {
        console.error('获取文件列表失败', err)
      })
    },
    async onNewFile() {
      this.file = Object.assign({}, FILE_TEMPLATE)
    },
    async onSelectFile(file) {
      console.log('onselect', file)
      if (file === 'addnew') {
        this.onNewFile()
      } else {
        await this.getFileDetail(file._id)
      }
      this.dialogSelect = false
    },
    async onDeleteFile(file, index) {
      console.log('deleting', file, index, 'this.file', this.file)
      if (file._id === this.file._id) {
        console.log('deleting current')
        this.file = Object.assign({}, FILE_TEMPLATE)
      }
      file.deleting = true
      http.get(API.file.destory, {
        params: {
          _id: file._id
        }
      })
      .then(() => {
        file.deleting = false
        this.fileList.splice(index, 1)
      })
      .catch(err => {
        file.deleting = false
        window.showSnackbar('删除失败：' + err + '\n请重试')
      })
    },
    async getFileDetail(_id = '') {
      console.log('get file detail', _id)
      this.loadingDetail = true
      await http
      .get(API.file.detail, {
        params: {
          _id
        }
      })
      .then(async(res) => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        if (!res.data && _id) {
          return
        }
        let file = {}
        if (!res.data) {
          // 第一次进入，使用默认文件
          file = Object.assign({}, FILE_TEMPLATE, {
            content: await getInitMD()
          })
        } else {
          file = (({_id, title, content}) => ({_id, title, content}))(res.data)
        }
        this.file = file
      })
      .catch(err => {
        window.showSnackbar('请刷新页面重试。\n打开文件失败：' + err)
      })
      this.loadingDetail = false
    },
    async openFileList() {
      await this.getFileList()
      this.dialogSelect = true
    }
  },
  mounted: function (){
    this.dialog = window.localStorage.getItem('auth') ? false : true
    window.showSnackbar = (msg, timeout = 2000) => {
      this.showSnackbar = true
      this.snackbarText = msg
      this.snackbarTimeOut = timeout
    }
    window.addEventListener('keydown', (event) => {
      if (event.key === 's' && event.ctrlKey) {
        event.preventDefault()
        this.uploadImpl()
        return false
      }
      if (event.key === 'o' && event.ctrlKey) {
        event.preventDefault()
        // 打开文件列表
        this.openFileList()
        return false
      }
      return true
    })
    if (!this.dialog) {
      // 获取要编辑的文件
      this.getFileDetail(window.localStorage.getItem(KEY_STORAGE_FILE_ID))
    }
  },
};
</script>

<style>
@import 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css';
</style>
<style>
.iPadShowKeyboard {
  display: none
}
code {
  background-color: transparent !important;
}
@media print {
  #editor-col {
    display: none;
  }
  #preview-col {
    width: 100vw;
  }
  .markdown-body {
    width: 100vw;
  }
  #editor-real {
    width: 100vw;
  }
}
</style>