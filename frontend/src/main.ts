import './assets/main.css'

import { DefaultApolloClient } from '@vue/apollo-composable'
import { createApp } from 'vue'
import { createApolloClient } from './apollo/client'
import App from './App.vue'
import router from './router'

const apolloClient = createApolloClient()
const app = createApp(App)

app.use(router)
app.provide(DefaultApolloClient, apolloClient)

app.mount('#app')
