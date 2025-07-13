import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      status: string
      firstName: string
      lastName: string
      membershipNumber?: string
      profileImage?: string
      profileImagePublicId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    status: string
    firstName: string
    lastName: string
    membershipNumber?: string
    profileImage?: string
    profileImagePublicId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    status: string
    firstName: string
    lastName: string
    membershipNumber?: string
    profileImage?: string
    profileImagePublicId?: string
  }
} 