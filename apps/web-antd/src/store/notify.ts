import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';

import { SvgMessageUrl } from '@vben/icons';
import { $t } from '@vben/locales';
import { useUserStore } from '@vben/stores';

import { Modal, notification } from 'ant-design-vue';
import dayjs from 'dayjs';
import { defineStore } from 'pinia';

import { useSseMessage } from '#/utils/message';

export const useNotifyStore = defineStore(
  'app-notify',
  () => {
    /**
     * return才会被持久化 存储全部消息
     */
    const notificationList = ref<NotificationItem[]>([]);

    const userStore = useUserStore();
    const userId = computed(() => {
      return userStore.userInfo?.userId || '0';
    });

    const notifications = computed(() => {
      return notificationList.value
        .filter((item) => item.userId === userId.value)
        .map((item) => {
          let cleanMessage = item.message;
          if (typeof cleanMessage === 'string' && cleanMessage.startsWith('{')) {
            try {
              const parsed = JSON.parse(cleanMessage);
              if (parsed && typeof parsed === 'object') {
                cleanMessage =
                  parsed.content || parsed.message || parsed.msg || cleanMessage;
              }
            } catch {}
          }
          return {
            ...item,
            message: cleanMessage,
          };
        });
    });

    /**
     * 开始监听sse消息
     */
    function startListeningMessage() {
      const sseReturnData = useSseMessage();
      if (!sseReturnData) {
        return;
      }
      const { data } = sseReturnData;

      watch(data, (rawMessage) => {
        if (!rawMessage) return;
        console.log(`接收到消息: ${rawMessage}`);

        let contentStr = rawMessage;
        try {
          const parsed =
            typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
          if (parsed && typeof parsed === 'object') {
            if (parsed.event === 'ping' || parsed.event === 'heartbeat') {
              data.value = null;
              return;
            }
            if (parsed.content) {
              contentStr = parsed.content;
            } else if (parsed.message) {
              contentStr = parsed.message;
            } else if (parsed.msg) {
              contentStr = parsed.msg;
            }
          }
        } catch {
          // 非 JSON 原样显示
        }

        notification.success({
          description: contentStr,
          duration: 3,
          message: $t('component.notice.received'),
        });

        notificationList.value.unshift({
          avatar: SvgMessageUrl,
          date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          isRead: false,
          message: contentStr,
          title: $t('component.notice.title'),
          userId: userId.value,
        });

        // 需要手动置空 vue3在值相同时不会触发watch
        data.value = null;
      });
    }

    /**
     * 设置全部已读
     */
    function setAllRead() {
      notificationList.value
        .filter((item) => item.userId === userId.value)
        .forEach((item) => {
          item.isRead = true;
        });
    }

    /**
     * 设置单条消息已读
     * @param item 通知
     */
    function setRead(item: NotificationItem) {
      !item.isRead && (item.isRead = true);
      // 显示信息
      Modal.info({
        title: item.title,
        content: item.message,
      });
    }

    /**
     * 清空全部消息
     */
    function clearAllMessage() {
      notificationList.value = notificationList.value.filter(
        (item) => item.userId !== userId.value,
      );
    }

    /**
     * 只需要空实现即可
     * 否则会在退出登录清空所有
     */
    function $reset() {
      // notificationList.value = [];
    }
    /**
     * 显示小圆点
     */
    const showDot = computed(() =>
      notificationList.value
        .filter((item) => item.userId === userId.value)
        .some((item) => !item.isRead),
    );

    return {
      $reset,
      clearAllMessage,
      notificationList,
      notifications,
      setAllRead,
      setRead,
      showDot,
      startListeningMessage,
    };
  },
  {
    persist: {
      pick: ['notificationList'],
    },
  },
);
