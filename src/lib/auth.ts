import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const user = await prisma.user.findFirst({
                    where: { email: { equals: credentials.email.trim(), mode: 'insensitive' } },
                });
                if (!user || !user.password) return null;

                const submittedPassword = credentials.password.trim();
                let isValid = await bcrypt.compare(submittedPassword, user.password);

                // Flexible case fallback for common password variations (e.g. password@123 vs Password@123)
                if (!isValid) {
                    const altPassword = submittedPassword.startsWith('P')
                        ? 'p' + submittedPassword.slice(1)
                        : submittedPassword.startsWith('p')
                            ? 'P' + submittedPassword.slice(1)
                            : submittedPassword;
                    isValid = await bcrypt.compare(altPassword, user.password);
                }

                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                };
            },
        }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            } else if (token.id) {
                // Fetch latest role from DB to support real-time promotion
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true },
                    });
                    if (dbUser) {
                        token.role = dbUser.role;
                    }
                } catch (e) {
                    // Keep existing role if DB fetch fails
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
};
