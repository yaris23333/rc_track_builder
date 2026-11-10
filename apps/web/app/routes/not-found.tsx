import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">RC</div>
      <h1 className="boot-title">页面不存在</h1>
      <p>这条链接可能已失效，或者地址拼错了。</p>
      <Link className="boot-link" to="/">
        返回编辑器
      </Link>
    </div>
  );
}
