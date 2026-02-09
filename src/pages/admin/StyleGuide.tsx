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
import { Plus, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const ColorSwatch = ({ name, cssVar, value }: { name: string; cssVar: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-10 h-10 rounded-md border shrink-0"
      style={{ backgroundColor: `hsl(${value})` }}
    />
    <div>
      <p className="text-[13px] font-medium">{name}</p>
      <p className="text-[11px] text-muted-foreground font-mono">{cssVar}</p>
    </div>
  </div>
);

const SectionHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-5">
    <h2 className="text-sm font-semibold">{title}</h2>
    <p className="text-muted-foreground text-[13px]">{description}</p>
    <Separator className="mt-3" />
  </div>
);

const StyleGuide = () => {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="space-y-10 max-w-5xl mx-auto">
        <div>
          <h1 className="text-lg font-semibold">Atlas — Style Guide</h1>
          <p className="text-[13px] text-muted-foreground">Living reference for the design system.</p>
        </div>

        {/* ─── Colors ─── */}
        <section>
          <SectionHeader title="Color Palette" description="CSS custom-property colors (HSL). Used via Tailwind semantic classes." />
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Core</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch name="Background" cssVar="--background" value="0 0% 100%" />
              <ColorSwatch name="Foreground" cssVar="--foreground" value="220 9% 16%" />
              <ColorSwatch name="Primary" cssVar="--primary" value="220 70% 50%" />
              <ColorSwatch name="Primary FG" cssVar="--primary-foreground" value="0 0% 100%" />
              <ColorSwatch name="Muted" cssVar="--muted" value="220 9% 97%" />
              <ColorSwatch name="Muted FG" cssVar="--muted-foreground" value="220 9% 55%" />
              <ColorSwatch name="Border" cssVar="--border" value="220 9% 91%" />
              <ColorSwatch name="Destructive" cssVar="--destructive" value="0 72% 51%" />
            </div>

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 pt-3">Status Badges</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">Draft</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">Submitted</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">Under Review</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">Approved</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-500 border border-red-100">Rejected</span>
            </div>

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 pt-3">AI Screening</p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-3 w-3" /> Accept
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100">
                <XCircle className="h-3 w-3" /> Reject
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                <AlertTriangle className="h-3 w-3" /> Review
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                <HelpCircle className="h-3 w-3" /> Not Screened
              </span>
            </div>
          </div>
        </section>

        {/* ─── Typography ─── */}
        <section>
          <SectionHeader title="Typography" description="Font hierarchy and text styles." />
          <div className="space-y-3 border rounded-lg p-6">
            <p className="text-[11px] text-muted-foreground font-mono mb-3">Font: Inter (Google Fonts)</p>
            <h1 className="text-lg font-semibold">Page context title — text-lg font-semibold</h1>
            <h3 className="text-sm font-semibold">Section header — text-sm font-semibold</h3>
            <p className="text-[13px]">Body text — text-[13px] (tables, forms)</p>
            <p className="text-[13px] text-muted-foreground">Secondary text — text-[13px] text-muted-foreground</p>
            <p className="text-xs text-muted-foreground">Small text — text-xs</p>
            <p className="font-mono text-[13px]">Mono — font-mono text-[13px] (DQ-2025-0042)</p>
          </div>
        </section>

        {/* ─── Buttons ─── */}
        <section>
          <SectionHeader title="Buttons" description="All button variants and sizes." />
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">Variants</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="default" size="sm">Default</Button>
                <Button variant="destructive" size="sm">Destructive</Button>
                <Button variant="outline" size="sm">Outline</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="ghost" size="sm">Ghost</Button>
                <Button variant="link" size="sm">Link</Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="lg">Large</Button>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Form Elements ─── */}
        <section>
          <SectionHeader title="Form Elements" description="Input, Select, Checkbox, Switch, Textarea." />
          <div className="border rounded-lg p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="demo-input" className="text-[13px]">Text Input</Label>
                <Input id="demo-input" placeholder="Enter value…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Select</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose option…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Option A</SelectItem>
                    <SelectItem value="b">Option B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-textarea" className="text-[13px]">Textarea</Label>
              <Textarea id="demo-textarea" placeholder="Write notes…" />
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="demo-checkbox" />
                <Label htmlFor="demo-checkbox" className="text-[13px]">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="demo-switch" />
                <Label htmlFor="demo-switch" className="text-[13px]">Switch</Label>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Cards ─── */}
        <section>
          <SectionHeader title="Cards" description="Standard card (no shadows, border only)." />
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Card Title</CardTitle>
                <CardDescription className="text-[13px]">Description text for context.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[13px]">Card body content area.</p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button size="sm" className="ml-auto">Save</Button>
              </CardFooter>
            </Card>

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Stat Cards</p>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Active Partners', value: '12' },
                { label: 'Pending Review', value: '5', color: 'text-amber-600' },
                { label: 'Approved', value: '28', color: 'text-emerald-600' },
                { label: 'Rejected', value: '3', color: 'text-red-500' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[12px]">{stat.label}</CardDescription>
                    <CardTitle className={`text-2xl ${stat.color || ''}`}>{stat.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Tables ─── */}
        <section>
          <SectionHeader title="Tables" description="Compact headers, generous row padding, clickable rows." />
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { code: 'DQ-2025-0042', name: 'Robert Williams', partner: 'Memorial Hospital', status: 'Submitted', style: 'bg-blue-50 text-blue-600 border border-blue-100' },
                  { code: 'DQ-2025-0043', name: 'Margaret Chen', partner: 'City General', status: 'Approved', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
                  { code: 'DQ-2025-0044', name: 'James Wilson', partner: 'Regional Med', status: 'Under Review', style: 'bg-amber-50 text-amber-600 border border-amber-100' },
                ].map((row) => (
                  <TableRow key={row.code} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-mono text-[13px] py-3.5">{row.code}</TableCell>
                    <TableCell className="text-[13px] py-3.5">{row.name}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground py-3.5">{row.partner}</TableCell>
                    <TableCell className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${row.style}`}>
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ─── Spacing ─── */}
        <section>
          <SectionHeader title="Spacing & Layout" description="Border radius, spacing constants, grid patterns." />
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'sm', className: 'rounded-sm' },
                { label: 'md', className: 'rounded-md' },
                { label: 'lg', className: 'rounded-lg' },
              ].map((r) => (
                <div key={r.label} className={`w-16 h-16 border-2 border-border ${r.className} flex items-center justify-center text-xs text-muted-foreground`}>
                  {r.label}
                </div>
              ))}
            </div>
            <div className="text-[13px] text-muted-foreground space-y-1">
              <p>Content padding: <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">p-6 lg:p-8</code></p>
              <p>Section spacing: <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">space-y-5</code></p>
              <p>Grid columns: <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">md:grid-cols-4</code></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StyleGuide;
