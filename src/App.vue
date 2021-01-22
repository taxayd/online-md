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
          <v-list-item color="white" v-for="file in fileList" :key="file.fileID" v-on:click="onSelectFile(file)">
            <v-list-item-title>
              {{file.title}}
            </v-list-item-title>
          </v-list-item>
          <v-list-item key="addnew" v-on:click="onSelectFile('addnew')">
            <v-list-item-title>
              新建文件
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-dialog>
        <v-row no-gutters style="height: 100%;">
          <v-col cols="6" id="editor-col" class="flex-grow-1" style="height: 100%;">
            <MonacoEditor
              id="editor-real"
              ref="editor"
              class="mr-2 mt-2"
              height="100%"
              theme="vs"
              language="markdown"
              :options="options"
              :value="file.content"
              @change="onChange"
            ></MonacoEditor>
          </v-col>
          <v-col cols="6" id="preview-col" class="flex-grow-1">
            <div v-html="preview" class="ml-2 mr-2 mt-2 markdown-body"></div>
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
const sha256 = require('crypto-js/sha256')
const KEY_STORAGE_FILEID = 'lastEditFileID'

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
      file:{
        fileID: '',
        title: 'new md file',
        content: '# input here'
      },
      // file list
      dialogSelect: false,
      fileList: null,
      // login dialog
      dialog: false,
      btn_loading: false,
      password: '',
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
    file: function(newValue) {
      document.title = newValue.title
      window.localStorage.setItem(KEY_STORAGE_FILEID, newValue.fileID)
    }
  },
  methods: {
    onChange: _.debounce(function(value) {
      this.file.content = value
      this.onChangeUpload()
    }, 200),
    onChangeUpload: _.debounce(function() {
      this.uploadImpl()
    }, 1200),
    ctrlSUpload: _.debounce(function(){
      this.uploadImpl()
    }, 100),
    uploadImpl: function() {
      if (!this.file.fileID && !this.file.content) {
        return
      }
      http
      .post(API.file.update, {
        data: this.file
      })
      .then(res => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        this.file.fileID = res.data.fileID
      })
      .catch(err => {
        console.error(err)
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
        this.fileList = res.data
      })
      .catch(err => {
        console.error('获取文件列表失败', err)
      })
    },
    async onSelectFile(file) {
      if (file === 'addnew') {
        this.file = {
          fileID: '',
          content: '',
          title: ''
        }
      } else {
        await this.getFileDetail(file.fileID)
      }
      this.dialogSelect = false
    },
    async getFileDetail(fileID = '') {
      await http
      .get(API.file.detail, {fileID})
      .then(res => {
        if (res.code !== 0) {
          return Promise.reject(res.msg)
        }
        if (!res.data) {
          return
        }
        this.file = (({fileID, title, content}) => ({fileID, title, content}))(res.data)
      })
      .catch(err => {
        window.showSnackbar('请刷新页面重试。\n打开文件失败：' + err)
      })
    },
    async openFileList() {
      if (this.fileList === null) {
        await this.getFileList()
      }
      this.dialogSelect = true
    }
  },
  mounted: function() {
    const editor = this.$refs.editor.editor
    const editorWidth = editor._domElement.clientWidth
    const updateEditorHeight = function(event) {
      const contentHeight = Math.max(screen.height, event.contentHeight)
      editor.layout({
        width: editorWidth,
        height: contentHeight,
      })
    }
    editor.onDidContentSizeChange(updateEditorHeight)
  },
  created: function (){
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
      let fileID = ''
      if (window.localStorage.getItem(KEY_STORAGE_FILEID)) {
        fileID = window.localStorage.getItem(KEY_STORAGE_FILEID)
      }
      this.getFileDetail(fileID)
      // 获取文件列表
      this.getFileList()
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