import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { Button } from "@/components/frontend/ui/button";
import { Input } from "@/components/frontend/ui/input";
import { Textarea } from "@/components/frontend/ui/textarea";
import { Label } from "@/components/frontend/ui/label";
import { Checkbox } from "@/components/frontend/ui/checkbox";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Phone, User, Mail, FileText, ShieldAlert, Shirt, Share2, BookUser, ChevronLeft } from "lucide-react";
import { SignaturePad } from "@/components/frontend/ui/signatur-pad";
import toast from "react-hot-toast";

interface JobApplyProps {
  job: {
    id: number;
    title: string;
    organization: {
      name: string;
    };
  };
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export default function JobApply({ job, auth }: JobApplyProps) {
    const { props } = usePage();

  const { data, setData, post, processing, errors } = useForm({
    job_post_id: job.id,
    user_id: auth.user.id,
    address: '',
    city: '',
    state: '',
    country: '',
    date_of_birth: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    volunteer_experience: '',
    work_or_education_background: '',
    languages_spoken: [] as string[],
    certifications: [] as string[],
    medical_conditions: '',
    physical_limitations: '',
    consent_background_check: false,
    drivers_license_number: '',
    willing_background_check: false,
    ever_convicted: false,
    conviction_explanation: '',
    reference_name: '',
    reference_relationship: '',
    reference_contact: '',
    agreed_to_terms: false,
    digital_signature: '',
    signed_date: new Date().toISOString().split('T')[0],
    tshirt_size: '',
    heard_about_us: '',
    social_media_handle: '',
  });

  const [currentSection, setCurrentSection] = useState(1);
  const totalSections = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/jobs/${job.id}/apply`, {
      preserveScroll: true,
        onSuccess: () => {
          console.log('Application submitted successfully:', data);
        // Show success toast
        toast.success('Application submitted successfully!', {
          duration: 4000,
        });

        // Optional: Redirect after delay
        setTimeout(() => {
          router.visit(`/jobs/${job.id}`);
        }, 2000);
      },
      onError: () => {
        toast.error('Failed to submit application. Please try again.', {
          position: 'top-center',
        });
      }
    });
  };

  const handleLanguageChange = (language: string) => {
    if (data.languages_spoken.includes(language)) {
      setData('languages_spoken', data.languages_spoken.filter(l => l !== language));
    } else {
      setData('languages_spoken', [...data.languages_spoken, language]);
    }
  };

  const handleCertificationChange = (certification: string) => {
    if (data.certifications.includes(certification)) {
      setData('certifications', data.certifications.filter(c => c !== certification));
    } else {
      setData('certifications', [...data.certifications, certification]);
    }
  };

  const languages = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Russian', 'Other'];
  const certifications = ['CPR', 'First Aid', 'EMT', 'Nursing', 'Lifeguard', 'Fire Safety', 'Other'];
  const tshirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const hearAboutUsOptions = [
    'Website',
    'Social Media',
    'Friend/Family',
    'Job Board',
    'Newsletter',
    'Other'
  ];

  const nextSection = () => setCurrentSection(prev => Math.min(prev + 1, totalSections));
  const prevSection = () => setCurrentSection(prev => Math.max(prev - 1, 1));

  return (
    <FrontendLayout>
      <Head title={`Apply for ${job.title}`} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href={`/jobs/${job.id}`} className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to job details
          </Link>
          <h1 className="text-3xl font-bold mt-4">Apply for: {job.title}</h1>
          <p className="text-muted-foreground">at {job.organization.name}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[...Array(totalSections)].map((_, i) => (
              <div
                key={i}
                className={`text-sm font-medium ${currentSection > i ? 'text-primary' : currentSection === i + 1 ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Section {i + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${(currentSection / totalSections) * 100}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Personal Information */}
          {currentSection === 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <User className="h-6 w-6 text-blue-500" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={data.city}
                    onChange={(e) => setData('city', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={data.state}
                    onChange={(e) => setData('state', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={data.country}
                    onChange={(e) => setData('country', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={data.postal_code}
                    onChange={(e) => setData('postal_code', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.postal_code && <p className="text-red-500 text-sm mt-1">{errors.postal_code}</p>}
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    type="date"
                    id="date_of_birth"
                    value={data.date_of_birth}
                    onChange={(e) => setData('date_of_birth', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Emergency Contact */}
          {currentSection === 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Phone className="h-6 w-6 text-blue-500" />
                Emergency Contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="emergency_contact_name">Full Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={data.emergency_contact_name}
                    onChange={(e) => setData('emergency_contact_name', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    required
                  />
                  {errors.emergency_contact_name && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_name}</p>}
                </div>

                <div>
                  <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                  <Input
                    id="emergency_contact_relationship"
                    value={data.emergency_contact_relationship}
                    onChange={(e) => setData('emergency_contact_relationship', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    required
                  />
                  {errors.emergency_contact_relationship && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_relationship}</p>}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="emergency_contact_phone">Phone Number</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={data.emergency_contact_phone}
                    onChange={(e) => setData('emergency_contact_phone', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    required
                  />
                  {errors.emergency_contact_phone && <p className="text-red-500 text-sm mt-1">{errors.emergency_contact_phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Experience & Skills */}
          {currentSection === 3 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-500" />
                Experience & Skills
              </h2>

              <div className="space-y-6">
                <div>
                  <Label>Languages Spoken</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                    {languages.map((language) => (
                      <div key={language} className="flex items-center">
                        <Checkbox
                          id={`language-${language}`}
                          checked={data.languages_spoken.includes(language)}
                          onCheckedChange={() => handleLanguageChange(language)}
                          className="mr-2"
                        />
                        <Label htmlFor={`language-${language}`} className="font-normal">
                          {language}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.languages_spoken && <p className="text-red-500 text-sm mt-1">{errors.languages_spoken}</p>}
                </div>

                <div>
                  <Label>Certifications (Check all that apply)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                    {certifications.map((certification) => (
                      <div key={certification} className="flex items-center">
                        <Checkbox
                          id={`certification-${certification}`}
                          checked={data.certifications.includes(certification)}
                          onCheckedChange={() => handleCertificationChange(certification)}
                          className="mr-2"
                        />
                        <Label htmlFor={`certification-${certification}`} className="font-normal">
                          {certification}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.certifications && <p className="text-red-500 text-sm mt-1">{errors.certifications}</p>}
                </div>

                <div>
                  <Label htmlFor="volunteer_experience">Experience</Label>
                  <Textarea
                    id="volunteer_experience"
                    value={data.volunteer_experience}
                    onChange={(e) => setData('volunteer_experience', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    rows={4}
                  />
                  {errors.volunteer_experience && <p className="text-red-500 text-sm mt-1">{errors.volunteer_experience}</p>}
                </div>

                <div>
                  <Label htmlFor="work_or_education_background">Work/Education Background</Label>
                  <Textarea
                    id="work_or_education_background"
                    value={data.work_or_education_background}
                    onChange={(e) => setData('work_or_education_background', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    rows={4}
                  />
                  {errors.work_or_education_background && <p className="text-red-500 text-sm mt-1">{errors.work_or_education_background}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Health & Background */}
          {currentSection === 4 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-blue-500" />
                Health & Background Information
              </h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions (if any)</Label>
                  <Textarea
                    id="medical_conditions"
                    value={data.medical_conditions}
                    onChange={(e) => setData('medical_conditions', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    rows={3}
                  />
                  {errors.medical_conditions && <p className="text-red-500 text-sm mt-1">{errors.medical_conditions}</p>}
                </div>

                <div>
                  <Label htmlFor="physical_limitations">Physical Limitations (if any)</Label>
                  <Textarea
                    id="physical_limitations"
                    value={data.physical_limitations}
                    onChange={(e) => setData('physical_limitations', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                    rows={3}
                  />
                  {errors.physical_limitations && <p className="text-red-500 text-sm mt-1">{errors.physical_limitations}</p>}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="consent_background_check"
                      checked={data.consent_background_check}
                      onCheckedChange={(checked) => setData('consent_background_check', Boolean(checked))}
                    />
                    <Label htmlFor="consent_background_check">
                      I consent to a background check
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="willing_background_check"
                      checked={data.willing_background_check}
                      onCheckedChange={(checked) => setData('willing_background_check', Boolean(checked))}
                    />
                    <Label htmlFor="willing_background_check">
                      I am willing to undergo a background check
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ever_convicted"
                      checked={data.ever_convicted}
                      onCheckedChange={(checked) => setData('ever_convicted', Boolean(checked))}
                    />
                    <Label htmlFor="ever_convicted">
                      Have you ever been convicted of a crime?
                    </Label>
                  </div>

                  {data.ever_convicted && (
                    <div>
                      <Label htmlFor="conviction_explanation">Please explain</Label>
                      <Textarea
                        id="conviction_explanation"
                        value={data.conviction_explanation}
                        onChange={(e) => setData('conviction_explanation', e.target.value)}
                        className="mt-1 bg-gray-50 dark:bg-gray-950"
                        rows={3}
                      />
                      {errors.conviction_explanation && <p className="text-red-500 text-sm mt-1">{errors.conviction_explanation}</p>}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="drivers_license_number">Driver's License Number (if applicable)</Label>
                    <Input
                      id="drivers_license_number"
                      value={data.drivers_license_number}
                      onChange={(e) => setData('drivers_license_number', e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-950"
                    />
                    {errors.drivers_license_number && <p className="text-red-500 text-sm mt-1">{errors.drivers_license_number}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: References & Final Details */}
          {currentSection === 5 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <BookUser className="h-6 w-6 text-blue-500" />
                References & Final Details
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="reference_name">Reference Name</Label>
                    <Input
                      id="reference_name"
                      value={data.reference_name}
                      onChange={(e) => setData('reference_name', e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-950"
                    />
                    {errors.reference_name && <p className="text-red-500 text-sm mt-1">{errors.reference_name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="reference_relationship">Relationship</Label>
                    <Input
                      id="reference_relationship"
                      value={data.reference_relationship}
                      onChange={(e) => setData('reference_relationship', e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-950"
                    />
                    {errors.reference_relationship && <p className="text-red-500 text-sm mt-1">{errors.reference_relationship}</p>}
                  </div>

                  <div>
                    <Label htmlFor="reference_contact">Contact Info</Label>
                    <Input
                      id="reference_contact"
                      value={data.reference_contact}
                      onChange={(e) => setData('reference_contact', e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-gray-950"
                    />
                    {errors.reference_contact && <p className="text-red-500 text-sm mt-1">{errors.reference_contact}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tshirt_size">T-Shirt Size (if applicable)</Label>
                    <select
                      id="tshirt_size"
                      value={data.tshirt_size}
                      onChange={(e) => setData('tshirt_size', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-gray-50 dark:bg-gray-950 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                    >
                      <option value="">Select size</option>
                      {tshirtSizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    {errors.tshirt_size && <p className="text-red-500 text-sm mt-1">{errors.tshirt_size}</p>}
                  </div>

                  <div>
                    <Label htmlFor="heard_about_us">How did you hear about us?</Label>
                    <select
                      id="heard_about_us"
                      value={data.heard_about_us}
                      onChange={(e) => setData('heard_about_us', e.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-gray-50 dark:bg-gray-950 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                    >
                      <option value="">Select an option</option>
                      {hearAboutUsOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.heard_about_us && <p className="text-red-500 text-sm mt-1">{errors.heard_about_us}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="social_media_handle">Social Media Handle (optional)</Label>
                  <Input
                    id="social_media_handle"
                    value={data.social_media_handle}
                    onChange={(e) => setData('social_media_handle', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-950"
                  />
                  {errors.social_media_handle && <p className="text-red-500 text-sm mt-1">{errors.social_media_handle}</p>}
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreed_to_terms"
                      checked={data.agreed_to_terms}
                      onCheckedChange={(checked) => setData('agreed_to_terms', Boolean(checked))}
                      required
                    />
                    <Label htmlFor="agreed_to_terms">
                      I certify that the information provided is accurate and complete
                    </Label>
                  </div>
                  {errors.agreed_to_terms && <p className="text-red-500 text-sm mt-1">{errors.agreed_to_terms}</p>}

                  <div className="mt-4">
                <Label htmlFor="digital_signature">Digital Signature</Label>
                <p className="text-sm text-muted-foreground mb-2">
                    Please sign in the box below
                </p>
                <SignaturePad
                    value={data.digital_signature}
                    onChange={(signature) => setData('digital_signature', signature)}
                    className="mt-1"
                />
                {errors.digital_signature && (
                    <p className="text-red-500 text-sm mt-1">{errors.digital_signature}</p>
                )}
                </div>


                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {currentSection > 1 ? (
              <Button type="button" variant="outline" onClick={prevSection}>
                Previous
              </Button>
            ) : (
              <div></div>
            )}

            {currentSection < totalSections ? (
              <Button type="button" onClick={nextSection}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={processing}>
                {processing ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </FrontendLayout>
  );
}
