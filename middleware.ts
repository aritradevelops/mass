import { verifyKey } from '@unkey/api';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter, UNKEY_API_ID } from './lib/unkey';
const module = 'cat'
const getAction = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', withId = false) => {
  switch (method) {
    case 'GET':
      return withId ? 'view' : 'list';
    case 'POST':
      return `create`
    case 'PUT':
      return 'update';
    case 'DELETE':
      return `delete`;
    case 'PATCH':
      return `update`;
    default:
      throw new Error(`Invalid method ${method}`)
  }
}
const getTokenDetails = async (token: string) => {
  const { result, error } = await verifyKey({ key: token, apiId: UNKEY_API_ID });
  if (error) {
    throw new Error(`Invalid token`)
  }
  if (!result.valid) {
    throw new Error(`Invalid token`)
  }
  return {
    permissions: result.permissions!,
    requester: result.ownerId!
  }
}
interface Params {
  id?: string;
}


export async function middleware(req: NextRequest, context: { params?: Params }) {
  try {
    const auth = req.headers.get('Authorization') || 'Bearer ';
    const token = auth.slice(7); // remove 'Bearer ' from the beginning of the token
    if (!token) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    const { permissions, requester } = await getTokenDetails(token);
    const ratelimit = await rateLimiter.limit(requester)
    if (!ratelimit.success) {
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    const action = getAction(req.method as 'GET' | 'POST', !!context.params?.id);
    const foundPermission = permissions.find(permission => permission.startsWith(`${module}.${action}.`));
    if (!foundPermission) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    const [_, __, scope] = foundPermission.split('.');
    const reqHeaders = new Headers(req.headers)
    reqHeaders.set('x-api-scope', scope)
    reqHeaders.set('x-api-user', requester)
    return NextResponse.next({ request: { headers: reqHeaders } })
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong with this request, please try again later!", data: (error as Error).message }, { status: 500 });
  }
}
export const config = {
  matcher: '/api/:path*'
}
