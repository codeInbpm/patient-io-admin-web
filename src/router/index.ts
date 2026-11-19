import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/layout/index.vue'),
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '数据概览看板' }
      },
      {
        path: '/rounds',
        name: 'Rounds',
        component: () => import('../views/rounds/index.vue'),
        meta: { title: '夜查房登记表' }
      },
      {
        path: '/hospital',
        name: 'Hospital',
        component: () => import('../views/hospital/index.vue'),
        meta: { title: '医院管理', roles: ['SUPER_ADMIN'] }
      },
      {
        path: '/department',
        name: 'Department',
        component: () => import('../views/department/index.vue'),
        meta: { title: '楼宇与病区管理' }
      },
      {
        path: '/bed',
        name: 'Bed',
        component: () => import('../views/bed/index.vue'),
        meta: { title: '床位管理' }
      },
      {
        path: '/nurse',
        name: 'Nurse',
        component: () => import('../views/nurse/index.vue'),
        meta: { title: '护士长/护士档案' }
      },
      {
        path: '/patient',
        name: 'Patient',
        component: () => import('../views/patient/index.vue'),
        meta: { title: '病患档案管理' }
      },
      {
        path: '/assignment',
        name: 'Assignment',
        component: () => import('../views/assignment/index.vue'),
        meta: { title: '责任护士床位分配' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '管理员登录' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局路由守卫
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '管理后台'} | 出入量记录多租户系统`;
  const token = localStorage.getItem('admin_token');
  const role = localStorage.getItem('admin_role');

  if (!token && to.path !== '/login') {
    next('/login');
  } else if (to.meta.roles && !((to.meta.roles as string[]).includes(role || ''))) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
