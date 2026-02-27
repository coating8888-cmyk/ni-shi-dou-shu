import { NextResponse } from 'next/server';

const SITE_PASSWORD = process.env.SITE_PASSWORD || '';

function getAuthToken(): string {
  return btoa(encodeURIComponent(`nishi_${SITE_PASSWORD}_auth`));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (password === SITE_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('nishi_auth', getAuthToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json(
    { success: false, error: '密碼錯誤' },
    { status: 401 }
  );
}
