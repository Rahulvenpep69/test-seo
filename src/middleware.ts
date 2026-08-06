import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Admin routes require ADMIN role
        if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: '/login',
        },
        cookies: {
            sessionToken: {
                name: 'next-auth.session-token',
            },
        },
    }
);

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/onboarding/:path*',
        '/seo/:path*',
        '/ai-tools/:path*',
        '/builder/:path*',
        '/store/:path*',
        '/ads/:path*',
        '/automation/:path*',
        '/reports/:path*',
        '/billing/:path*',
        '/admin/:path*',
    ],
};
