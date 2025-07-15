import { redirect } from "next/navigation";

export default async function Home() {
  // For now, redirect to login page
  // In a real implementation, you might want to check JWT tokens on the server side
  redirect("/auth/login");
} 