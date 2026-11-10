import { createEmptyDoc } from '@rctrack/core';
import { redirect } from 'react-router';
import EditorApp from '~/components/EditorApp';
import { legacyShareTarget, loadLocalDoc } from '~/lib/share';
import { useStore } from '~/store/useStore';

/**
 * 编辑器入口：首次进入时恢复本地草稿。
 * bootstrap 放在 clientLoader 里，保证首帧就有内容、不会触发“空画布”自动保存。
 */
export async function clientLoader() {
  const legacy = legacyShareTarget();
  if (legacy) throw redirect(legacy);

  const state = useStore.getState();
  if (!state.booted) {
    state.bootstrap(loadLocalDoc() ?? createEmptyDoc(), { readOnly: false });
  }
  return null;
}

export default EditorApp;
