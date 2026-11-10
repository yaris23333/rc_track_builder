import { decodeDoc } from '@rctrack/core';
import { data } from 'react-router';
import EditorApp from '~/components/EditorApp';
import { useStore } from '~/store/useStore';

/**
 * 只读分享预览：/s/<payload>
 * 解码失败时抛 400，由 root ErrorBoundary 统一呈现可读错误。
 */
export async function clientLoader({ params }: { params: { token?: string } }) {
  const doc = decodeDoc(params.token ?? '');
  if (!doc) {
    throw data({ message: '分享链接无法解析或已损坏，请让分享者重新生成。' }, { status: 400 });
  }
  useStore.getState().bootstrap(doc, { readOnly: true });
  return null;
}

export default EditorApp;
