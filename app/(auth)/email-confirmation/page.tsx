"use client";

import React from "react";
import Link from "next/link";
import { Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Metadata } from "next";

export default function EmailConfirmationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary-500" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-theme-accent4 text-center">
              Please check your inbox and click the confirmation link to verify your email address.
            </p>
            <div className="pt-4 space-y-2">
              <Link href="/login" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Back to Login
                </Button>
              </Link>
              <p className="text-sm text-theme-accent4 text-center">
                Didn't receive the email?{" "}
                <Link href="/signup" className="font-medium text-primary-500 hover:text-primary-600">
                  Resend
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

