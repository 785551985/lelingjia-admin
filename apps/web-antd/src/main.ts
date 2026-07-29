import { initPreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { overridesPreferences } from './preferences';

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // 启动应用并挂载 (在内部优先完成 Pinia 与全局依赖初始化)
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // app偏好设置初始化 (Pinia 准备就绪后安全执行)
  try {
    await initPreferences({
      namespace,
      overrides: overridesPreferences,
    });
  } catch (e) {
    console.warn('Preferences initialization warning:', e);
  }

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
