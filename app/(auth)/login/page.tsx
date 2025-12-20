"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { mockLogin, setMockSession } from "@/lib/auth/mock";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await mockLogin(email, password);
      if (user) {
        // Set cookie for middleware
        document.cookie = `auth-token=mock-token-${user.id}; path=/; max-age=86400`;
        router.push(redirect);
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-theme-primaryText">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-theme-accent4">
            Or{" "}
            <Link href="/signup" className="font-medium text-primary-500 hover:text-primary-600">
              create a new account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-accent-error rounded-lg text-sm text-accent-error" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label="Email address"
              />
              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary-500 hover:text-primary-600"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

