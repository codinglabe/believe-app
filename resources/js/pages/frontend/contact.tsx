"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, HelpCircle, Users } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Link } from "@inertiajs/react"

const contactMethods = [
  {
    icon: Mail,
    title: "Email Us",
    description: "Send us an email and we'll respond within 24 hours",
    contact: "hello@careconnect.org",
    action: "mailto:hello@careconnect.org",
  },
  {
    icon: Phone,
    title: "Call Us",
    description: "Speak with our support team directly",
    contact: "+1 (555) 123-4567",
    action: "tel:+15551234567",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with us in real-time during business hours",
    contact: "Available 9 AM - 5 PM EST",
    action: "#",
  },
]

const faqItems = [
  {
    question: "How do I know my donation is secure?",
    answer:
      "We use industry-standard encryption and partner with trusted payment processors like Stripe to ensure your donation is completely secure.",
  },
  {
    question: "Can I get a tax receipt for my donation?",
    answer:
      "Yes! All donations through CareConnect are tax-deductible, and you'll receive an official receipt via email immediately after your donation.",
  },
  {
    question: "How do I track the impact of my donation?",
    answer:
      "You can log into your account to see detailed reports on how your donations are being used and the impact they're creating.",
  },
  {
    question: "How are organizations verified?",
    answer:
      "We have a rigorous verification process that includes checking legal status, financial transparency, and impact measurement capabilities.",
  },
]

export default function ContactPage() {
    return (
    <FrontendLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
            <div className="container mx-auto px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center max-w-4xl mx-auto"
            >
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Have questions? We're here to help. Reach out to us and we'll get back to you as soon as possible.
                </p>
            </motion.div>
            </div>
        </section>

        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                    <CardTitle className="text-2xl text-gray-900 dark:text-white">Send us a Message</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">
                        Fill out the form below and we'll get back to you within 24 hours
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="first-name">First Name *</Label>
                        <Input
                            id="first-name"
                            placeholder="John"
                            required
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                        </div>
                        <div>
                        <Label htmlFor="last-name">Last Name *</Label>
                        <Input
                            id="last-name"
                            placeholder="Doe"
                            required
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        required
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Select>
                        <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                            <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="donation">Donation Support</SelectItem>
                            <SelectItem value="organization">Organization Registration</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                            <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                        id="message"
                        placeholder="Tell us how we can help you..."
                        className="min-h-[150px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        required
                        />
                    </div>

                    <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                    </Button>
                    </CardContent>
                </Card>
                </motion.div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
                {/* Contact Methods */}
                <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                >
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    {contactMethods.map((method, index) => (
                        <div key={index} className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <method.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">{method.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{method.description}</p>
                            <Link href={method.action} className="text-sm text-blue-600 hover:underline">
                            {method.contact}
                            </Link>
                        </div>
                        </div>
                    ))}
                    </CardContent>
                </Card>
                </motion.div>

                {/* Office Hours */}
                <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                >
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                    <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
                        <Clock className="mr-2 h-5 w-5" />
                        Office Hours
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                        <span>Monday - Friday</span>
                        <span>9:00 AM - 6:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                        <span>Saturday</span>
                        <span>10:00 AM - 4:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                        <span>Sunday</span>
                        <span>Closed</span>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                </motion.div>

                {/* Office Location */}
                <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                >
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                    <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
                        <MapPin className="mr-2 h-5 w-5" />
                        Our Office
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p>123 Charity Lane</p>
                        <p>Suite 456</p>
                        <p>New York, NY 10001</p>
                        <p>United States</p>
                    </div>
                    </CardContent>
                </Card>
                </motion.div>
            </div>
            </div>

            {/* FAQ Section */}
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mt-16"
            >
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Quick answers to common questions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {faqItems.map((item, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                >
                    <Card className="h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-start text-gray-900 dark:text-white">
                        <HelpCircle className="mr-2 h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        {item.question}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 dark:text-gray-300">{item.answer}</p>
                    </CardContent>
                    </Card>
                </motion.div>
                ))}
            </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
            >
            <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white border-0">
                <CardContent className="py-12">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">Ready to Make a Difference?</h3>
                <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
                    Join thousands of supporters making an impact. Start your journey today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                    Start Donating
                    </Button>
                    <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-blue-600 bg-transparent"
                    >
                    Browse Organizations
                    </Button>
                </div>
                </CardContent>
            </Card>
            </motion.div>
        </div>
        </div>
    </FrontendLayout>
  )
}
