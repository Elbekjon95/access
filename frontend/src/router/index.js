import { createRouter, createWebHistory } from 'vue-router';
import Kiosk from '../views/Kiosk.vue';

const routes = [
  {
    path: '/',
    name: 'Kiosk',
    component: Kiosk
  },
  {
    path: '/admin/login',
    name: 'Login',
    component: () => import('../views/admin/Login.vue')
  },
  {
    path: '/admin/register',
    name: 'Register',
    component: () => import('../views/admin/Register.vue')
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/admin/Dashboard.vue')
      },
      {
        path: 'chats',
        name: 'AdminChats',
        component: () => import('../views/admin/Chats.vue')
      },
      {
        path: 'complaints',
        name: 'AdminComplaints',
        component: () => import('../views/admin/Complaints.vue')
      },
      {
        path: 'map',
        name: 'AdminMap',
        component: () => import('../views/admin/Map.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guard (JWT check)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token');
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next('/admin/login');
    } else {
      next();
    }
  } else if (to.path === '/admin/login' && token) {
      next('/admin'); // Agar allaqachon login qilgan bo'lsa dashboardga
  } else {
    next();
  }
});

export default router;
