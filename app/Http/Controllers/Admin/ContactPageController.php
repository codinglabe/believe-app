<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\ContactPageContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ContactPageController extends BaseController
{
    /**
     * Display the contact page content management.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        // Get all sections
        $sections = [
            'hero' => ContactPageContent::bySection('hero')->ordered()->first(),
            'contact_methods' => ContactPageContent::bySection('contact_methods')->ordered()->get(),
            'faq' => ContactPageContent::bySection('faq')->ordered()->get(),
            'office_hours' => ContactPageContent::bySection('office_hours')->ordered()->first(),
            'office_location' => ContactPageContent::bySection('office_location')->ordered()->first(),
            'cta' => ContactPageContent::bySection('cta')->ordered()->first(),
        ];

        return Inertia::render('admin/ContactPage/Index', [
            'sections' => $sections,
        ]);
    }

    /**
     * Show the form for editing a specific section.
     */
    public function edit(Request $request, string $section)
    {
        $this->authorizeRole($request, 'admin');

        $validSections = ['hero', 'contact_methods', 'faq', 'office_hours', 'office_location', 'cta'];
        
        if (!in_array($section, $validSections)) {
            return redirect()->route('admin.contact-page.index')
                ->with('error', 'Invalid section.');
        }

        $content = null;
        if (in_array($section, ['hero', 'office_hours', 'office_location', 'cta'])) {
            $content = ContactPageContent::bySection($section)->ordered()->first();
        } else {
            $content = ContactPageContent::bySection($section)->ordered()->get();
        }

        return Inertia::render('admin/ContactPage/Edit', [
            'section' => $section,
            'content' => $content,
        ]);
    }

    /**
     * Update the contact page content.
     */
    public function update(Request $request, string $section)
    {
        $this->authorizeRole($request, 'admin');

        $validSections = ['hero', 'contact_methods', 'faq', 'office_hours', 'office_location', 'cta'];
        
        if (!in_array($section, $validSections)) {
            return redirect()->route('admin.contact-page.index')
                ->with('error', 'Invalid section.');
        }

        try {
            if (in_array($section, ['hero', 'office_hours', 'office_location', 'cta'])) {
                // Single content item
                $validated = $request->validate([
                    'content' => 'required|array',
                ]);

                $content = ContactPageContent::bySection($section)->first();
                
                if ($content) {
                    $content->update([
                        'content' => $validated['content'],
                        'is_active' => $request->input('is_active', true),
                    ]);
                } else {
                    ContactPageContent::create([
                        'section' => $section,
                        'content' => $validated['content'],
                        'is_active' => $request->input('is_active', true),
                        'sort_order' => 0,
                    ]);
                }
            } else {
                // Multiple content items (contact_methods, faq)
                $validated = $request->validate([
                    'items' => 'required|array',
                    'items.*.content' => 'required|array',
                    'items.*.id' => 'nullable|exists:contact_page_contents,id',
                    'items.*.sort_order' => 'nullable|integer',
                    'items.*.is_active' => 'nullable|boolean',
                ]);

                // Update or create items
                foreach ($validated['items'] as $index => $item) {
                    if (isset($item['id']) && $item['id']) {
                        // Update existing
                        $content = ContactPageContent::find($item['id']);
                        if ($content) {
                            $content->update([
                                'content' => $item['content'],
                                'sort_order' => $item['sort_order'] ?? $index,
                                'is_active' => $item['is_active'] ?? true,
                            ]);
                        }
                    } else {
                        // Create new
                        ContactPageContent::create([
                            'section' => $section,
                            'content' => $item['content'],
                            'sort_order' => $item['sort_order'] ?? $index,
                            'is_active' => $item['is_active'] ?? true,
                        ]);
                    }
                }
            }

            return redirect()->route('admin.contact-page.index')
                ->with('success', ucfirst($section) . ' section updated successfully.');
        } catch (\Exception $e) {
            Log::error('Contact page update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update content: ' . $e->getMessage());
        }
    }

    /**
     * Delete a content item.
     */
    public function destroy(Request $request, ContactPageContent $contactPageContent)
    {
        $this->authorizeRole($request, 'admin');

        try {
            $contactPageContent->delete();

            return redirect()->route('admin.contact-page.index')
                ->with('success', 'Content item deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Contact page delete error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete content: ' . $e->getMessage());
        }
    }
}

