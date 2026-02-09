import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Users, FileText, Bell, Shield, Palette,
  Plus, Eye, Trash2, CheckCircle2, XCircle, AlertTriangle, HelpCircle
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Style Guide', href: '/admin/style-guide', icon: <Palette className="h-4 w-4" /> },
];

/* ── helpers ── */

const ColorSwatch = ({ name, cssVar, value }: { name: string; cssVar: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-12 h-12 rounded-md border shadow-sm shrink-0"
      style={{ backgroundColor: `hsl(${value})` }}
    />
    <div>
      <p className="text-sm font-medium">{name}</p>
      <p className="text-xs text-muted-foreground font-mono">{cssVar}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  </div>
);

const SectionHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold">{title}</h2>
    <p className="text-muted-foreground text-sm">{description}</p>
    <Separator className="mt-3" />
  </div>
);

/* ── page ── */

const StyleGuide = () => {
  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-12 max-w-5xl">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">UI Style Guide</h1>
          <p className="text-muted-foreground">
            Living reference for the DonorIQ design system. Review & confirm before applying platform-wide.
          </p>
        </div>

        {/* ─── Section 1: Color Palette ─── */}
        <section>
          <SectionHeader title="1. Color Palette" description="All CSS custom-property colors (HSL). Used via Tailwind semantic classes." />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Core</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch name="Background" cssVar="--background" value="0 0% 100%" />
              <ColorSwatch name="Foreground" cssVar="--foreground" value="222.2 84% 4.9%" />
              <ColorSwatch name="Primary" cssVar="--primary" value="222.2 47.4% 11.2%" />
              <ColorSwatch name="Primary Foreground" cssVar="--primary-foreground" value="210 40% 98%" />
              <ColorSwatch name="Secondary" cssVar="--secondary" value="210 40% 96.1%" />
              <ColorSwatch name="Secondary Foreground" cssVar="--secondary-foreground" value="222.2 47.4% 11.2%" />
              <ColorSwatch name="Muted" cssVar="--muted" value="210 40% 96.1%" />
              <ColorSwatch name="Muted Foreground" cssVar="--muted-foreground" value="215.4 16.3% 46.9%" />
              <ColorSwatch name="Accent" cssVar="--accent" value="210 40% 96.1%" />
              <ColorSwatch name="Accent Foreground" cssVar="--accent-foreground" value="222.2 47.4% 11.2%" />
              <ColorSwatch name="Destructive" cssVar="--destructive" value="0 84.2% 60.2%" />
              <ColorSwatch name="Destructive Foreground" cssVar="--destructive-foreground" value="210 40% 98%" />
              <ColorSwatch name="Border" cssVar="--border" value="214.3 31.8% 91.4%" />
              <ColorSwatch name="Input" cssVar="--input" value="214.3 31.8% 91.4%" />
              <ColorSwatch name="Ring" cssVar="--ring" value="222.2 84% 4.9%" />
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pt-4">Status Colors (Badges)</h3>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-muted text-muted-foreground">Draft</Badge>
              <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>
              <Badge className="bg-green-100 text-green-800">Approved</Badge>
              <Badge className="bg-red-100 text-red-800">Rejected</Badge>
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pt-4">AI Screening Colors</h3>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" /> Accept</span>
              <span className="inline-flex items-center gap-1.5 text-sm"><XCircle className="h-4 w-4 text-red-600" /> Reject</span>
              <span className="inline-flex items-center gap-1.5 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Review</span>
              <span className="inline-flex items-center gap-1.5 text-sm"><HelpCircle className="h-4 w-4 text-muted-foreground" /> Not Screened</span>
            </div>
          </div>
        </section>

        {/* ─── Section 2: Typography ─── */}
        <section>
          <SectionHeader title="2. Typography" description="Font hierarchy and text styles used across the platform." />

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-mono mb-2">Font Family: System default (ui-sans-serif, system-ui, sans-serif)</p>

            <div className="space-y-3 border rounded-lg p-6">
              <h1 className="text-2xl font-bold">Page Title — text-2xl font-bold</h1>
              <p className="text-muted-foreground">Page subtitle — text-muted-foreground</p>
              <h3 className="text-2xl font-semibold">Card Title — text-2xl font-semibold</h3>
              <h3 className="text-xl font-bold">Section Title — text-xl font-bold</h3>
              <h4 className="text-lg font-semibold">Sub-section — text-lg font-semibold</h4>
              <p className="text-sm">Body text — text-sm (default table / form text)</p>
              <p className="text-xs text-muted-foreground">Small text — text-xs text-muted-foreground</p>
              <p className="font-mono text-sm">Mono text — font-mono text-sm (donor codes: DQ-2025-0042)</p>
            </div>
          </div>
        </section>

        {/* ─── Section 3: Buttons ─── */}
        <section>
          <SectionHeader title="3. Buttons" description="All button variants and sizes." />

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg">Large</Button>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Disabled</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Default Disabled</Button>
                <Button variant="outline" disabled>Outline Disabled</Button>
                <Button variant="destructive" disabled>Destructive Disabled</Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 4: Form Elements ─── */}
        <section>
          <SectionHeader title="4. Form Elements" description="Input, Label, Select, Checkbox, Switch, Textarea." />

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Text Input</Label>
                  <Input id="demo-input" placeholder="Enter value…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-input-disabled">Disabled Input</Label>
                  <Input id="demo-input-disabled" placeholder="Cannot edit" disabled />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose option…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Option A</SelectItem>
                      <SelectItem value="b">Option B</SelectItem>
                      <SelectItem value="c">Option C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-textarea">Textarea</Label>
                  <Textarea id="demo-textarea" placeholder="Write notes…" />
                </div>
              </div>

              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-2">
                  <Checkbox id="demo-checkbox" />
                  <Label htmlFor="demo-checkbox">Checkbox</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="demo-switch" />
                  <Label htmlFor="demo-switch">Switch</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-error" className="text-destructive">Input with Error</Label>
                <Input id="demo-error" className="border-destructive" defaultValue="Invalid value" />
                <p className="text-sm text-destructive">This field is required.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── Section 5: Cards ─── */}
        <section>
          <SectionHeader title="5. Cards" description="Standard card patterns and stat cards." />

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Card</CardTitle>
                <CardDescription>Card with header, description, content, and footer.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">This is the card body content area. Used for forms, tables, and detail views.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" className="ml-auto">Save</Button>
              </CardFooter>
            </Card>

            <h3 className="text-sm font-semibold">Stat Cards (Dashboard)</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Partners</CardDescription>
                  <CardTitle className="text-3xl">12</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Review</CardDescription>
                  <CardTitle className="text-3xl text-yellow-600">5</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Approved This Month</CardDescription>
                  <CardTitle className="text-3xl text-green-600">28</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Rejected This Month</CardDescription>
                  <CardTitle className="text-3xl text-red-600">3</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Section 6: Badges & Status ─── */}
        <section>
          <SectionHeader title="6. Badges & Status Indicators" description="Badge variants and status-specific styling." />

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Badge Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Donor Status Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-muted text-muted-foreground">Draft</Badge>
                <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>
                <Badge className="bg-green-100 text-green-800">Approved</Badge>
                <Badge className="bg-red-100 text-red-800">Rejected</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">AI Screening Badges</h3>
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept (95%)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  <XCircle className="h-3.5 w-3.5" /> Reject (100%)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Needs Review (90%)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <HelpCircle className="h-3.5 w-3.5" /> Not Screened
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section 7: Tables ─── */}
        <section>
          <SectionHeader title="7. Tables" description="Standard table layout with header, rows, and action buttons." />

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Screening</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono">DQ-2025-0042</TableCell>
                    <TableCell>Robert Williams</TableCell>
                    <TableCell>Memorial Hospital</TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-800">Submitted</Badge></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> <span className="text-xs">95%</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">DQ-2025-0043</TableCell>
                    <TableCell>Margaret Chen</TableCell>
                    <TableCell>City General</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-800">Approved</Badge></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> <span className="text-xs">98%</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">DQ-2025-0044</TableCell>
                    <TableCell>David Morrison</TableCell>
                    <TableCell>St. Luke's</TableCell>
                    <TableCell><Badge className="bg-red-100 text-red-800">Rejected</Badge></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-3.5 w-3.5" /> <span className="text-xs">100%</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* ─── Section 8: Spacing & Layout ─── */}
        <section>
          <SectionHeader title="8. Spacing & Layout" description="Border radius, spacing, and grid patterns." />

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Border Radius</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 bg-primary/10 border rounded-sm" />
                  <span className="text-xs text-muted-foreground">sm (2px)</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 bg-primary/10 border rounded-md" />
                  <span className="text-xs text-muted-foreground">md (6px)</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 bg-primary/10 border rounded-lg" />
                  <span className="text-xs text-muted-foreground">lg (8px) — default</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 bg-primary/10 border rounded-full" />
                  <span className="text-xs text-muted-foreground">full (badges)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Common Spacing</h3>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">space-y-6</code> — between page sections</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">gap-4</code> — between grid items (cards, stat cards)</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">p-6</code> — card internal padding</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">space-y-1.5</code> — card header internal spacing</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">px-4 lg:px-6</code> — main content horizontal padding</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Grid Layouts</h3>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">grid md:grid-cols-4</code> — stat cards row</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">grid md:grid-cols-2</code> — form field pairs</p>
                <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">grid grid-cols-2 md:grid-cols-4</code> — color swatches</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default StyleGuide;
