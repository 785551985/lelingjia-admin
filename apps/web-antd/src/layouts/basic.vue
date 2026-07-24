<script lang="ts" setup>
import { computed, h, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { VBEN_DOC_URL, VBEN_GITHUB_URL } from '@vben/constants';
import { useWatermark } from '@vben/hooks';
import {
  BookOpenText,
  CircleHelp,
  GiteeIcon,
  GitHubOutlined,
  UserOutlined,
} from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import { message } from 'ant-design-vue';

import { TenantToggle } from '#/components/tenant-toggle';
import { $t } from '#/locales';
import { resetRoutes } from '#/router';
import { useAuthStore, useNotifyStore } from '#/store';
import { useTenantStore } from '#/store/tenant';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const router = useRouter();
const { destroyWatermark, updateWatermark } = useWatermark();

const tenantStore = useTenantStore();
const menus = computed(() => {
  const defaultMenus = [
    {
      handler: () => {
        router.push('/profile');
      },
      icon: UserOutlined,
      text: $t('ui.widgets.profile'),
    },
  ];
  /**
   * 租户选中状态 不显示个人中心
   */
  if (tenantStore.checked) {
    defaultMenus.splice(1, 1);
  }
  return defaultMenus;
});

const avatar = computed(() => {
  return userStore.userInfo?.avatar || preferences.app.defaultAvatar;
});

async function handleLogout() {
  /**
   * 主动登出不需要带跳转地址
   */
  await authStore.logout(false);
  resetRoutes();
}

const notifyStore = useNotifyStore();
onMounted(() => notifyStore.startListeningMessage());

function handleViewAll() {
  message.warning('暂未开放');
}
function openKnowledgeChat() {
  const token = accessStore.accessToken || localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  const targetUrl = `http://localhost:5173/${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  window.open(targetUrl, '_blank');
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #header-right-1>
      <a-button
        size="small"
        class="go-chat-btn"
        @click="openKnowledgeChat"
      >
        进入问答客户端
      </a-button>
      <TenantToggle />
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.email || '未设置邮箱'"
        :tag-text="userStore.userInfo?.username"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="notifyStore.showDot"
        :notifications="notifyStore.notifications"
        @clear="notifyStore.clearAllMessage"
        @make-all="notifyStore.setAllRead"
        @read="notifyStore.setRead"
        @view-all="handleViewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>

<style scoped>
.go-chat-btn {
  margin-right: 12px;
  border-radius: 6px;
  font-weight: 500;
  color: #409eff;
  border-color: #a0cfff;
  background-color: #ecf5ff;
  transition: all 0.2s ease-in-out;
}

.go-chat-btn:hover,
.go-chat-btn:focus {
  color: #ffffff !important;
  border-color: #409eff !important;
  background-color: #409eff !important;
}
</style>
