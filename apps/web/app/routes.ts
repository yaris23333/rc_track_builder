import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/editor.tsx'),
  route('s/:token', 'routes/share.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
