import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { SessionStrategy } from 'next-auth';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              firstName: true,
              lastName: true,
              role: true,
              status: true,
              membershipNumber: true,
              profileImage: true,
            },
          });
          if (!user) {
            return null;
          }
          if (user.status !== 'ACTIVE') {
            throw new Error('Account is not active. Please contact admin.');
          }
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          if (!isValidPassword) {
            return null;
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            membershipNumber: user.membershipNumber ?? undefined,
            profileImage: user.profileImage ?? undefined,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: any, user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.membershipNumber = user.membershipNumber;
        token.profileImage = user.profileImage;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.membershipNumber = token.membershipNumber as string;
        session.user.profileImage = token.profileImage as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || '6ac1ce8466e02c6383fb70103b51cdffd9cb3394970606ef0b2e2835afe77a7e',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions }; 