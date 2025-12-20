import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Star, Users, MapPin, Shield, MessageCircle, Zap, Globe, Briefcase, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { categories } from "@/lib/mock-data/categories";
import { tasks, getOpenTasks } from "@/lib/mock-data/tasks";
import { TaskCard } from "@/components/task/TaskCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TaskZing - Connect with Skilled Professionals Across Canada",
  description: "TaskZing is a comprehensive task and job marketplace platform connecting clients with skilled service providers. Post jobs, find opportunities, showcase your work, and get things done securely. Born in Canada.",
  openGraph: {
    title: "TaskZing - Your Canadian Task Marketplace",
    description: "Connect with skilled professionals for all your task needs. Quality service, secure payments, real-time messaging.",
  },
};

export default function HomePage() {
  const featuredCategories = categories.slice(0, 6);
  const featuredTasks = getOpenTasks().slice(0, 6);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="bg-primary-500 text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                Made in Canada 🇨🇦
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Connect with Skilled Professionals
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-white/90">
              TaskZing bridges the gap between those who need work done and those ready to offer it
            </p>
            <p className="text-lg mb-8 text-white/80 max-w-2xl mx-auto">
              A comprehensive task and job marketplace platform where clients post jobs and providers showcase their skills. Quality service, secure payments, real-time messaging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white/10">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Role Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-theme-primaryText mb-4">
            For Everyone
          </h2>
          <p className="text-lg text-theme-accent4 max-w-2xl mx-auto">
            TaskZing works for both clients and service providers. Switch roles seamlessly.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-2 border-primary-200 hover:border-primary-500 transition-colors">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <Briefcase className="h-8 w-8 text-primary-500 mr-3" />
                <h3 className="text-2xl font-bold text-theme-primaryText">For Clients</h3>
              </div>
              <p className="text-theme-accent4 mb-6">
                Post jobs, find skilled professionals, manage projects, and get quality work done.
              </p>
              <ul className="space-y-3">
                {[
                  "Post detailed job listings with photos and location",
                  "Receive proposals from qualified providers",
                  "Browse provider portfolios and reviews",
                  "Secure messaging and communication",
                  "Protected payments through Stripe",
                  "Rate and review providers",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-theme-primaryText">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary-200 hover:border-primary-500 transition-colors">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-8 w-8 text-primary-500 mr-3" />
                <h3 className="text-2xl font-bold text-theme-primaryText">For Providers</h3>
              </div>
              <p className="text-theme-accent4 mb-6">
                Find opportunities, showcase your work, build your reputation, and grow your business.
              </p>
              <ul className="space-y-3">
                {[
                  "Browse and apply to available jobs",
                  "Showcase your portfolio and skills",
                  "Build professional profile with reviews",
                  "Real-time chat with clients",
                  "Secure payment processing",
                  "Location-based job discovery",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-theme-primaryText">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-theme-secondaryBackground py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-theme-primaryText mb-4">
              Why Choose TaskZing?
            </h2>
            <p className="text-lg text-theme-accent4 max-w-2xl mx-auto">
              Platform features designed to make your experience smooth and secure
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                title: "Location-Based Services",
                description: "Find professionals near you with Google Maps integration and geolocation",
              },
              {
                icon: Shield,
                title: "Secure Payments",
                description: "Protected transactions through Stripe with payment security",
              },
              {
                icon: MessageCircle,
                title: "Real-Time Messaging",
                description: "Instant communication with clients and providers",
              },
              {
                icon: Users,
                title: "Dual Role System",
                description: "Switch seamlessly between Client and Provider roles",
              },
              {
                icon: Globe,
                title: "Multi-Language Support",
                description: "Available in English and French",
              },
              {
                icon: Zap,
                title: "AI-Powered Assistant",
                description: "Chat Zing - Your intelligent TaskZing assistant for help and support",
              },
            ].map((feature, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-500 mr-3" />
                    <h3 className="text-xl font-semibold text-theme-primaryText">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-theme-accent4">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-theme-primaryText mb-4">How It Works</h2>
          <p className="text-lg text-theme-accent4 max-w-2xl mx-auto">
            Simple steps to get your tasks done or start offering your services
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-500">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-primaryText">Post or Browse</h3>
              <p className="text-theme-accent4">
                Clients post detailed job listings. Providers browse opportunities and showcase portfolios.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-500">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-primaryText">Connect & Propose</h3>
              <p className="text-theme-accent4">
                Providers submit proposals. Clients review profiles, ratings, and portfolios.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-500">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-primaryText">Communicate</h3>
              <p className="text-theme-accent4">
                Use real-time messaging to discuss details, track progress, and coordinate.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-500">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-primaryText">Complete & Review</h3>
              <p className="text-theme-accent4">
                Pay securely, complete the work, and leave reviews to build trust.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="text-center">
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">
              Learn More About How It Works
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="bg-theme-secondaryBackground py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-theme-primaryText mb-2">Browse Categories</h2>
              <p className="text-theme-accent4">Find professionals by category</p>
            </div>
            <Link href="/categories">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold text-theme-primaryText mb-1">
                      {category.mainCategory}
                    </h3>
                    {category.subCategory && (
                      <p className="text-sm text-theme-accent4">{category.subCategory}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tasks/Jobs */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-theme-primaryText mb-2">Featured Jobs</h2>
            <p className="text-theme-accent4">Latest opportunities for service providers</p>
          </div>
          <Link href="/categories">
            <Button variant="ghost">
              View All Jobs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTasks.map((task) => (
            <TaskCard key={task.jobId} task={task} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-theme-secondaryBackground py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-theme-primaryText mb-4">What Our Users Say</h2>
            <p className="text-lg text-theme-accent4 max-w-2xl mx-auto">
              Real experiences from clients and providers across Canada
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Client - Business Owner",
                location: "Toronto, ON",
                rating: 5,
                text: "TaskZing made it so easy to post my web development job. I received quality proposals quickly, and the secure payment system gave me peace of mind. Found the perfect developer!",
              },
              {
                name: "Michael Chen",
                role: "Provider - Plumber",
                location: "Vancouver, BC",
                rating: 5,
                text: "As a service provider, TaskZing has transformed my business. The location-based job discovery helps me find clients in my area, and the portfolio showcase feature lets me display my best work.",
              },
              {
                name: "Emily Rodriguez",
                role: "Client - Homeowner",
                location: "Montreal, QC",
                rating: 5,
                text: "I needed help with home repairs and found multiple qualified professionals through TaskZing. The real-time messaging made coordination easy, and the review system helped me choose the right person.",
              },
            ].map((testimonial, i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-5 w-5 fill-accent-yellow text-accent-yellow" />
                    ))}
                  </div>
                  <p className="text-theme-primaryText mb-4 flex-grow">"{testimonial.text}"</p>
                  <div className="border-t border-theme-accent2 pt-4">
                    <p className="font-semibold text-theme-primaryText">{testimonial.name}</p>
                    <p className="text-sm text-theme-accent4">{testimonial.role}</p>
                    <p className="text-xs text-theme-accent4 mt-1">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-500 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the TaskZing community - where clients find skilled professionals and providers discover opportunities across Canada
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button variant="secondary" size="lg">
                Create Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white/10">
                Learn How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

