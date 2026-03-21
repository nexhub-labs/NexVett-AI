// nexvett-ai/api/index.ts
import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';
import { mastra } from '../src/mastra/index';
import { globalSecurity, sendError } from '../src/mastra/security';

const app = new Hono();

// 1. Global Security Pipeline (CORS, API Key, CSRF, Secure Headers)
app.use('*', ...globalSecurity);

// 2. Global Error Handling
app.onError((err, c) => {
    console.error('VERCEL_GLOBAL_ERROR:', err);
    return sendError(c, err.message || 'Internal Server Error', 500);
});

// 3. Health Check
app.get('/api/health-check', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// 4. Dynamic Route Registration from Mastra
const mastraServer = mastra.getServer();
if (mastraServer?.apiRoutes) {
    mastraServer.apiRoutes.forEach((route) => {
        const method = (route.method.toLowerCase() || 'post') as
            | 'get' | 'post' | 'put' | 'delete' | 'patch';
        const path = route.path.startsWith('/') ? route.path : `/${route.path}`;
        const middlewares = Array.isArray(route.middleware)
            ? route.middleware
            : route.middleware
                ? [route.middleware]
                : [];

        if ('handler' in route) {
            (app[method] as any)(path, ...middlewares, route.handler);
        } else if ('createHandler' in route) {
            (app[method] as any)(path, ...middlewares, async (c: any) => {
                const handler = await (route as any).createHandler({ mastra });
                return handler(c, () => Promise.resolve());
            });
        }
    });
}

// 5. Agent List Helper
app.get('/api/agents', (c) => {
    const agents = mastra.getAgents();
    const agentList = Object.entries(agents).map(([name, agent]) => ({
        name,
        id: agent.id,
    }));
    return c.json({ agents: agentList });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
