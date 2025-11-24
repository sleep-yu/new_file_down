import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: {
      requireAuth: false,
      title: '注册'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router;