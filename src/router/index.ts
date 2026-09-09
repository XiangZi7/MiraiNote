import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history also works with Tauri's local protocol and static previews.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { name: 'workspace' } },
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/pages/WorkspacePage.vue'),
      meta: { cacheKey: 'workspace' },
      children: [{
        path: 'pane/:paneId/tab/:tabId',
        name: 'document',
        component: () => import('@/pages/DocumentPage.vue'),
        props: true,
      }],
    },
    {
      path: '/library/:section',
      name: 'library',
      component: () => import('@/pages/DocumentLibraryPage.vue'),
      props: true,
    },
    {
      path: '/folders/:folderPath',
      name: 'folder',
      component: () => import('@/pages/FolderLibraryPage.vue'),
      props: true,
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'workspace' } },
  ],
})
